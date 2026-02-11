"""Chat-related Pydantic schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Request schema for creating a message."""

    content: str = Field(..., min_length=1, max_length=100000)
    role: Literal["user", "assistant", "system"] = "user"


class MessageResponse(BaseModel):
    """Response schema for a message."""

    id: str
    conversation_id: str
    role: str
    content: str
    tokens: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    """Request schema for creating a conversation."""

    title: str | None = Field(None, max_length=255)
    model: str | None = Field(None, max_length=100)


class ConversationUpdate(BaseModel):
    """Request schema for updating a conversation."""

    title: str | None = Field(None, max_length=255)


class ConversationResponse(BaseModel):
    """Response schema for a conversation."""

    id: str
    user_id: str
    title: str | None
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: int | None = None

    class Config:
        from_attributes = True


class ConversationWithMessagesResponse(ConversationResponse):
    """Response schema for a conversation with messages."""

    messages: list[MessageResponse]


class ChatCompletionRequest(BaseModel):
    """Request schema for chat completion with conversation persistence."""

    content: str = Field(..., min_length=1, max_length=100000)
    model: str | None = Field(None, max_length=100)
    temperature: float | None = Field(None, ge=0.0, le=1.0)


class ChatCompletionResponse(BaseModel):
    """Response schema for chat completion."""

    message: MessageResponse
    conversation_id: str
    model: str

    class Config:
        from_attributes = True
