/**
 * Tests for ChatMessage component using TDD methodology.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from './ChatMessage'
import type { StreamingMessage } from '@/lib/types-chat'

describe('ChatMessage', () => {
  const mockUserMessage: StreamingMessage = {
    id: '1',
    role: 'user',
    content: 'Hello AI',
    isStreaming: false,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  }

  const mockAssistantMessage: StreamingMessage = {
    id: '2',
    role: 'assistant',
    content: 'Hello! How can I help you?',
    isStreaming: false,
    timestamp: new Date('2024-01-01T00:00:01Z'),
  }

  it('should render user message', () => {
    render(<ChatMessage message={mockUserMessage} />)
    expect(screen.getByText('Hello AI')).toBeInTheDocument()
  })

  it('should render assistant message', () => {
    render(<ChatMessage message={mockAssistantMessage} />)
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument()
  })

  it('should show different styling for user vs assistant', () => {
    const { rerender } = render(<ChatMessage message={mockUserMessage} />)
    const userContainer = screen.getByTestId('chat-message-user')
    expect(userContainer).toBeInTheDocument()

    rerender(<ChatMessage message={mockAssistantMessage} />)
    const assistantContainer = screen.getByTestId('chat-message-assistant')
    expect(assistantContainer).toBeInTheDocument()
  })

  it('should render markdown content', () => {
    const markdownMessage: StreamingMessage = {
      ...mockAssistantMessage,
      content: '**Bold** and *italic* text',
    }
    render(<ChatMessage message={markdownMessage} />)
    expect(screen.getByText('Bold')).toBeInTheDocument()
    expect(screen.getByText('italic')).toBeInTheDocument()
  })

  it('should render code blocks', () => {
    const codeMessage: StreamingMessage = {
      ...mockAssistantMessage,
      content: '```javascript\nconst x = 1;\n```',
    }
    render(<ChatMessage message={codeMessage} />)
    // Check for pre/code elements
    expect(screen.getByText('const')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    // Check for language class
    const code = screen.getByText('const').closest('code')
    expect(code?.classList.contains('language-javascript') || code?.classList.contains('hljs')).toBe(true)
  })

  it('should show typing indicator when streaming', () => {
    const streamingMessage: StreamingMessage = {
      ...mockAssistantMessage,
      isStreaming: true,
      content: '',
    }
    render(<ChatMessage message={streamingMessage} />)
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('should show error message when present', () => {
    const errorMessage: StreamingMessage = {
      ...mockAssistantMessage,
      error: 'Failed to generate response',
    }
    render(<ChatMessage message={errorMessage} />)
    expect(screen.getByText(/Failed to generate response/)).toBeInTheDocument()
  })

  it('should not show typing indicator when not streaming', () => {
    render(<ChatMessage message={mockAssistantMessage} />)
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
  })

  it('should render timestamp', () => {
    render(<ChatMessage message={mockUserMessage} showTimestamp />)
    // Timestamp format includes hour:minute - check for time element
    const timeElement = screen.getByRole('time')
    expect(timeElement).toBeInTheDocument()
    expect(timeElement).toHaveAttribute('datetime', '2024-01-01T00:00:00.000Z')
  })

  it('should apply custom className', () => {
    render(<ChatMessage message={mockUserMessage} className="custom-class" />)
    const container = screen.getByTestId('chat-message-user')
    expect(container).toHaveClass('custom-class')
  })
})
