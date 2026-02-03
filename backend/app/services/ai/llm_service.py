"""Ollama LLM service for chat completion."""

import asyncio
import logging
from typing import AsyncGenerator

import ollama

from app.schemas.ai import ChatMessage, ChatResponse, ModelInfo, StreamChunk
from app.services.ai.exceptions import (
    OllamaConnectionError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)

logger = logging.getLogger(__name__)


class OllamaClient:
    """
    Async client for Ollama LLM service.

    Provides methods for:
    - Health check
    - Listing available models
    - Blocking chat completion
    - Streaming chat completion (SSE)
    """

    def __init__(
        self,
        base_url: str,
        default_model: str,
        timeout: int,
    ) -> None:
        """
        Initialize the Ollama client.

        Args:
            base_url: Ollama service URL (e.g., http://localhost:11434)
            default_model: Default model to use for chat
            timeout: Request timeout in seconds
        """
        self._client = ollama.AsyncClient(host=base_url)
        self.default_model = default_model
        self.timeout = timeout

    async def health_check(self) -> bool:
        """
        Check if Ollama service is reachable.

        Returns:
            True if Ollama is reachable, False otherwise
        """
        try:
            await asyncio.wait_for(
                self._client.list(),
                timeout=self.timeout,
            )
            return True
        except asyncio.TimeoutError:
            logger.debug("Ollama health check timed out")
            return False
        except Exception as exc:
            logger.debug(f"Ollama health check failed: {exc}")
            return False

    async def list_models(self) -> list[ModelInfo]:
        """
        List available models from Ollama.

        Returns:
            List of ModelInfo objects

        Raises:
            OllamaConnectionError: If connection fails
        """
        try:
            response = await asyncio.wait_for(
                self._client.list(),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise OllamaTimeoutError(f"List models timed out after {self.timeout}s") from exc
        except Exception as exc:
            raise OllamaConnectionError(f"Failed to list models: {exc}") from exc

        models = response.get("models", [])
        return [
            ModelInfo(
                name=model.get("name", ""),
                size=model.get("size"),
            )
            for model in models
            if model.get("name")  # Skip models with empty names
        ]

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float | None = None,
    ) -> ChatResponse:
        """
        Send a chat completion request (blocking).

        Args:
            messages: List of chat messages
            model: Model to use (defaults to client's default_model)
            temperature: Sampling temperature (0.0 to 1.0)

        Returns:
            ChatResponse with the assistant's message

        Raises:
            OllamaConnectionError: If connection fails
            OllamaModelNotFoundError: If model not found
            OllamaTimeoutError: If request times out
        """
        # Use provided model or default
        chat_model = model or self.default_model

        # Build request options
        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        # Convert messages to dicts
        messages_dicts = [msg.model_dump() for msg in messages]

        try:
            response = await asyncio.wait_for(
                self._client.chat(
                    model=chat_model,
                    messages=messages_dicts,
                    options=options if options else None,
                ),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise OllamaTimeoutError(f"Chat request timed out after {self.timeout}s") from exc
        except Exception as exc:
            error_msg = str(exc).lower()
            if "not found" in error_msg or "model" in error_msg:
                raise OllamaModelNotFoundError(chat_model) from exc
            raise OllamaConnectionError(f"Chat request failed: {exc}") from exc

        # Parse response
        message_data = response.get("message", {})
        assistant_message = ChatMessage(
            role=message_data.get("role", "assistant"),
            content=message_data.get("content", ""),
        )

        return ChatResponse(
            message=assistant_message,
            model=response.get("model", chat_model),
            done=response.get("done", True),
        )

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float | None = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Send a streaming chat completion request.

        Yields StreamChunk objects for each part of the response.

        Args:
            messages: List of chat messages
            model: Model to use (defaults to client's default_model)
            temperature: Sampling temperature (0.0 to 1.0)

        Yields:
            StreamChunk objects with incremental content

        Raises:
            OllamaConnectionError: If connection fails
            OllamaModelNotFoundError: If model not found
            OllamaTimeoutError: If request times out
        """
        # Use provided model or default
        chat_model = model or self.default_model

        # Build request options
        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        # Convert messages to dicts
        messages_dicts = [msg.model_dump() for msg in messages]

        try:
            stream = self._client.chat(
                model=chat_model,
                messages=messages_dicts,
                options=options if options else None,
                stream=True,
            )

            # Use asyncio.timeout() context manager for Python 3.12+
            async with asyncio.timeout(self.timeout):
                async for chunk in stream:
                    # Parse each chunk
                    message_data = chunk.get("message", {})
                    content = message_data.get("content", "")

                    yield StreamChunk(
                        content=content,
                        model=chunk.get("model", chat_model),
                        done=chunk.get("done", False),
                    )

                    # If done, stop streaming
                    if chunk.get("done", False):
                        break

        except TimeoutError:
            # Python 3.11+ uses TimeoutError instead of asyncio.TimeoutError for timeout()
            raise OllamaTimeoutError(f"Stream request timed out after {self.timeout}s")
        except asyncio.TimeoutError as exc:
            # Python 3.10 and earlier
            raise OllamaTimeoutError(f"Stream request timed out after {self.timeout}s") from exc
        except Exception as exc:
            error_msg = str(exc).lower()
            if "not found" in error_msg or "model" in error_msg:
                raise OllamaModelNotFoundError(chat_model) from exc
            raise OllamaConnectionError(f"Stream request failed: {exc}") from exc
