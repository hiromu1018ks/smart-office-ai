/**
 * Tests for MessageList component using TDD methodology.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from './MessageList'
import type { StreamingMessage } from '@/lib/types-chat'

// Mock useAutoScroll BEFORE import
vi.mock('@/hooks/useAutoScroll', () => ({
  useAutoScroll: vi.fn(() => ({ autoScrollIfNeeded: vi.fn() })),
}))

// Helper function to create mock messages with required properties
type MockMessageOverrides = Partial<Pick<StreamingMessage, 'content' | 'error'>> & {
  role: StreamingMessage['role']
}

function createMockMessage(
  overrides: MockMessageOverrides,
  isStreaming: boolean = false
): StreamingMessage {
  return {
    id: Math.random().toString(),
    timestamp: new Date('2024-01-01T00:00:00Z'),
    role: overrides.role,
    content: overrides.content ?? '',
    isStreaming,
    error: overrides.error,
  }
}

describe('MessageList', () => {
  const mockMessages: StreamingMessage[] = [
    createMockMessage({ role: 'user', content: 'Hello AI' }),
    createMockMessage({ role: 'assistant', content: 'Hello! How can I help you?' }),
  ]

  it('should render empty state when no messages', () => {
    render(<MessageList messages={[]} />)

    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
    expect(screen.getByText(/Ask questions, get help with tasks/)).toBeInTheDocument()
  })

  it('should render all messages', () => {
    render(<MessageList messages={mockMessages} />)

    expect(screen.getByText('Hello AI')).toBeInTheDocument()
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument()
  })

  it('should render messages in correct order', () => {
    const { container } = render(<MessageList messages={mockMessages} />)

    const messages = container.querySelectorAll('[data-testid^="chat-message-"]')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toHaveAttribute('data-testid', 'chat-message-user')
    expect(messages[1]).toHaveAttribute('data-testid', 'chat-message-assistant')
  })

  it('should apply custom className', () => {
    const { container } = render(<MessageList messages={mockMessages} className="h-full" />)

    expect(container.firstChild).toHaveClass('h-full')
  })

  it('should show streaming indicator for streaming messages', () => {
    const streamingMessages: StreamingMessage[] = [
      createMockMessage({ role: 'user', content: 'Hello' }),
      createMockMessage({ role: 'assistant', content: '' }, true),
    ]

    render(<MessageList messages={streamingMessages} />)

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('should show partial content for streaming message', () => {
    const streamingMessages: StreamingMessage[] = [
      createMockMessage({ role: 'assistant', content: 'Hello' }, true),
    ]

    render(<MessageList messages={streamingMessages} />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should render multiple streaming messages', () => {
    const streamingMessages: StreamingMessage[] = [
      createMockMessage({ role: 'user', content: 'Question 1' }),
      createMockMessage({ role: 'assistant', content: 'Answer 1' }),
      createMockMessage({ role: 'user', content: 'Question 2' }),
      createMockMessage({ role: 'assistant', content: '' }, true),
    ]

    render(<MessageList messages={streamingMessages} />)

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Answer 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('should render error message when present', () => {
    const errorMessages: StreamingMessage[] = [
      createMockMessage({ role: 'user', content: 'Hello' }),
      createMockMessage(
        {
          role: 'assistant',
          content: '',
          error: 'Failed to generate response',
        },
        false
      ),
    ]

    render(<MessageList messages={errorMessages} />)

    expect(screen.getByText(/Failed to generate response/)).toBeInTheDocument()
  })

  it('should handle system messages', () => {
    const systemMessages: StreamingMessage[] = [
      createMockMessage({ role: 'system', content: 'Conversation started' }),
    ]

    render(<MessageList messages={systemMessages} />)

    expect(screen.getByText('Conversation started')).toBeInTheDocument()
  })

  it('should render markdown in assistant messages', () => {
    const markdownMessages: StreamingMessage[] = [
      createMockMessage({ role: 'assistant', content: '**Bold** and *italic*' }),
    ]

    render(<MessageList messages={markdownMessages} />)

    expect(screen.getByText('Bold')).toBeInTheDocument()
    expect(screen.getByText('italic')).toBeInTheDocument()
  })

  it('should render code blocks correctly', () => {
    const codeMessages: StreamingMessage[] = [
      createMockMessage({ role: 'assistant', content: '```js\nconsole.log("Hello");\n```' }),
    ]

    render(<MessageList messages={codeMessages} />)

    // Check for code elements with syntax highlighting
    const codeElement = screen.getByText(/console/)
    expect(codeElement).toBeInTheDocument()
  })
})
