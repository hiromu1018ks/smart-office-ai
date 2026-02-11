"""Chat API endpoints v1."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.auth import get_current_user_dep
from app.core.config import settings
from app.core.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.ai import ChatMessage
from app.schemas.chat import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    ConversationWithMessagesResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.ai.exceptions import (
    OllamaConnectionError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)
from app.services.ai.llm_service import OllamaClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# Dependency to get Ollama client
async def get_ollama_client() -> OllamaClient:
    """Get Ollama client instance."""
    return OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        default_model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 20,
) -> list[ConversationResponse]:
    """
    List user's conversations.

    Returns paginated list of conversations with message counts.
    """
    # Query conversations with message count
    result = await db.execute(
        select(Conversation, func.count(Message.id).label("message_count"))
        .outerjoin(Message, Conversation.id == Message.conversation_id)
        .where(Conversation.user_id == current_user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )

    conversations = []
    for conv, msg_count in result.all():
        conv_dict = {
            "id": conv.id,
            "user_id": conv.user_id,
            "title": conv.title,
            "model": conv.model,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": msg_count,
        }
        conversations.append(ConversationResponse(**conv_dict))

    return conversations


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    data: ConversationCreate,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    """
    Create a new conversation.

    Creates an empty conversation that can be populated with messages.
    """
    conversation = Conversation(
        user_id=current_user.id,
        title=data.title,
        model=data.model or settings.OLLAMA_MODEL,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
    )


@router.get(
    "/conversations/{conversation_id}", response_model=ConversationWithMessagesResponse
)
async def get_conversation(
    conversation_id: str,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationWithMessagesResponse:
    """
    Get a conversation with all messages.

    Returns conversation details and all associated messages.
    """
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id, Conversation.user_id == current_user.id
        )
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    return ConversationWithMessagesResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=len(conversation.messages),
        messages=[
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                tokens=msg.tokens,
                created_at=msg.created_at,
            )
            for msg in conversation.messages
        ],
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    """
    Update a conversation.

    Currently only supports updating the title.
    """
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    if data.title is not None:
        conversation.title = data.title
        await db.commit()
        await db.refresh(conversation)

    # Get message count
    msg_count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
    )
    message_count = msg_count_result.scalar()

    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=message_count,
    )


@router.delete(
    "/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_conversation(
    conversation_id: str,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Delete a conversation and all its messages.
    """
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    await db.delete(conversation)
    await db.commit()


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatCompletionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    conversation_id: str,
    data: ChatCompletionRequest,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
    client: Annotated[OllamaClient, Depends(get_ollama_client)],
) -> ChatCompletionResponse:
    """
    Send a message and get AI response.

    Saves the user message, sends to AI, saves the AI response.
    """
    # Get conversation
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id, Conversation.user_id == current_user.id
        )
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content,
    )
    db.add(user_message)
    await db.flush()  # Get ID without committing

    # Build message history for AI
    chat_messages = []
    for msg in conversation.messages:
        chat_messages.append(ChatMessage(role=msg.role, content=msg.content))
    # Add current user message
    chat_messages.append(ChatMessage(role="user", content=data.content))

    # Call AI
    try:
        ai_response = await client.chat(
            messages=chat_messages,
            model=data.model or conversation.model,
            temperature=data.temperature,
        )
    except OllamaModelNotFoundError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except OllamaTimeoutError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=exc.message,
        ) from exc
    except OllamaConnectionError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama: {exc.message}",
        ) from exc

    # Save AI response
    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response.message.content,
    )
    db.add(assistant_message)

    # Update conversation title if it's the first message and no title set
    if conversation.title is None and len(conversation.messages) <= 2:
        # Generate a simple title from the first user message
        title = data.content[:50] + "..." if len(data.content) > 50 else data.content
        conversation.title = title

    await db.commit()
    await db.refresh(assistant_message)

    return ChatCompletionResponse(
        message=MessageResponse(
            id=assistant_message.id,
            conversation_id=assistant_message.conversation_id,
            role=assistant_message.role,
            content=assistant_message.content,
            tokens=assistant_message.tokens,
            created_at=assistant_message.created_at,
        ),
        conversation_id=conversation_id,
        model=ai_response.model,
    )


@router.get(
    "/conversations/{conversation_id}/messages", response_model=list[MessageResponse]
)
async def list_messages(
    conversation_id: str,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> list[MessageResponse]:
    """
    List messages in a conversation.

    Returns paginated list of messages ordered by creation time.
    """
    # Verify conversation belongs to user
    conv_result = await db.execute(
        select(Conversation.id).where(
            Conversation.id == conversation_id, Conversation.user_id == current_user.id
        )
    )
    if conv_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # Get messages
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()

    return [
        MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            tokens=msg.tokens,
            created_at=msg.created_at,
        )
        for msg in messages
    ]
