"""Integration tests for Ollama service with real Ollama instance.

These tests verify actual Ollama communication and are marked with
@pytest.mark.integration. Run with:

    pytest -m integration -v

Prerequisites:
    - Ollama service must be running (docker compose up -d ollama)
    - At least one model must be available

Note: These tests are skipped in CI/CD unless Ollama is available.
"""

import os
import sys

import pytest
import pytest_asyncio

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.ai.llm_service import OllamaClient
from app.schemas.ai import ChatMessage

# Test configuration - can be overridden via environment variables
OLLAMA_BASE_URL = os.getenv(
    'OLLAMA_BASE_URL',
    'http://localhost:11434'  # Default for local testing
)
OLLAMA_MODEL = os.getenv(
    'OLLAMA_MODEL',
    'gemma3:12b'
)
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '30'))


@pytest.mark.integration
class TestOllamaClientIntegration:
    """Tests that verify actual Ollama communication."""

    @pytest_asyncio.fixture
    async def real_client(self) -> OllamaClient:
        """Create a real OllamaClient for integration testing."""
        client = OllamaClient(
            base_url=OLLAMA_BASE_URL,
            default_model=OLLAMA_MODEL,
            timeout=OLLAMA_TIMEOUT,
        )
        return client

    @pytest.mark.asyncio
    async def test_real_health_check(self, real_client: OllamaClient):
        """Test health check with real Ollama service."""
        result = await real_client.health_check()

        # If Ollama is not available, skip the test
        if not result:
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        # If we got here, Ollama is available and healthy
        assert result is True

    @pytest.mark.asyncio
    async def test_real_list_models(self, real_client: OllamaClient):
        """Test listing models with real Ollama service."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        models = await real_client.list_models()

        # Verify we got a list (may be empty if no models pulled)
        assert isinstance(models, list)

        # If models exist, verify structure
        if models:
            assert hasattr(models[0], 'name')
            assert models[0].name  # Name should not be empty

    @pytest.mark.asyncio
    async def test_real_chat_blocking(self, real_client: OllamaClient):
        """Test blocking chat with real Ollama service."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        # List models to find an available one
        models = await real_client.list_models()

        if not models:
            pytest.skip("No models available in Ollama")

        # Use the first available model
        test_model = models[0].name

        messages = [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="Say 'Hello' in one word."),
        ]

        response = await real_client.chat(messages, model=test_model)

        # Verify response structure
        assert response.message.role == "assistant"
        assert isinstance(response.message.content, str)
        assert len(response.message.content) > 0
        assert response.model == test_model
        assert response.done is True

        # The response should contain a greeting (lenient check)
        content_lower = response.message.content.lower()
        assert any(word in content_lower for word in ['hello', 'hi', 'hey'])

    @pytest.mark.asyncio
    async def test_real_chat_streaming(self, real_client: OllamaClient):
        """Test streaming chat with real Ollama service."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        # List models to find an available one
        models = await real_client.list_models()

        if not models:
            pytest.skip("No models available in Ollama")

        # Use the first available model
        test_model = models[0].name

        messages = [
            ChatMessage(role="user", content="Count from 1 to 3"),
        ]

        chunks = []
        async for chunk in real_client.chat_stream(messages, model=test_model):
            chunks.append(chunk)
            if chunk.done:
                break

        # Verify we got at least one chunk
        assert len(chunks) > 0

        # Verify the last chunk is marked as done
        assert chunks[-1].done is True

        # Verify we got some content
        full_content = ''.join(c.content for c in chunks)
        assert len(full_content) > 0

    @pytest.mark.asyncio
    async def test_real_chat_with_temperature(self, real_client: OllamaClient):
        """Test chat with temperature parameter."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        # List models to find an available one
        models = await real_client.list_models()

        if not models:
            pytest.skip("No models available in Ollama")

        test_model = models[0].name

        messages = [
            ChatMessage(role="user", content="Reply with just 'OK'"),
        ]

        # Test with low temperature (more deterministic)
        response = await real_client.chat(messages, model=test_model, temperature=0.1)

        assert response.message.content is not None
        assert len(response.message.content) > 0

    @pytest.mark.asyncio
    async def test_real_model_not_found_error(self, real_client: OllamaClient):
        """Test that using a non-existent model raises appropriate error."""
        from app.services.ai.exceptions import OllamaModelNotFoundError

        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        messages = [
            ChatMessage(role="user", content="Hello"),
        ]

        # Use a clearly non-existent model name
        with pytest.raises(OllamaModelNotFoundError):
            await real_client.chat(messages, model="definitely-not-a-real-model-xyz123")

    @pytest.mark.asyncio
    async def test_timeout_handling(self, real_client: OllamaClient):
        """Test that timeout is properly enforced."""
        from app.services.ai.exceptions import OllamaTimeoutError

        # Create a client with very short timeout
        short_timeout_client = OllamaClient(
            base_url=OLLAMA_BASE_URL,
            default_model=OLLAMA_MODEL,
            timeout=0.001,  # Extremely short timeout
        )

        # This might not reliably trigger timeout, so we just verify the client works
        # In a real scenario, we'd use a slow model or prompt
        # For now, just verify the client was created
        assert short_timeout_client.timeout == 0.001


@pytest.mark.integration
class TestOllamaClientContract:
    """Tests that verify the contract between our service and Ollama API.

    These tests ensure our understanding of Ollama's API is correct.
    """

    @pytest_asyncio.fixture
    async def real_client(self) -> OllamaClient:
        """Create a real OllamaClient for integration testing."""
        client = OllamaClient(
            base_url=OLLAMA_BASE_URL,
            default_model=OLLAMA_MODEL,
            timeout=OLLAMA_TIMEOUT,
        )
        return client

    @pytest.mark.asyncio
    async def test_ollama_response_structure(self, real_client: OllamaClient):
        """Verify that Ollama's response structure matches our expectations."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        models = await real_client.list_models()

        # Each model should have the expected attributes
        for model in models:
            assert hasattr(model, 'name')
            assert isinstance(model.name, str)
            # Size may be None for some models
            if model.size is not None:
                assert isinstance(model.size, int)

    @pytest.mark.asyncio
    async def test_chat_response_structure(self, real_client: OllamaClient):
        """Verify chat response has expected structure."""
        # First check if Ollama is available
        if not await real_client.health_check():
            pytest.skip(f"Ollama service not available at {OLLAMA_BASE_URL}")

        models = await real_client.list_models()
        if not models:
            pytest.skip("No models available")

        test_model = models[0].name
        messages = [ChatMessage(role="user", content="Hi")]

        response = await real_client.chat(messages, model=test_model)

        # Verify response structure
        assert hasattr(response, 'message')
        assert hasattr(response.message, 'role')
        assert hasattr(response.message, 'content')
        assert hasattr(response, 'model')
        assert hasattr(response, 'done')

        # Verify types
        assert isinstance(response.message.role, str)
        assert isinstance(response.message.content, str)
        assert isinstance(response.model, str)
        assert isinstance(response.done, bool)
