/**
 * Tests for Chat page using TDD methodology.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chat } from './Chat'

// Mock chatStore and useAutoScroll BEFORE import
const mockFetchModels = vi.fn()
const mockCreateConversation = vi.fn()
const mockSetActiveConversation = vi.fn()
const mockSendMessage = vi.fn()
const mockClearError = vi.fn()
const mockGetActiveConversation = vi.fn(() => null)

vi.mock('@/stores/chatStore', () => ({
  useChatStore: vi.fn(() => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    streamingMessage: null,
    isStreaming: false,
    error: null,
    selectedModel: null,
    availableModels: [],
    getActiveConversation: mockGetActiveConversation,
    createConversation: mockCreateConversation,
    setActiveConversation: mockSetActiveConversation,
    sendMessage: mockSendMessage,
    fetchModels: mockFetchModels,
    clearError: mockClearError,
    deleteConversation: vi.fn(),
    setError: vi.fn(),
    setSelectedModel: vi.fn(),
  })),
}))

vi.mock('@/hooks/useAutoScroll', () => ({
  useAutoScroll: vi.fn(() => ({ autoScrollIfNeeded: vi.fn() })),
}))

describe('Chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chat page with title', () => {
    render(<Chat />)

    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText(/Conversate with AI/)).toBeInTheDocument()
  })

  it('should render conversations section header', () => {
    render(<Chat />)

    expect(screen.getByText('Conversations')).toBeInTheDocument()
  })

  it('should show "No conversations yet" when empty', () => {
    render(<Chat />)

    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
  })

  it('should call fetchModels on mount', () => {
    render(<Chat />)

    expect(mockFetchModels).toHaveBeenCalledTimes(1)
  })

  it('should render chat input', () => {
    render(<Chat />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Type your message...')
  })

  it('should show "New Conversation" header when no active conversation', () => {
    render(<Chat />)

    expect(screen.getByText('New Conversation')).toBeInTheDocument()
  })

  it('should call createConversation when new chat button is clicked', async () => {
    const user = userEvent.setup()
    render(<Chat />)

    // Find the button with aria-label "New conversation"
    const newChatButton = screen.getByLabelText('New conversation')
    await user.click(newChatButton)

    expect(mockCreateConversation).toHaveBeenCalledTimes(1)
  })
})
