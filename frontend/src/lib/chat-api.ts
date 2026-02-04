/**
 * Chat API client for AI service communication.
 *
 * Provides:
 * - SSE streaming chat completion
 * - Model listing
 * - Health check
 */

import { api } from './api'
import type {
  ChatMessage,
  ChatRequest,
  StreamChunk,
  ModelInfo,
  HealthResponse,
  StreamCallback,
  StreamCompleteCallback,
} from './types-chat'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of sendMessageStream.
 * Contains the raw response and an async generator for chunks.
 */
export interface SendMessageStreamResult {
  response: Response
  streamChunks: () => AsyncGenerator<StreamChunk, void, unknown>
}

// ============================================================================
// SSE Streaming Parser
// ============================================================================

/**
 * Parse a Server-Sent Events (SSE) stream.
 *
 * SSE format:
 * data: {"content":"Hello","model":"llama3.2","done":false}
 *
 * @param response - Fetch response with ReadableStream body
 * @yields Parsed StreamChunk objects
 */
async function* parseSSEStream(
  response: Response
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim()

        // SSE format: "data: {json}"
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6) // Remove "data: " prefix

          if (!data || data === '[DONE]') {
            continue
          }

          try {
            const chunk = JSON.parse(data) as StreamChunk
            yield chunk
          } catch {
            // Skip invalid JSON chunks
            // Server might send error chunks or malformed data
            continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// Chat Endpoints
// ============================================================================

/**
 * Send a chat message with streaming response.
 *
 * Uses fetch API directly instead of axios to support streaming responses.
 * Returns an async generator that yields StreamChunk objects.
 *
 * @param messages - Array of chat messages (context + new message)
 * @param model - Optional model name (defaults to server default)
 * @param temperature - Optional sampling temperature (0.0 to 1.0)
 * @returns Stream result with async generator for chunks
 * @throws Error if request fails
 *
 * @example
 * ```ts
 * const result = await sendMessageStream([
 *   { role: 'user', content: 'Hello' }
 * ])
 *
 * for await (const chunk of result.streamChunks()) {
 *   console.log(chunk.content)
 *   if (chunk.done) break
 * }
 * ```
 */
export async function sendMessageStream(
  messages: ChatMessage[],
  model?: string | null,
  temperature?: number | null
): Promise<SendMessageStreamResult> {
  const requestBody: ChatRequest = {
    messages,
    model: model ?? null,
    temperature: temperature ?? null,
  }

  const token = localStorage.getItem('soai-token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch('/api/v1/ai/chat/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Chat request failed: ${response.status} ${errorText}`)
  }

  return {
    response,
    streamChunks: () => parseSSEStream(response),
  }
}

/**
 * List available AI models.
 *
 * @returns Array of ModelInfo objects
 */
export async function getModels(): Promise<ModelInfo[]> {
  try {
    const response = await api.get<ModelInfo[]>('/v1/ai/models')
    return response.data
  } catch {
    // Return empty array on error - UI can handle this gracefully
    return []
  }
}

/**
 * Check AI service health.
 *
 * @returns HealthResponse with status and ollama_reachable flag
 */
export async function getHealth(): Promise<HealthResponse> {
  try {
    const response = await api.get<HealthResponse>('/v1/ai/health')
    return response.data
  } catch {
    // Return unhealthy status on error
    return {
      status: 'unhealthy',
      ollama_reachable: false,
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Send a message with callback-based streaming.
 *
 * Alternative to the async generator API if you prefer callbacks.
 *
 * @param messages - Array of chat messages
 * @param onChunk - Callback for each received chunk
 * @param onComplete - Callback when streaming completes
 * @param model - Optional model name
 * @param temperature - Optional temperature
 */
export async function sendMessageWithCallbacks(
  messages: ChatMessage[],
  onChunk: StreamCallback,
  onComplete: StreamCompleteCallback,
  model?: string | null,
  temperature?: number | null
): Promise<void> {
  try {
    const result = await sendMessageStream(messages, model, temperature)

    let fullContent = ''

    for await (const chunk of result.streamChunks()) {
      onChunk(chunk)
      fullContent += chunk.content

      if (chunk.done) {
        onComplete(fullContent)
        return
      }
    }

    // Stream ended without done=true
    onComplete(fullContent)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    onComplete('', errorMessage)
  }
}

/**
 * Send a message and collect the full response.
 *
 * Convenience function for non-streaming use case.
 * Note: This still uses the streaming endpoint internally.
 *
 * @param messages - Array of chat messages
 * @param model - Optional model name
 * @param temperature - Optional temperature
 * @returns Complete assistant message content
 */
export async function sendMessage(
  messages: ChatMessage[],
  model?: string | null,
  temperature?: number | null
): Promise<string> {
  const result = await sendMessageStream(messages, model, temperature)
  let fullContent = ''

  for await (const chunk of result.streamChunks()) {
    fullContent += chunk.content
    if (chunk.done) break
  }

  return fullContent
}
