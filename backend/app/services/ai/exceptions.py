"""Custom exceptions for AI services."""


class OllamaServiceError(Exception):
    """Base exception for Ollama service errors."""

    def __init__(self, message: str, details: dict | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class OllamaConnectionError(OllamaServiceError):
    """Connection to Ollama failed."""

    def __init__(self, message: str = "Failed to connect to Ollama service") -> None:
        super().__init__(message)


class OllamaModelNotFoundError(OllamaServiceError):
    """Requested model not found in Ollama."""

    def __init__(self, model: str) -> None:
        super().__init__(f"Model '{model}' not found")
        self.model = model


class OllamaTimeoutError(OllamaServiceError):
    """Ollama request timed out."""

    def __init__(self, message: str = "Ollama request timed out") -> None:
        super().__init__(message)
