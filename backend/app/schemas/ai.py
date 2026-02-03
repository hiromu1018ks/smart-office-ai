"""AI-related Pydantic schemas."""

from pydantic import BaseModel, Field, field_validator
from typing import Literal


class ChatMessage(BaseModel):
    """Schema for a single chat message."""

    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request schema for chat completion."""

    messages: list[ChatMessage] = Field(..., min_length=1)
    model: str | None = None
    temperature: float | None = Field(None, ge=0.0, le=1.0)

    @field_validator("messages")
    @classmethod
    def messages_not_empty(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        """Validate messages list is not empty."""
        if not v:
            raise ValueError("messages must not be empty")
        return v


class ChatResponse(BaseModel):
    """Response schema for chat completion."""

    message: ChatMessage
    model: str
    done: bool


class ModelInfo(BaseModel):
    """Schema for model information."""

    name: str
    size: int | None = None


class HealthResponse(BaseModel):
    """Schema for AI service health check."""

    status: Literal["healthy", "unhealthy"]
    ollama_reachable: bool


class StreamChunk(BaseModel):
    """Schema for a streaming chat chunk (SSE)."""

    content: str
    model: str
    done: bool
