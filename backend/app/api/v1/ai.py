"""AI API endpoints v1."""

import logging
from typing import Annotated, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.schemas.ai import ChatRequest, ChatResponse, HealthResponse, ModelInfo, StreamChunk
from app.services.ai.exceptions import (
    OllamaConnectionError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
)
from app.services.ai.llm_service import OllamaClient
from app.api.v1.auth import get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


# Dependency to get Ollama client
async def get_ollama_client() -> OllamaClient:
    """
    Get Ollama client instance.

    Returns:
        Configured OllamaClient
    """
    return OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        default_model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT,
    )


@router.get("/models", response_model=list[ModelInfo])
async def list_models(
    client: Annotated[OllamaClient, Depends(get_ollama_client)],
    _current_user: Annotated[object | None, Depends(get_optional_user)] = None,
) -> list[ModelInfo]:
    """
    List available models from Ollama.

    Returns a list of all models currently available in Ollama.
    Authentication is optional - all users can access this endpoint.
    """
    try:
        return await client.list_models()
    except OllamaConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama: {exc.message}",
        ) from exc


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    client: Annotated[OllamaClient, Depends(get_ollama_client)],
    _current_user: Annotated[object | None, Depends(get_optional_user)] = None,
) -> ChatResponse:
    """
    Generate a chat completion (blocking).

    Sends messages to the LLM and returns the complete response.
    Use /chat/stream for real-time streaming responses.

    - **messages**: Array of message objects with role and content
    - **model**: Optional model name (defaults to configured default)
    - **temperature**: Optional sampling temperature (0.0 to 1.0)

    Authentication is optional - all users can access this endpoint.
    """
    try:
        return await client.chat(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
        )
    except OllamaModelNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except OllamaTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=exc.message,
        ) from exc
    except OllamaConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama: {exc.message}",
        ) from exc


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    client: Annotated[OllamaClient, Depends(get_ollama_client)],
    _current_user: Annotated[object | None, Depends(get_optional_user)] = None,
) -> StreamingResponse:
    """
    Generate a streaming chat completion (SSE).

    Returns Server-Sent Events (SSE) with incremental response chunks.
    Each chunk contains a content fragment and a done flag.

    Request body (JSON):
    - **messages**: Array of message objects with role and content
    - **model**: Optional model name (defaults to configured default)
    - **temperature**: Optional sampling temperature (0.0 to 1.0)

    Authentication is optional - all users can access this endpoint.
    """
    async def generate() -> AsyncGenerator[str, None]:
        """Generate SSE events."""
        try:
            async for chunk in client.chat_stream(
                messages=request.messages,
                model=request.model,
                temperature=request.temperature,
            ):
                # Format as SSE event
                yield f"data: {chunk.model_dump_json()}\n\n"
        except OllamaModelNotFoundError as exc:
            logger.warning(f"Chat stream model not found: {exc}")
            error_chunk = StreamChunk(content="", model=request.model or "unknown", done=True)
            error_chunk_dict = {"error": "Model not found", **error_chunk.model_dump()}
            yield f"data: {error_chunk_dict}\n\n"
        except OllamaTimeoutError as exc:
            logger.warning(f"Chat stream timeout: {exc}")
            error_chunk = StreamChunk(content="", model=request.model or "unknown", done=True)
            error_chunk_dict = {"error": "Request timed out", **error_chunk.model_dump()}
            yield f"data: {error_chunk_dict}\n\n"
        except OllamaConnectionError as exc:
            logger.warning(f"Chat stream connection error: {exc}")
            error_chunk = StreamChunk(content="", model=request.model or "unknown", done=True)
            error_chunk_dict = {"error": "Failed to connect to Ollama", **error_chunk.model_dump()}
            yield f"data: {error_chunk_dict}\n\n"
        except Exception as exc:
            logger.error(f"Chat stream unexpected error: {exc}")
            error_chunk = StreamChunk(content="", model=request.model or "unknown", done=True)
            error_chunk_dict = {"error": "Internal error", **error_chunk.model_dump()}
            yield f"data: {error_chunk_dict}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/health", response_model=HealthResponse)
async def health_check(
    client: Annotated[OllamaClient, Depends(get_ollama_client)],
    _current_user: Annotated[object | None, Depends(get_optional_user)] = None,
) -> HealthResponse:
    """
    Check AI service health.

    Returns the health status of the Ollama service connection.
    Authentication is optional - all users can access this endpoint.
    """
    try:
        ollama_reachable = await client.health_check()
    except Exception as exc:
        logger.warning(f"Ollama health check failed: {exc}")
        ollama_reachable = False

    if ollama_reachable:
        return HealthResponse(status="healthy", ollama_reachable=True)
    else:
        return HealthResponse(status="unhealthy", ollama_reachable=False)
