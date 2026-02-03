"""Tests for AI API endpoints (TDD - GREEN phase).

This file tests all AI endpoints implementation.
Tests verify the endpoints work correctly with proper mocking.
"""

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi import status
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas.ai import ChatMessage
from app.services.ai.llm_service import OllamaClient


# Test constants
MODELS_URL = "/api/v1/ai/models"
CHAT_URL = "/api/v1/ai/chat"
CHAT_STREAM_URL = "/api/v1/ai/chat/stream"
HEALTH_URL = "/api/v1/ai/health"


class TestListModelsEndpoint:
    """Test GET /api/v1/ai/models endpoint."""

    @pytest.mark.asyncio
    async def test_list_models_success(self, client: AsyncClient):
        """Test successful model listing."""
        mock_models = [
            {"name": "gemma3:12b", "size": 7340032000},
            {"name": "llama3.2", "size": 2000000000},
        ]

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.list_models = AsyncMock(return_value=mock_models)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(MODELS_URL)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "gemma3:12b"
            assert data[0]["size"] == 7340032000
            assert data[1]["name"] == "llama3.2"

    @pytest.mark.asyncio
    async def test_list_models_empty(self, client: AsyncClient):
        """Test model listing when no models available."""
        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.list_models = AsyncMock(return_value=[])

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(MODELS_URL)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data == []

    @pytest.mark.asyncio
    async def test_list_models_connection_error(self, client: AsyncClient):
        """Test model listing with connection error."""
        from app.services.ai.exceptions import OllamaConnectionError

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.list_models = AsyncMock(side_effect=OllamaConnectionError("Connection failed"))

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(MODELS_URL)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert "ollama" in data["detail"].lower() or "connection" in data["detail"].lower()


class TestChatEndpoint:
    """Test POST /api/v1/ai/chat endpoint."""

    @pytest.mark.asyncio
    async def test_chat_success_default_model(self, client: AsyncClient):
        """Test successful chat with default model."""
        mock_response = {
            "message": ChatMessage(role="assistant", content="Hello! How can I help?"),
            "model": "gemma3:12b",
            "done": True,
        }

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [
                    {"role": "user", "content": "Hello"},
                ],
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["message"]["role"] == "assistant"
            assert data["message"]["content"] == "Hello! How can I help?"
            assert data["model"] == "gemma3:12b"
            assert data["done"] is True

    @pytest.mark.asyncio
    async def test_chat_with_custom_model(self, client: AsyncClient):
        """Test chat with custom model specified."""
        mock_response = {
            "message": ChatMessage(role="assistant", content="Response from llama"),
            "model": "llama3.2",
            "done": True,
        }

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [{"role": "user", "content": "Hello"}],
                "model": "llama3.2",
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["model"] == "llama3.2"

    @pytest.mark.asyncio
    async def test_chat_with_temperature(self, client: AsyncClient):
        """Test chat with temperature parameter."""
        mock_response = {
            "message": ChatMessage(role="assistant", content="Response"),
            "model": "gemma3:12b",
            "done": True,
        }

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [{"role": "user", "content": "Hello"}],
                "temperature": 0.7,
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_200_OK

            # Verify temperature was passed
            mock_ollama_client.chat.assert_called_once()
            call_kwargs = mock_ollama_client.chat.call_args[1]
            assert call_kwargs["temperature"] == 0.7

    @pytest.mark.asyncio
    async def test_chat_with_system_message(self, client: AsyncClient):
        """Test chat with system message."""
        mock_response = {
            "message": ChatMessage(role="assistant", content="Response"),
            "model": "gemma3:12b",
            "done": True,
        }

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Hello"},
                ],
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_200_OK

            # Verify both messages were passed
            mock_ollama_client.chat.assert_called_once()
            call_args = mock_ollama_client.chat.call_args
            # Check keyword arguments instead
            messages = call_args.kwargs.get("messages") or call_args[1].get("messages") if call_args[1:] else []
            assert len(messages) == 2
            assert messages[0].role == "system"
            assert messages[1].role == "user"

    @pytest.mark.asyncio
    async def test_chat_empty_messages(self, client: AsyncClient):
        """Test chat with empty messages list."""
        request_data = {
            "messages": [],
        }

        response = await client.post(CHAT_URL, json=request_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_chat_invalid_role(self, client: AsyncClient):
        """Test chat with invalid message role."""
        request_data = {
            "messages": [{"role": "admin", "content": "Hello"}],
        }

        response = await client.post(CHAT_URL, json=request_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_chat_invalid_temperature(self, client: AsyncClient):
        """Test chat with invalid temperature."""
        request_data = {
            "messages": [{"role": "user", "content": "Hello"}],
            "temperature": 2.0,  # Too high
        }

        response = await client.post(CHAT_URL, json=request_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_chat_model_not_found(self, client: AsyncClient):
        """Test chat with non-existent model."""
        from app.services.ai.exceptions import OllamaModelNotFoundError

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(side_effect=OllamaModelNotFoundError("unknown"))

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [{"role": "user", "content": "Hello"}],
                "model": "unknown",
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_404_NOT_FOUND
            data = response.json()
            assert "model" in data["detail"].lower() or "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_chat_connection_error(self, client: AsyncClient):
        """Test chat with connection error."""
        from app.services.ai.exceptions import OllamaConnectionError

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(side_effect=OllamaConnectionError("Connection failed"))

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [{"role": "user", "content": "Hello"}],
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    @pytest.mark.asyncio
    async def test_chat_timeout_error(self, client: AsyncClient):
        """Test chat with timeout."""
        from app.services.ai.exceptions import OllamaTimeoutError

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(side_effect=OllamaTimeoutError("Request timed out"))

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            request_data = {
                "messages": [{"role": "user", "content": "Hello"}],
            }

            response = await client.post(CHAT_URL, json=request_data)

            assert response.status_code == status.HTTP_504_GATEWAY_TIMEOUT


class TestChatStreamEndpoint:
    """Test POST /api/v1/ai/chat/stream endpoint."""

    @pytest.mark.asyncio
    async def test_chat_stream_success(self, client: AsyncClient):
        """Test successful streaming chat."""
        from app.schemas.ai import StreamChunk

        async def mock_stream(messages, model=None, temperature=None):
            yield StreamChunk(content="Hello", model="gemma3:12b", done=False)
            yield StreamChunk(content=" there", model="gemma3:12b", done=False)
            yield StreamChunk(content="!", model="gemma3:12b", done=True)

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat_stream = mock_stream

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            # Use SSE client to read streaming response
            response = await client.post(
                CHAT_STREAM_URL,
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                },
            )

            assert response.status_code == status.HTTP_200_OK
            assert "text/event-stream" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_chat_stream_with_model(self, client: AsyncClient):
        """Test streaming chat with custom model."""
        from app.schemas.ai import StreamChunk

        async def mock_stream(messages, model=None, temperature=None):
            yield StreamChunk(content="Hi", model=model or "gemma3:12b", done=True)

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat_stream = mock_stream

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.post(
                CHAT_STREAM_URL,
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "model": "llama3.2",
                },
            )

            assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_chat_stream_with_temperature(self, client: AsyncClient):
        """Test streaming chat with temperature."""
        from app.schemas.ai import StreamChunk

        async def mock_stream(messages, model=None, temperature=None):
            yield StreamChunk(content="Hi", model="gemma3:12b", done=True)

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat_stream = mock_stream

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.post(
                CHAT_STREAM_URL,
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "temperature": 0.5,
                },
            )

            assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_chat_stream_missing_messages(self, client: AsyncClient):
        """Test streaming chat without messages parameter."""
        response = await client.post(CHAT_STREAM_URL, json={})

        # Should return 422 for missing required parameter
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestHealthEndpoint:
    """Test GET /api/v1/ai/health endpoint."""

    @pytest.mark.asyncio
    async def test_health_healthy(self, client: AsyncClient):
        """Test health check when Ollama is reachable."""
        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.health_check = AsyncMock(return_value=True)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(HEALTH_URL)

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == "healthy"
            assert data["ollama_reachable"] is True

    @pytest.mark.asyncio
    async def test_health_unhealthy(self, client: AsyncClient):
        """Test health check when Ollama is unreachable."""
        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.health_check = AsyncMock(return_value=False)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(HEALTH_URL)

            # Health endpoint returns 200 with status info, not 503
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["ollama_reachable"] is False

    @pytest.mark.asyncio
    async def test_health_exception(self, client: AsyncClient):
        """Test health check when exception occurs."""
        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.health_check = AsyncMock(side_effect=Exception("Unexpected error"))

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(HEALTH_URL)

            # The health endpoint catches exceptions and returns 200 with unhealthy status
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["ollama_reachable"] is False


class TestOptionalAuthentication:
    """Test that AI endpoints work with optional authentication."""

    @pytest.mark.asyncio
    async def test_chat_without_auth(self, client: AsyncClient):
        """Test chat endpoint without authentication."""
        mock_response = {
            "message": ChatMessage(role="assistant", content="Response"),
            "model": "gemma3:12b",
            "done": True,
        }

        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.post(
                CHAT_URL,
                json={"messages": [{"role": "user", "content": "Hello"}]},
            )

            # Should work without auth (optional)
            assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_health_without_auth(self, client: AsyncClient):
        """Test health endpoint without authentication."""
        mock_ollama_client = MagicMock(spec=OllamaClient)
        mock_ollama_client.health_check = AsyncMock(return_value=True)

        with patch("app.api.v1.ai.OllamaClient", return_value=mock_ollama_client):
            response = await client.get(HEALTH_URL)

            # Health check should work without auth
            assert response.status_code == status.HTTP_200_OK


# Pytest fixtures
@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test client."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
