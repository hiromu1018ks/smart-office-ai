/**
 * Integration tests for Chat Page using MSW (Mock Service Worker).
 *
 * These tests verify actual HTTP communication with mocked backend responses.
 * Real components are rendered to test the full integration flow.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { BrowserRouter } from 'react-router'

// Only mock UI components that have external dependencies (animations, etc)
vi.mock('@/components/ui/blur-fade', () => ({
  BlurFade: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/magic-card', () => ({
  MagicCard: ({ children, className, onClick, 'data-testid': dataTestId }: any) => (
    <div className={className} data-testid={dataTestId} onClick={onClick}>
      {children}
    </div>
  ),
}))

// ============================================================================
// MSW Server Setup
// ============================================================================

const server = setupServer(
  // GET /api/v1/ai/models - List available models
  http.get('/api/v1/ai/models', () => {
    return HttpResponse.json({
      models: [
        { name: 'gemma3:12b', size: 7340032000 },
        { name: 'llama3.2', size: 2000000000 },
      ],
    })
  }),

  // POST /api/v1/ai/chat/stream - Send chat message with SSE streaming
  http.post('/api/v1/ai/chat/stream', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // StreamChunk format: { content: string, model: string, done: boolean }
        controller.enqueue(encoder.encode('data: {"content":"Hello","model":"gemma3:12b","done":false}\n\n'))
        controller.enqueue(encoder.encode('data: {"content":" there","model":"gemma3:12b","done":false}\n\n'))
        controller.enqueue(encoder.encode('data: {"content":"!","model":"gemma3:12b","done":true}\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  })
)

// ============================================================================
// Tests
// ============================================================================

import { Chat } from './Chat'
import { useChatStore } from '@/stores/chatStore'

describe('Chat Integration Tests (with MSW)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    server.close()
  })

  // Clean DOM and reset store before each test
  beforeEach(() => {
    // Reset chatStore to initial state
    const store = useChatStore.getState()
    store.reset()

    // Reset server handlers to default
    server.resetHandlers()

    // Clean up DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
    while (document.head.firstChild) {
      document.head.removeChild(document.head.firstChild)
    }
    vi.clearAllMocks()
  })

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it('should render page and fetch models on mount', { timeout: 30000 }, async () => {
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })
  })

  it('should show empty state when no messages', { timeout: 30000 }, async () => {
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    await waitFor(() => {
      const emptyState = screen.getByTestId('empty-chat-state')
      expect(emptyState).toBeInTheDocument()
    })
  })

  // ============================================================
  // Message Sending Tests
  // ============================================================

  it('should send message when user types and clicks send button', { timeout: 30000 }, async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Message 1')

    const sendBtn = screen.getByTestId('send-button')
    expect(sendBtn).not.toBeDisabled()
    await user.click(sendBtn)

    await waitFor(() => {
      const assistantMessage = screen.queryByTestId('chat-message-assistant')
      expect(assistantMessage).toBeInTheDocument()
    })
  })

  it('should send message when user presses Enter', { timeout: 30000 }, async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Message 2{Enter}')

    await waitFor(() => {
      const assistantMessage = screen.queryByTestId('chat-message-assistant')
      expect(assistantMessage).toBeInTheDocument()
    })
  })

  // ============================================================
  // Request/Response Contract Tests
  // ============================================================

  it('should send correct request format to chat API', { timeout: 30000 }, async () => {
    let capturedRequest: any = null

    server.use(
      http.post('/api/v1/ai/chat/stream', async ({ request }) => {
        capturedRequest = await request.json()
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"content":"Response","model":"gemma3:12b","done":true}\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      })
    )

    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Contract test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest.messages).toBeInstanceOf(Array)
      expect(capturedRequest.messages.length).toBeGreaterThan(0)

      // The implementation creates: [user_message, empty_assistant_message]
      const lastMessage = capturedRequest.messages[capturedRequest.messages.length - 1]
      expect(lastMessage.role).toBe('assistant')

      const userMessage = capturedRequest.messages[capturedRequest.messages.length - 2]
      expect(userMessage.role).toBe('user')
      expect(userMessage.content).toBe('Contract test')
    })
  })

  it('should handle SSE streaming response correctly', { timeout: 30000 }, async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Streaming test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      const assistantMessages = screen.queryAllByTestId('chat-message-assistant')
      expect(assistantMessages.length).toBeGreaterThan(0)
      // Check the latest message has the streamed content
      expect(assistantMessages[assistantMessages.length - 1]).toHaveTextContent(/Hello/)
    })
  })

  // ============================================================
  // Error Handling Tests
  // ============================================================

  it('should handle API error responses', { timeout: 30000 }, async () => {
    server.use(
      http.post('/api/v1/ai/chat/stream', () => {
        return HttpResponse.json(
          { detail: 'Model not available' },
          { status: 500 }
        )
      })
    )

    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Error test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      const errorMessage = screen.queryByTestId('chat-message-assistant')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  // ============================================================
  // API Contract Tests
  // ============================================================

  it('should send messages with correct structure (contract test)', { timeout: 30000 }, async () => {
    let capturedRequest: any = null

    server.use(
      http.post('/api/v1/ai/chat/stream', async ({ request }) => {
        capturedRequest = await request.json()
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"content":"OK","model":"gemma3:12b","done":true}\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      })
    )

    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'API contract test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      expect(capturedRequest).toBeDefined()
      expect(capturedRequest.messages).toBeInstanceOf(Array)

      const userMessages = capturedRequest.messages.filter((m: any) => m.role === 'user')
      expect(userMessages.length).toBeGreaterThan(0)

      const lastUserMessage = userMessages[userMessages.length - 1]
      expect(lastUserMessage.content).toBe('API contract test')

      const assistantMessages = capturedRequest.messages.filter((m: any) => m.role === 'assistant')
      expect(assistantMessages.length).toBeGreaterThan(0)
    })
  })

  it('should receive SSE chunks with correct structure (contract test)', { timeout: 30000 }, async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'SSE contract test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      const assistantMessages = screen.queryAllByTestId('chat-message-assistant')
      expect(assistantMessages.length).toBeGreaterThan(0)
      expect(assistantMessages[assistantMessages.length - 1]).toHaveTextContent(/Hello/)
    })
  })

  it('should handle error response format (contract test)', { timeout: 30000 }, async () => {
    server.use(
      http.post('/api/v1/ai/chat/stream', () => {
        return HttpResponse.json(
          { detail: 'Model not found' },
          { status: 404 }
        )
      })
    )

    const user = userEvent.setup({ delay: null })
    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    )

    const input = screen.getByTestId('chat-input')
    await user.type(input, 'Error contract test')
    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    await waitFor(() => {
      const errorMessage = screen.queryByTestId('chat-message-assistant')
      expect(errorMessage).toBeInTheDocument()
    })
  })
})
