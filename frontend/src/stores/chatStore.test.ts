/**
 * Tests for chatStore using TDD methodology.
 *
 * Test structure:
 * 1. State initialization
 * 2. Conversation management
 * 3. Message sending with streaming
 * 4. Error handling
 * 5. Model management
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import { useChatStore } from './chatStore'

// Mock the chat API module
vi.mock('@/lib/chat-api', () => ({
  sendMessageStream: vi.fn(),
  getModels: vi.fn(),
  getHealth: vi.fn(),
}))

// Mock global fetch for the API
const mockFetch = vi.fn()
global.fetch = mockFetch as never

import { sendMessageStream, getModels } from '@/lib/chat-api'
import type { StreamChunk } from '@/lib/types-chat'

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      availableModels: [],
      selectedModel: null,
    })
    vi.clearAllMocks()
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('should have empty conversations list', () => {
      const state = useChatStore.getState()
      expect(state.conversations).toEqual([])
    })

    it('should have no active conversation', () => {
      const state = useChatStore.getState()
      expect(state.activeConversationId).toBeNull()
      expect(state.getActiveConversation()).toBeNull()
    })

    it('should not be loading', () => {
      const state = useChatStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.isStreaming).toBe(false)
    })

    it('should have no error', () => {
      const state = useChatStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('createConversation', () => {
    it('should create a new conversation', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        const id = createConversation()
        expect(id).toBeTruthy()
        expect(typeof id).toBe('string')
      })

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.activeConversationId).toBe(state.conversations[0].id)
    })

    it('should set active conversation to newly created one', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      const state = useChatStore.getState()
      expect(state.activeConversationId).toBe(state.conversations[0].id)
    })

    it('should create multiple conversations with unique IDs', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        const id1 = createConversation()
        const id2 = createConversation()
        const id3 = createConversation()

        expect(id1).not.toBe(id2)
        expect(id2).not.toBe(id3)
        expect(id1).not.toBe(id3)
      })

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(3)
      const ids = state.conversations.map((c) => c.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('should initialize conversation with empty messages', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      const state = useChatStore.getState()
      expect(state.conversations[0].messages).toEqual([])
    })

    it('should set default title for new conversation', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      const state = useChatStore.getState()
      expect(state.conversations[0].title).toBe('New Conversation')
    })
  })

  describe('deleteConversation', () => {
    it('should delete conversation by id', () => {
      const { createConversation, deleteConversation } = useChatStore.getState()

      act(() => {
        const id = createConversation()
        deleteConversation(id)
      })

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(0)
    })

    it('should clear active conversation if deleting active one', () => {
      const { createConversation, deleteConversation } = useChatStore.getState()

      act(() => {
        const id1 = createConversation()
        const id2 = createConversation()
        // id2 is now active
        expect(useChatStore.getState().activeConversationId).toBe(id2)
        // Delete id2 (the active one)
        deleteConversation(id2)
        // Active should now be id1 (the remaining conversation)
        expect(useChatStore.getState().activeConversationId).toBe(id1)
      })
    })

    it('should do nothing if conversation id not found', () => {
      const { createConversation, deleteConversation } = useChatStore.getState()

      act(() => {
        createConversation()
        const lengthBefore = useChatStore.getState().conversations.length
        deleteConversation('non-existent-id')
        expect(useChatStore.getState().conversations.length).toBe(lengthBefore)
      })
    })
  })

  describe('setActiveConversation', () => {
    it('should set active conversation', () => {
      const { createConversation, setActiveConversation } = useChatStore.getState()

      act(() => {
        const id = createConversation()
        setActiveConversation(null)
        expect(useChatStore.getState().activeConversationId).toBeNull()

        setActiveConversation(id)
      })

      const state = useChatStore.getState()
      expect(state.activeConversationId).toBe(useChatStore.getState().conversations[0].id)
    })

    it('should return null active conversation when set to null', () => {
      const { createConversation, setActiveConversation } = useChatStore.getState()

      act(() => {
        createConversation()
        setActiveConversation(null)
      })

      const state = useChatStore.getState()
      expect(state.getActiveConversation()).toBeNull()
    })

    it('should provide activeConversation computed property', () => {
      const { createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      const state = useChatStore.getState()
      expect(state.getActiveConversation()).toEqual(state.conversations[0])
    })
  })

  describe('updateConversationTitle', () => {
    it('should update conversation title', () => {
      const { createConversation, updateConversationTitle } = useChatStore.getState()

      act(() => {
        const id = createConversation()
        updateConversationTitle(id, 'My Chat')
      })

      const state = useChatStore.getState()
      expect(state.conversations[0].title).toBe('My Chat')
    })

    it('should do nothing if conversation id not found', () => {
      const { createConversation, updateConversationTitle } = useChatStore.getState()

      act(() => {
        createConversation()
        const titleBefore = useChatStore.getState().conversations[0].title
        updateConversationTitle('non-existent-id', 'New Title')
        expect(useChatStore.getState().conversations[0].title).toBe(titleBefore)
      })
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      const { clearError } = useChatStore.getState()

      act(() => {
        useChatStore.setState({ error: 'Some error' })
        clearError()
      })

      const state = useChatStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('setSelectedModel', () => {
    it('should set selected model', () => {
      const { setSelectedModel } = useChatStore.getState()

      act(() => {
        setSelectedModel('llama3.2')
      })

      const state = useChatStore.getState()
      expect(state.selectedModel).toBe('llama3.2')
    })
  })

  describe('fetchModels', () => {
    it('should fetch and set available models', async () => {
      const mockModels = [
        { name: 'llama3.2', size: 1000000 },
        { name: 'qwen2.5', size: 2000000 },
      ]
      vi.mocked(getModels).mockResolvedValueOnce(mockModels)

      const { fetchModels } = useChatStore.getState()

      await act(async () => {
        await fetchModels()
      })

      const state = useChatStore.getState()
      expect(state.availableModels).toEqual(mockModels)
      expect(state.error).toBeNull()
    })

    it('should handle fetch models error', async () => {
      vi.mocked(getModels).mockRejectedValueOnce(new Error('Failed to fetch'))

      const { fetchModels } = useChatStore.getState()

      await act(async () => {
        await fetchModels()
      })

      const state = useChatStore.getState()
      expect(state.availableModels).toEqual([])
      expect(state.error).toBe('Failed to fetch')
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(getModels).mockReturnValueOnce(pendingPromise as never)

      const { fetchModels } = useChatStore.getState()

      act(() => {
        fetchModels()
      })

      expect(useChatStore.getState().isLoading).toBe(true)

      await act(async () => {
        resolvePromise!([])
        await pendingPromise
      })

      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('sendMessage', () => {
    beforeEach(() => {
      // Reset mocks before each sendMessage test
      vi.mocked(sendMessageStream).mockReset()
    })

    it('should create new conversation if no active conversation', async () => {
      const chunks: StreamChunk[] = [
        { content: 'Hello', model: 'llama3.2', done: false },
        { content: ' world', model: 'llama3.2', done: true },
      ]

      const sseData = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('')
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage } = useChatStore.getState()

      // Verify starting state has no conversations
      expect(useChatStore.getState().conversations).toHaveLength(0)

      // Debug: Check if sendMessage completes
      let sendCompleted = false
      await act(async () => {
        await sendMessage('Hi there')
        sendCompleted = true
      })
      expect(sendCompleted).toBe(true)

      // Verify sendMessageStream was called
      expect(vi.mocked(sendMessageStream)).toHaveBeenCalled()

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.activeConversationId).toBeTruthy()
    })

    it('should add user message to conversation', async () => {
      const chunks: StreamChunk[] = [{ content: 'Response', model: 'llama3.2', done: true }]
      const sseData = `data: ${JSON.stringify(chunks[0])}\n\n`
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('Hello AI')
      })

      const state = useChatStore.getState()
      const activeConversation = state.getActiveConversation()
      const messages = activeConversation?.messages ?? []
      const userMessage = messages.find((m) => m.role === 'user')
      expect(userMessage?.content).toBe('Hello AI')
    })

    it('should stream assistant message chunks', async () => {
      const chunks: StreamChunk[] = [
        { content: 'Hello', model: 'llama3.2', done: false },
        { content: ' there', model: 'llama3.2', done: false },
        { content: '', model: 'llama3.2', done: true },
      ]

      const sseData = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('')
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('Hi')
      })

      const state = useChatStore.getState()
      const activeConversation = state.getActiveConversation()
      const messages = activeConversation?.messages ?? []
      const assistantMessage = messages.find((m) => m.role === 'assistant')
      expect(assistantMessage?.content).toBe('Hello there')
      expect(assistantMessage?.isStreaming).toBe(false)
    })

    it('should set streaming state during message sending', async () => {
      let resolveStream: (value: unknown) => void
      const streamPromise = new Promise((resolve) => {
        resolveStream = resolve
      })

      vi.mocked(sendMessageStream).mockReturnValueOnce(streamPromise as never)

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      const sendPromise = act(async () => {
        await sendMessage('Test')
      })

      // Should be streaming
      expect(useChatStore.getState().isStreaming).toBe(true)

      // Resolve and wait
      await act(async () => {
        resolveStream!({
          response: new Response(),
          streamChunks: async function* () {},
        })
        await streamPromise
      })

      // Should not be streaming anymore
      expect(useChatStore.getState().isStreaming).toBe(false)
      await sendPromise
    })

    it('should handle streaming error', async () => {
      vi.mocked(sendMessageStream).mockRejectedValueOnce(new Error('Connection failed'))

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('Test')
      })

      const state = useChatStore.getState()
      expect(state.error).toBe('Connection failed')
      expect(state.isStreaming).toBe(false)
    })

    it('should handle error chunk in stream', async () => {
      const chunks: StreamChunk[] = [
        { content: 'Partial', model: 'llama3.2', done: false },
        { content: '', model: 'llama3.2', done: true, error: 'Model not found' },
      ]

      const sseData = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('')
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('Test')
      })

      const state = useChatStore.getState()
      const activeConversation = state.getActiveConversation()
      const messages = activeConversation?.messages ?? []
      const assistantMessage = messages.find((m) => m.role === 'assistant')
      expect(assistantMessage?.error).toBe('Model not found')
      expect(state.error).toBeTruthy()
    })

    it('should update conversation title based on first user message', async () => {
      const chunks: StreamChunk[] = [{ content: 'OK', model: 'llama3.2', done: true }]
      const sseData = `data: ${JSON.stringify(chunks[0])}\n\n`
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('What is the capital of France?')
      })

      const state = useChatStore.getState()
      expect(state.conversations[0].title).toBe('What is the capital of France?')
    })

    it('should handle empty message by returning early', async () => {
      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('')
      })

      expect(vi.mocked(sendMessageStream)).not.toHaveBeenCalled()
    })

    it('should add messages to existing conversation when active', async () => {
      // First message
      const chunks1: StreamChunk[] = [{ content: 'Response 1', model: 'llama3.2', done: true }]
      const sseData1 = `data: ${JSON.stringify(chunks1[0])}\n\n`
      const mockResponse1 = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData1))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse1)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse1,
        streamChunks: async function* () {
          for await (const chunk of chunks1) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('First message')
      })

      // Second message
      const chunks2: StreamChunk[] = [{ content: 'Response 2', model: 'llama3.2', done: true }]
      const sseData2 = `data: ${JSON.stringify(chunks2[0])}\n\n`
      const mockResponse2 = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData2))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse2)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse2,
        streamChunks: async function* () {
          for await (const chunk of chunks2) {
            yield chunk
          }
        },
      })

      await act(async () => {
        await sendMessage('Second message')
      })

      const state = useChatStore.getState()
      const activeConversation = state.getActiveConversation()
      expect(activeConversation?.messages).toHaveLength(4) // 2 user, 2 assistant
    })
  })

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { reset, createConversation, setSelectedModel } = useChatStore.getState()

      act(() => {
        createConversation()
        setSelectedModel('llama3.2')
        useChatStore.setState({ error: 'Some error' })
        reset()
      })

      const state = useChatStore.getState()
      expect(state.conversations).toEqual([])
      expect(state.activeConversationId).toBeNull()
      expect(state.selectedModel).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isStreaming).toBe(false)
    })
  })

  describe('conversation history persistence', () => {
    it('should maintain message order', async () => {
      const chunks: StreamChunk[] = [
        { content: 'A', model: 'llama3.2', done: false },
        { content: 'B', model: 'llama3.2', done: false },
        { content: 'C', model: 'llama3.2', done: true },
      ]

      const sseData = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('')
      const mockResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData))
            controller.close()
          },
        })
      )

      mockFetch.mockResolvedValueOnce(mockResponse)
      vi.mocked(sendMessageStream).mockResolvedValueOnce({
        response: mockResponse,
        streamChunks: async function* () {
          for await (const chunk of chunks) {
            yield chunk
          }
        },
      })

      const { sendMessage, createConversation } = useChatStore.getState()

      act(() => {
        createConversation()
      })

      await act(async () => {
        await sendMessage('Test')
      })

      const state = useChatStore.getState()
      const activeConversation = state.getActiveConversation()
      const assistantMsg = activeConversation?.messages.find(
        (m) => m.role === 'assistant'
      )
      expect(assistantMsg?.content).toBe('ABC')
    })
  })
})
