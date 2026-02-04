/**
 * Tests for chat API client using TDD methodology.
 *
 * Test structure:
 * 1. sendMessageStream - SSE streaming
 * 2. getModels - model listing
 * 3. getHealth - health check
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendMessageStream, getModels, getHealth } from './chat-api'
import { api } from './api'
import type { StreamChunk } from './types-chat'

// Mock the api module (for getModels and getHealth)
vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as never

describe('chat-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage for token
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('sendMessageStream', () => {
    it('should send POST request to /v1/ai/chat/stream', async () => {
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"content":"Hello","model":"llama3.2","done":false}\n\n')
            )
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      await sendMessageStream([{ role: 'user', content: 'Hi' }])

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/ai/chat/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hi' }],
            model: null,
            temperature: null,
          }),
        })
      )
    })

    it('should include model in request if provided', async () => {
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      await sendMessageStream([{ role: 'user', content: 'Hi' }], 'llama3.2')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('llama3.2')
    })

    it('should include temperature in request if provided', async () => {
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      await sendMessageStream([{ role: 'user', content: 'Hi' }], null, 0.7)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.temperature).toBe(0.7)
    })

    it('should add auth token if available', async () => {
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.close()
          },
        })
      )

      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => (key === 'soai-token' ? 'test-token' : null)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      })

      mockFetch.mockResolvedValueOnce(mockResponse)

      await sendMessageStream([{ role: 'user', content: 'Hi' }])

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/ai/chat/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('should parse SSE chunks correctly', async () => {
      const chunks: StreamChunk[] = [
        { content: 'Hello', model: 'llama3.2', done: false },
        { content: ' world', model: 'llama3.2', done: false },
        { content: '!', model: 'llama3.2', done: true },
      ]

      const sseData = chunks
        .map((c) => `data: ${JSON.stringify(c)}\n\n`)
        .join('')

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      const receivedChunks: StreamChunk[] = []

      for await (const chunk of result.streamChunks()) {
        receivedChunks.push(chunk)
      }

      expect(receivedChunks).toEqual(chunks)
    })

    it('should handle error chunks from server', async () => {
      const errorChunk = {
        content: '',
        model: 'llama3.2',
        done: true,
        error: 'Model not found',
      }

      const sseData = `data: ${JSON.stringify(errorChunk)}\n\n`

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      const receivedChunks: StreamChunk[] = []

      for await (const chunk of result.streamChunks()) {
        receivedChunks.push(chunk)
      }

      expect(receivedChunks[0].error).toBe('Model not found')
    })

    it('should handle malformed SSE data gracefully', async () => {
      const sseData = 'data: invalid json\n\ndata: {"content":"test","model":"llama3.2","done":true}\n\n'

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      const receivedChunks: StreamChunk[] = []

      for await (const chunk of result.streamChunks()) {
        receivedChunks.push(chunk)
      }

      // Should skip invalid JSON and parse valid chunk
      expect(receivedChunks).toHaveLength(1)
      expect(receivedChunks[0].content).toBe('test')
    })

    it('should propagate network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(sendMessageStream([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'Network error'
      )
    })

    it('should throw error on non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as unknown as Response

      mockFetch.mockResolvedValueOnce(mockResponse)

      await expect(sendMessageStream([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'Chat request failed'
      )
    })

    it('should handle [DONE] sentinel', async () => {
      const sseData = 'data: {"content":"Hi","model":"llama3.2","done":false}\n\ndata: [DONE]\n\n'

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      const receivedChunks: StreamChunk[] = []

      for await (const chunk of result.streamChunks()) {
        receivedChunks.push(chunk)
      }

      // Should parse the first chunk and ignore [DONE]
      expect(receivedChunks).toHaveLength(1)
      expect(receivedChunks[0].content).toBe('Hi')
    })

    it('should accumulate content across chunks', async () => {
      const sseData =
        'data: {"content":"H","model":"llama3.2","done":false}\n\n' +
        'data: {"content":"e","model":"llama3.2","done":false}\n\n' +
        'data: {"content":"l","model":"llama3.2","done":false}\n\n' +
        'data: {"content":"l","model":"llama3.2","done":false}\n\n' +
        'data: {"content":"o","model":"llama3.2","done":true}\n\n'

      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      let fullContent = ''

      for await (const chunk of result.streamChunks()) {
        fullContent += chunk.content
      }

      expect(fullContent).toBe('Hello')
    })

    it('should handle split SSE events', async () => {
      // Simulate SSE event split across multiple reads
      const chunks: Uint8Array[] = [
        new TextEncoder().encode('data: {"content":"Hello","model":"llama3.2","done":false}\n'),
        new TextEncoder().encode('\ndata: {"content":" world","model":"llama3.2","done":true}\n\n'),
      ]

      let chunkIndex = 0
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            const interval = setInterval(() => {
              if (chunkIndex < chunks.length) {
                controller.enqueue(chunks[chunkIndex])
                chunkIndex++
              } else {
                clearInterval(interval)
                controller.close()
              }
            }, 10)
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await sendMessageStream([{ role: 'user', content: 'Hi' }])
      const receivedChunks: StreamChunk[] = []

      for await (const chunk of result.streamChunks()) {
        receivedChunks.push(chunk)
      }

      expect(receivedChunks).toHaveLength(2)
      expect(receivedChunks[0].content).toBe('Hello')
      expect(receivedChunks[1].content).toBe(' world')
    })
  })

  describe('getModels', () => {
    it('should fetch models from /v1/ai/models', async () => {
      const mockModels = [
        { name: 'llama3.2', size: 1000000 },
        { name: 'qwen2.5', size: 2000000 },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockModels } as never)

      const result = await getModels()

      expect(api.get).toHaveBeenCalledWith('/v1/ai/models')
      expect(result).toEqual(mockModels)
    })

    it('should return empty array on error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('API error'))

      const result = await getModels()

      expect(result).toEqual([])
    })

    it('should handle empty response', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as never)

      const result = await getModels()

      expect(result).toEqual([])
    })
  })

  describe('getHealth', () => {
    it('should fetch health status from /v1/ai/health', async () => {
      const mockHealth = { status: 'healthy' as const, ollama_reachable: true }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockHealth } as never)

      const result = await getHealth()

      expect(api.get).toHaveBeenCalledWith('/v1/ai/health')
      expect(result).toEqual(mockHealth)
    })

    it('should return unhealthy status on error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('API error'))

      const result = await getHealth()

      expect(result).toEqual({ status: 'unhealthy', ollama_reachable: false })
    })
  })
})
