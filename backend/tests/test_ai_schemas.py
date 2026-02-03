"""Tests for AI schemas (TDD - RED phase).

This file tests all AI-related schemas before implementation.
Tests should fail initially (RED), then pass after implementation (GREEN).
"""

import pytest
from pydantic import ValidationError

from app.schemas.ai import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    HealthResponse,
    StreamChunk,
)


class TestChatMessage:
    """Test ChatMessage schema."""

    def test_valid_system_message(self):
        """Test valid system message."""
        msg = ChatMessage(role="system", content="You are a helpful assistant.")
        assert msg.role == "system"
        assert msg.content == "You are a helpful assistant."

    def test_valid_user_message(self):
        """Test valid user message."""
        msg = ChatMessage(role="user", content="Hello, how are you?")
        assert msg.role == "user"
        assert msg.content == "Hello, how are you?"

    def test_valid_assistant_message(self):
        """Test valid assistant message."""
        msg = ChatMessage(role="assistant", content="I'm doing well, thank you!")
        assert msg.role == "assistant"
        assert msg.content == "I'm doing well, thank you!"

    def test_invalid_role(self):
        """Test invalid role raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ChatMessage(role="admin", content="Some content")
        assert "role" in str(exc_info.value).lower()

    def test_empty_content(self):
        """Test empty content is allowed (for edge cases)."""
        msg = ChatMessage(role="user", content="")
        assert msg.content == ""

    def test_message_serialization(self):
        """Test ChatMessage can be serialized to JSON."""
        msg = ChatMessage(role="user", content="Test message")
        data = msg.model_dump()
        assert data == {"role": "user", "content": "Test message"}

    def test_message_deserialization(self):
        """Test ChatMessage can be deserialized from dict."""
        data = {"role": "assistant", "content": "Response"}
        msg = ChatMessage(**data)
        assert msg.role == "assistant"
        assert msg.content == "Response"


class TestChatRequest:
    """Test ChatRequest schema."""

    def test_valid_chat_request(self):
        """Test valid chat request with messages."""
        data = {
            "messages": [
                {"role": "system", "content": "You are helpful."},
                {"role": "user", "content": "Hello"},
            ],
            "model": "gemma3:12b",
            "temperature": 0.7,
        }
        req = ChatRequest(**data)

        assert len(req.messages) == 2
        assert req.model == "gemma3:12b"
        assert req.temperature == 0.7

    def test_chat_request_defaults(self):
        """Test chat request with default values."""
        data = {
            "messages": [{"role": "user", "content": "Hello"}],
        }
        req = ChatRequest(**data)

        assert req.model is None
        assert req.temperature is None

    def test_chat_request_empty_messages(self):
        """Test empty messages list raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(messages=[])
        assert "messages" in str(exc_info.value).lower()

    def test_chat_request_missing_messages(self):
        """Test missing messages field raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(model="gemma3:12b")
        assert "messages" in str(exc_info.value).lower()

    def test_chat_request_invalid_temperature(self):
        """Test invalid temperature raises ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(
                messages=[{"role": "user", "content": "Hello"}],
                temperature=2.5,  # Too high
            )

        with pytest.raises(ValidationError):
            ChatRequest(
                messages=[{"role": "user", "content": "Hello"}],
                temperature=-0.5,  # Negative
            )

    def test_chat_request_valid_temperature_bounds(self):
        """Test valid temperature at boundaries."""
        req = ChatRequest(
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.0,
        )
        assert req.temperature == 0.0

        req = ChatRequest(
            messages=[{"role": "user", "content": "Hello"}],
            temperature=1.0,
        )
        assert req.temperature == 1.0


class TestChatResponse:
    """Test ChatResponse schema."""

    def test_valid_chat_response(self):
        """Test valid chat response."""
        data = {
            "message": {
                "role": "assistant",
                "content": "Hello! How can I help you today?",
            },
            "model": "gemma3:12b",
            "done": True,
        }
        resp = ChatResponse(**data)

        assert resp.message.role == "assistant"
        assert resp.message.content == "Hello! How can I help you today?"
        assert resp.model == "gemma3:12b"
        assert resp.done is True

    def test_chat_response_streaming_not_done(self):
        """Test chat response for streaming (not done)."""
        resp = ChatResponse(
            message={"role": "assistant", "content": "Hello"},
            model="gemma3:12b",
            done=False,
        )
        assert resp.done is False

    def test_chat_response_missing_required_fields(self):
        """Test missing required fields raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ChatResponse(
                message={"role": "assistant", "content": "Hello"},
                model="gemma3:12b",
                # Missing "done"
            )
        assert "done" in str(exc_info.value).lower()

    def test_chat_response_serialization(self):
        """Test ChatResponse can be serialized to JSON."""
        resp = ChatResponse(
            message={"role": "assistant", "content": "Test"},
            model="gemma3:12b",
            done=True,
        )
        data = resp.model_dump()
        assert data == {
            "message": {"role": "assistant", "content": "Test"},
            "model": "gemma3:12b",
            "done": True,
        }


class TestModelInfo:
    """Test ModelInfo schema."""

    def test_valid_model_info(self):
        """Test valid model info with size."""
        data = {
            "name": "gemma3:12b",
            "size": 7340032000,  # ~7GB
        }
        info = ModelInfo(**data)

        assert info.name == "gemma3:12b"
        assert info.size == 7340032000

    def test_model_info_without_size(self):
        """Test model info without optional size."""
        info = ModelInfo(name="gemma3:12b")
        assert info.name == "gemma3:12b"
        assert info.size is None

    def test_model_info_zero_size(self):
        """Test model info with zero size."""
        info = ModelInfo(name="model", size=0)
        assert info.size == 0

    def test_model_info_serialization(self):
        """Test ModelInfo can be serialized to JSON."""
        info = ModelInfo(name="gemma3:12b", size=1000000)
        data = info.model_dump()
        assert data == {"name": "gemma3:12b", "size": 1000000}


class TestHealthResponse:
    """Test HealthResponse schema."""

    def test_healthy_response(self):
        """Test healthy status response."""
        data = {
            "status": "healthy",
            "ollama_reachable": True,
        }
        resp = HealthResponse(**data)

        assert resp.status == "healthy"
        assert resp.ollama_reachable is True

    def test_unhealthy_response(self):
        """Test unhealthy status response."""
        resp = HealthResponse(status="unhealthy", ollama_reachable=False)
        assert resp.status == "unhealthy"
        assert resp.ollama_reachable is False

    def test_invalid_status(self):
        """Test invalid status raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            HealthResponse(status="error", ollama_reachable=False)
        assert "status" in str(exc_info.value).lower()

    def test_ollama_unreachable_but_status_healthy(self):
        """Test valid (though inconsistent) health response."""
        # This is valid schema even if logically inconsistent
        resp = HealthResponse(status="healthy", ollama_reachable=False)
        assert resp.status == "healthy"
        assert resp.ollama_reachable is False


class TestStreamChunk:
    """Test StreamChunk schema for SSE streaming."""

    def test_valid_stream_chunk(self):
        """Test valid stream chunk."""
        data = {
            "content": "Hello",
            "model": "gemma3:12b",
            "done": False,
        }
        chunk = StreamChunk(**data)

        assert chunk.content == "Hello"
        assert chunk.model == "gemma3:12b"
        assert chunk.done is False

    def test_stream_chunk_final(self):
        """Test final stream chunk."""
        chunk = StreamChunk(content="", model="gemma3:12b", done=True)
        assert chunk.content == ""
        assert chunk.done is True

    def test_stream_chunk_serialization(self):
        """Test StreamChunk can be serialized for SSE."""
        chunk = StreamChunk(content="test", model="gemma3:12b", done=False)
        data = chunk.model_dump()
        assert data == {
            "content": "test",
            "model": "gemma3:12b",
            "done": False,
        }
