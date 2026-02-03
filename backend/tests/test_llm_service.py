"""Tests for LLM Service (TDD - RED phase).

This file tests the OllamaClient service before implementation.
Tests should fail initially (RED), then pass after implementation (GREEN).
"""

from unittest.mock import AsyncMock, MagicMock, patch
from typing import AsyncGenerator

import pytest
import pytest_asyncio

from app.services.ai.llm_service import OllamaClient
from app.services.ai.exceptions import (
    OllamaConnectionError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)
from app.schemas.ai import ChatMessage, ModelInfo


class TestOllamaClientInit:
    """Test OllamaClient initialization."""

    def test_client_init_with_defaults(self):
        """Test client initialization with default parameters."""
        client = OllamaClient(
            base_url="http://localhost:11434",
            default_model="gemma3:12b",
            timeout=120,
        )
        assert client.default_model == "gemma3:12b"
        assert client.timeout == 120

    def test_client_init_with_custom_values(self):
        """Test client initialization with custom parameters."""
        client = OllamaClient(
            base_url="http://custom:11434",
            default_model="llama3.2",
            timeout=60,
        )
        assert client.default_model == "llama3.2"
        assert client.timeout == 60


class TestOllamaClientHealthCheck:
    """Test OllamaClient.health_check method."""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        mock_client = AsyncMock()
        mock_client.list = AsyncMock(return_value={"models": []})

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )
            result = await client.health_check()

            assert result is True
            mock_client.list.assert_called_once()

    @pytest.mark.asyncio
    async def test_health_check_connection_error(self):
        """Test health check with connection error."""
        mock_client = AsyncMock()
        mock_client.list = AsyncMock(side_effect=Exception("Connection refused"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )
            result = await client.health_check()

            assert result is False

    @pytest.mark.asyncio
    async def test_health_check_timeout(self):
        """Test health check with timeout."""
        import asyncio

        mock_client = AsyncMock()

        async def timeout_func(*args, **kwargs):
            await asyncio.sleep(5)
            return {"models": []}

        mock_client.list = AsyncMock(side_effect=timeout_func)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=1,  # Very short timeout
            )
            result = await client.health_check()

            assert result is False


class TestOllamaClientListModels:
    """Test OllamaClient.list_models method."""

    @pytest.mark.asyncio
    async def test_list_models_success(self):
        """Test successful model listing."""
        mock_response = {
            "models": [
                {"name": "gemma3:12b", "size": 7340032000},
                {"name": "llama3.2", "size": 2000000000},
                {"name": "qwen2.5", "size": 4600000000},
            ]
        }

        mock_client = AsyncMock()
        mock_client.list = AsyncMock(return_value=mock_response)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )
            models = await client.list_models()

            assert len(models) == 3
            assert models[0].name == "gemma3:12b"
            assert models[0].size == 7340032000
            assert models[1].name == "llama3.2"
            assert models[2].name == "qwen2.5"

    @pytest.mark.asyncio
    async def test_list_models_empty(self):
        """Test listing models when none available."""
        mock_client = AsyncMock()
        mock_client.list = AsyncMock(return_value={"models": []})

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )
            models = await client.list_models()

            assert models == []

    @pytest.mark.asyncio
    async def test_list_models_connection_error(self):
        """Test list_models with connection error."""
        mock_client = AsyncMock()
        mock_client.list = AsyncMock(side_effect=Exception("Connection refused"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            with pytest.raises(OllamaConnectionError) as exc_info:
                await client.list_models()
            assert "connection" in str(exc_info.value).lower() or "failed" in str(exc_info.value).lower()


class TestOllamaClientChat:
    """Test OllamaClient.chat method (blocking)."""

    @pytest.mark.asyncio
    async def test_chat_success_with_default_model(self):
        """Test successful chat with default model."""
        mock_response = {
            "message": {
                "role": "assistant",
                "content": "Hello! How can I help you?",
            },
            "model": "gemma3:12b",
            "done": True,
        }

        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [
                ChatMessage(role="system", content="You are helpful."),
                ChatMessage(role="user", content="Hello"),
            ]

            response = await client.chat(messages)

            assert response.message.role == "assistant"
            assert response.message.content == "Hello! How can I help you?"
            assert response.model == "gemma3:12b"
            assert response.done is True

            # Verify the call was made correctly
            call_args = mock_client.chat.call_args
            assert call_args[1]["model"] == "gemma3:12b"

    @pytest.mark.asyncio
    async def test_chat_success_with_custom_model(self):
        """Test successful chat with custom model."""
        mock_response = {
            "message": {
                "role": "assistant",
                "content": "Response from llama3.2",
            },
            "model": "llama3.2",
            "done": True,
        }

        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            response = await client.chat(messages, model="llama3.2")

            assert response.model == "llama3.2"

            # Verify the call was made with custom model
            call_args = mock_client.chat.call_args
            assert call_args[1]["model"] == "llama3.2"

    @pytest.mark.asyncio
    async def test_chat_with_temperature(self):
        """Test chat with temperature parameter."""
        mock_response = {
            "message": {"role": "assistant", "content": "Response"},
            "model": "gemma3:12b",
            "done": True,
        }

        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_response)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            await client.chat(messages, temperature=0.7)

            # Verify temperature was passed
            call_args = mock_client.chat.call_args
            assert "options" in call_args[1]
            assert call_args[1]["options"]["temperature"] == 0.7

    @pytest.mark.asyncio
    async def test_chat_model_not_found(self):
        """Test chat with model not found."""
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(side_effect=Exception("model 'unknown' not found"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            with pytest.raises(OllamaModelNotFoundError):
                await client.chat(messages, model="unknown")

    @pytest.mark.asyncio
    async def test_chat_connection_error(self):
        """Test chat with connection error."""
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(side_effect=Exception("Connection refused"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            with pytest.raises(OllamaConnectionError):
                await client.chat(messages)

    @pytest.mark.asyncio
    async def test_chat_timeout_error(self):
        """Test chat with timeout."""
        import asyncio

        mock_client = AsyncMock()

        async def timeout_func(*args, **kwargs):
            await asyncio.sleep(5)
            return {"message": {"role": "assistant", "content": "Late response"}, "model": "gemma3:12b", "done": True}

        mock_client.chat = AsyncMock(side_effect=timeout_func)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=1,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            with pytest.raises(OllamaTimeoutError):
                await client.chat(messages)


class TestOllamaClientChatStream:
    """Test OllamaClient.chat_stream method (SSE streaming)."""

    @pytest.mark.asyncio
    async def test_chat_stream_success(self):
        """Test successful streaming chat."""
        async def mock_stream():
            """Mock streaming response."""
            chunks = [
                {"message": {"content": "Hello", "role": "assistant"}, "model": "gemma3:12b", "done": False},
                {"message": {"content": " there", "role": "assistant"}, "model": "gemma3:12b", "done": False},
                {"message": {"content": "!", "role": "assistant"}, "model": "gemma3:12b", "done": True},
            ]
            for chunk in chunks:
                yield chunk

        mock_client = AsyncMock()
        mock_client.chat = MagicMock()
        mock_client.chat.return_value = mock_stream()

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            chunks = []
            async for chunk in client.chat_stream(messages):
                chunks.append(chunk)

            assert len(chunks) == 3
            assert chunks[0].content == "Hello"
            assert chunks[1].content == " there"
            assert chunks[2].content == "!"
            assert chunks[2].done is True

    @pytest.mark.asyncio
    async def test_chat_stream_with_custom_model(self):
        """Test streaming chat with custom model."""
        async def mock_stream():
            yield {"message": {"content": "Hi", "role": "assistant"}, "model": "llama3.2", "done": True}

        mock_client = AsyncMock()
        mock_client.chat = MagicMock()
        mock_client.chat.return_value = mock_stream()

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            chunks = []
            async for chunk in client.chat_stream(messages, model="llama3.2"):
                chunks.append(chunk)

            assert len(chunks) == 1
            assert chunks[0].model == "llama3.2"

    @pytest.mark.asyncio
    async def test_chat_stream_with_temperature(self):
        """Test streaming chat with temperature."""
        async def mock_stream():
            yield {"message": {"content": "Response", "role": "assistant"}, "model": "gemma3:12b", "done": True}

        mock_client = AsyncMock()
        mock_client.chat = MagicMock()
        mock_client.chat.return_value = mock_stream()

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            async for _ in client.chat_stream(messages, temperature=0.5):
                break

            # Verify temperature was passed
            call_args = mock_client.chat.call_args
            assert "options" in call_args[1]
            assert call_args[1]["options"]["temperature"] == 0.5

    @pytest.mark.asyncio
    async def test_chat_stream_connection_error(self):
        """Test streaming chat with connection error."""
        mock_client = AsyncMock()
        mock_client.chat = MagicMock(side_effect=Exception("Connection refused"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            with pytest.raises(OllamaConnectionError):
                async for _ in client.chat_stream(messages):
                    pass

    @pytest.mark.asyncio
    async def test_chat_stream_model_not_found(self):
        """Test streaming chat with model not found."""
        mock_client = AsyncMock()
        mock_client.chat = MagicMock(side_effect=Exception("model 'unknown' not found"))

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            messages = [ChatMessage(role="user", content="Hello")]

            with pytest.raises(OllamaModelNotFoundError):
                async for _ in client.chat_stream(messages, model="unknown"):
                    pass


class TestOllamaClientIntegration:
    """Integration-style tests for OllamaClient."""

    @pytest.mark.asyncio
    async def test_full_chat_flow(self):
        """Test complete flow: health check -> list models -> chat."""
        mock_models_response = {
            "models": [
                {"name": "gemma3:12b", "size": 7340032000},
            ]
        }

        mock_chat_response = {
            "message": {"role": "assistant", "content": "Test response"},
            "model": "gemma3:12b",
            "done": True,
        }

        mock_client = AsyncMock()
        mock_client.list = AsyncMock(return_value=mock_models_response)
        mock_client.chat = AsyncMock(return_value=mock_chat_response)

        with patch("app.services.ai.llm_service.ollama.AsyncClient", return_value=mock_client):
            client = OllamaClient(
                base_url="http://localhost:11434",
                default_model="gemma3:12b",
                timeout=120,
            )

            # Health check
            is_healthy = await client.health_check()
            assert is_healthy is True

            # List models
            models = await client.list_models()
            assert len(models) == 1
            assert models[0].name == "gemma3:12b"

            # Chat
            messages = [ChatMessage(role="user", content="Test")]
            response = await client.chat(messages)
            assert response.message.content == "Test response"
