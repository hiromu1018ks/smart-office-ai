"""Tests for chat API endpoints (TDD - GREEN phase)."""

from datetime import timedelta
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import status
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.chat import Conversation, Message
from app.models.user import User


# Test constants
CONVERSATIONS_URL = "/api/v1/chat/conversations"


@pytest.fixture
def test_database_url():
    """Get test database URL."""
    import os
    from app.core.config import settings

    return os.getenv(
        "TEST_DATABASE_URL",
        settings.DATABASE_URL.rsplit("/", 1)[0] + "/smart_office_ai_test",
    )


@pytest_asyncio.fixture
async def test_engine(test_database_url):
    """Create test database engine."""
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(
        test_database_url,
        echo=False,
        pool_pre_ping=True,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def clean_tables(test_engine):
    """Drop and recreate all tables."""
    from app.core.database import Base

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def test_db_session(test_engine, clean_tables):
    """Create test database session with clean tables."""
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(test_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override."""
    from app.main import app
    from app.core.database import get_db

    # Override database dependency
    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(client: AsyncClient, test_db_session: AsyncSession) -> dict:
    """Create a test user and return user data with token."""
    # Create user directly in database
    user = User(
        email="chatuser@example.com",
        username="chatuser",
        hashed_password=get_password_hash("SecurePass123"),
        is_active=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)

    # Create token
    token = create_access_token(
        {"sub": user.id, "email": user.email},
        timedelta(minutes=30),
    )

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "token": token,
    }


@pytest_asyncio.fixture
async def test_conversation(test_user: dict, test_db_session: AsyncSession) -> dict:
    """Create a test conversation."""
    conversation = Conversation(
        user_id=test_user["id"],
        title="Test Conversation",
        model="gemma3:12b",
    )
    test_db_session.add(conversation)
    await test_db_session.commit()
    await test_db_session.refresh(conversation)

    return {
        "id": conversation.id,
        "user_id": conversation.user_id,
        "title": conversation.title,
        "model": conversation.model,
    }


class TestListConversations:
    """Test GET /api/v1/chat/conversations endpoint."""

    @pytest.mark.asyncio
    async def test_list_conversations_success(
        self, client: AsyncClient, test_user: dict
    ):
        """Test listing conversations for authenticated user."""
        response = await client.get(
            CONVERSATIONS_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_list_conversations_unauthorized(self, client: AsyncClient):
        """Test listing conversations without authentication."""
        response = await client.get(CONVERSATIONS_URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_list_conversations_with_data(
        self, client: AsyncClient, test_user: dict, test_db_session: AsyncSession
    ):
        """Test listing conversations returns created conversations."""
        # Create conversations
        for i in range(3):
            conv = Conversation(
                user_id=test_user["id"],
                title=f"Conversation {i}",
                model="gemma3:12b",
            )
            test_db_session.add(conv)
        await test_db_session.commit()

        response = await client.get(
            CONVERSATIONS_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3
        assert all(c["user_id"] == test_user["id"] for c in data)

    @pytest.mark.asyncio
    async def test_list_conversations_pagination(
        self, client: AsyncClient, test_user: dict, test_db_session: AsyncSession
    ):
        """Test conversation list pagination."""
        # Create 5 conversations
        for i in range(5):
            conv = Conversation(
                user_id=test_user["id"],
                title=f"Conversation {i}",
                model="gemma3:12b",
            )
            test_db_session.add(conv)
        await test_db_session.commit()

        response = await client.get(
            f"{CONVERSATIONS_URL}?skip=0&limit=2",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2


class TestCreateConversation:
    """Test POST /api/v1/chat/conversations endpoint."""

    @pytest.mark.asyncio
    async def test_create_conversation_success(
        self, client: AsyncClient, test_user: dict
    ):
        """Test creating a new conversation."""
        response = await client.post(
            CONVERSATIONS_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"title": "New Conversation", "model": "gemma3:12b"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "New Conversation"
        assert data["model"] == "gemma3:12b"
        assert data["user_id"] == test_user["id"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert data["message_count"] == 0

    @pytest.mark.asyncio
    async def test_create_conversation_unauthorized(self, client: AsyncClient):
        """Test creating conversation without authentication."""
        response = await client.post(
            CONVERSATIONS_URL,
            json={"title": "New Conversation"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_create_conversation_defaults(
        self, client: AsyncClient, test_user: dict
    ):
        """Test creating conversation with default values."""
        response = await client.post(
            CONVERSATIONS_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] is None
        assert data["model"] is not None  # Should use default model


class TestGetConversation:
    """Test GET /api/v1/chat/conversations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_conversation_success(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test getting a specific conversation."""
        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_conversation["id"]
        assert data["title"] == test_conversation["title"]
        assert data["model"] == test_conversation["model"]
        assert "messages" in data

    @pytest.mark.asyncio
    async def test_get_conversation_not_found(
        self, client: AsyncClient, test_user: dict
    ):
        """Test getting non-existent conversation."""
        response = await client.get(
            f"{CONVERSATIONS_URL}/non-existent-id",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_conversation_unauthorized(
        self, client: AsyncClient, test_conversation: dict
    ):
        """Test getting conversation without authentication."""
        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_get_conversation_wrong_user(
        self,
        client: AsyncClient,
        test_conversation: dict,
        test_db_session: AsyncSession,
    ):
        """Test getting another user's conversation."""
        # Create another user
        other_user = User(
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("SecurePass123"),
            is_active=True,
        )
        test_db_session.add(other_user)
        await test_db_session.commit()
        await test_db_session.refresh(other_user)

        token = create_access_token(
            {"sub": other_user.id, "email": other_user.email},
            timedelta(minutes=30),
        )

        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateConversation:
    """Test PATCH /api/v1/chat/conversations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_conversation_success(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test updating a conversation title."""
        response = await client.patch(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}",
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"title": "Updated Title"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_conversation_not_found(
        self, client: AsyncClient, test_user: dict
    ):
        """Test updating non-existent conversation."""
        response = await client.patch(
            f"{CONVERSATIONS_URL}/non-existent-id",
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"title": "Updated Title"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDeleteConversation:
    """Test DELETE /api/v1/chat/conversations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_conversation_success(
        self, client: AsyncClient, test_user: dict, test_db_session: AsyncSession
    ):
        """Test deleting a conversation."""
        # Create a conversation to delete
        conv = Conversation(
            user_id=test_user["id"],
            title="To Delete",
        )
        test_db_session.add(conv)
        await test_db_session.commit()
        await test_db_session.refresh(conv)

        response = await client.delete(
            f"{CONVERSATIONS_URL}/{conv.id}",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.asyncio
    async def test_delete_conversation_not_found(
        self, client: AsyncClient, test_user: dict
    ):
        """Test deleting non-existent conversation."""
        response = await client.delete(
            f"{CONVERSATIONS_URL}/non-existent-id",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListMessages:
    """Test GET /api/v1/chat/conversations/{id}/messages endpoint."""

    @pytest.mark.asyncio
    async def test_list_messages_success(
        self,
        client: AsyncClient,
        test_user: dict,
        test_conversation: dict,
        test_db_session: AsyncSession,
    ):
        """Test listing messages in a conversation."""
        # Create messages
        for i in range(3):
            msg = Message(
                conversation_id=test_conversation["id"],
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i}",
            )
            test_db_session.add(msg)
        await test_db_session.commit()

        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3
        assert all("id" in m and "role" in m and "content" in m for m in data)

    @pytest.mark.asyncio
    async def test_list_messages_empty(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test listing messages in empty conversation."""
        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []

    @pytest.mark.asyncio
    async def test_list_messages_unauthorized(
        self, client: AsyncClient, test_conversation: dict
    ):
        """Test listing messages without authentication."""
        response = await client.get(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCreateMessage:
    """Test POST /api/v1/chat/conversations/{id}/messages endpoint."""

    @pytest.mark.asyncio
    async def test_create_message_success(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test sending a message and getting AI response."""
        # Mock the Ollama client
        mock_response = AsyncMock()
        mock_response.message.content = "AI response"
        mock_response.model = "gemma3:12b"
        mock_response.done = True

        with patch("app.api.v1.chat.OllamaClient.chat", return_value=mock_response):
            response = await client.post(
                f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
                headers={"Authorization": f"Bearer {test_user['token']}"},
                json={"content": "Hello, AI!"},
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["message"]["content"] == "AI response"
        assert data["message"]["role"] == "assistant"
        assert data["conversation_id"] == test_conversation["id"]
        assert data["model"] == "gemma3:12b"

    @pytest.mark.asyncio
    async def test_create_message_unauthorized(
        self, client: AsyncClient, test_conversation: dict
    ):
        """Test sending message without authentication."""
        response = await client.post(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
            json={"content": "Hello, AI!"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_create_message_conversation_not_found(
        self, client: AsyncClient, test_user: dict
    ):
        """Test sending message to non-existent conversation."""
        response = await client.post(
            f"{CONVERSATIONS_URL}/non-existent-id/messages",
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"content": "Hello, AI!"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_message_empty_content(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test sending message with empty content."""
        response = await client.post(
            f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"content": ""},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_message_ollama_error(
        self, client: AsyncClient, test_user: dict, test_conversation: dict
    ):
        """Test handling Ollama service error."""
        from app.services.ai.exceptions import OllamaConnectionError

        with patch(
            "app.api.v1.chat.OllamaClient.chat",
            side_effect=OllamaConnectionError("Failed to connect"),
        ):
            response = await client.post(
                f"{CONVERSATIONS_URL}/{test_conversation['id']}/messages",
                headers={"Authorization": f"Bearer {test_user['token']}"},
                json={"content": "Hello, AI!"},
            )

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    @pytest.mark.asyncio
    async def test_create_message_generates_title(
        self, client: AsyncClient, test_user: dict, test_db_session: AsyncSession
    ):
        """Test that first message generates conversation title."""
        # Create conversation without title
        conv = Conversation(
            user_id=test_user["id"],
            title=None,
        )
        test_db_session.add(conv)
        await test_db_session.commit()
        await test_db_session.refresh(conv)

        mock_response = AsyncMock()
        mock_response.message.content = "AI response"
        mock_response.model = "gemma3:12b"
        mock_response.done = True

        with patch("app.api.v1.chat.OllamaClient.chat", return_value=mock_response):
            response = await client.post(
                f"{CONVERSATIONS_URL}/{conv.id}/messages",
                headers={"Authorization": f"Bearer {test_user['token']}"},
                json={"content": "This is my first message to the AI assistant"},
            )

        assert response.status_code == status.HTTP_201_CREATED

        # Check that title was generated
        await test_db_session.refresh(conv)
        assert conv.title is not None
        assert (
            "first message" in conv.title.lower() or "this is my" in conv.title.lower()
        )
