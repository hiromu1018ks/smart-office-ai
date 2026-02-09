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

// Default mock for getActiveConversation returns null (no active conversation)
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

import { useChatStore } from '@/stores/chatStore'

describe('Chat', () => {
  const defaultStoreState = {
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mockGetActiveConversation to return null by default
    mockGetActiveConversation.mockReturnValue(null)
    // Reset useChatStore mock to default state
    vi.mocked(useChatStore).mockReturnValue(defaultStoreState)
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

  it('should show message count when active conversation exists', () => {
    mockGetActiveConversation.mockReturnValue({
      id: 'conv-1',
      title: 'Test Chat',
      messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
    })

    render(<Chat />)

    expect(screen.getByText('1 message')).toBeInTheDocument()
  })

  it('should call createConversation when new chat button is clicked', async () => {
    const user = userEvent.setup()
    render(<Chat />)

    // Find the button with aria-label "New conversation"
    const newChatButton = screen.getByLabelText('New conversation')
    await user.click(newChatButton)

    expect(mockCreateConversation).toHaveBeenCalledTimes(1)
  })

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      vi.mocked(useChatStore).mockReturnValue({
        conversations: [],
        activeConversationId: null,
        messages: [],
        streamingMessage: null,
        isStreaming: false,
        error: 'Failed to send message',
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
      })

      render(<Chat />)

      expect(screen.getByText('Failed to send message')).toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      render(<Chat />)

      // Error message should not be in the document - check for exact error text
      expect(screen.queryByText('Failed to send message')).not.toBeInTheDocument()
      expect(screen.queryByText('Some error')).not.toBeInTheDocument()
    })

    it('should change placeholder when streaming', () => {
      vi.mocked(useChatStore).mockReturnValue({
        conversations: [],
        activeConversationId: null,
        messages: [],
        streamingMessage: null,
        isStreaming: true,
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
      })

      render(<Chat />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'AI is responding...')
    })
  })

  describe('Active Conversation', () => {
    it('should display conversation title when active', () => {
      mockGetActiveConversation.mockReturnValue({
        id: 'conv-1',
        title: 'My Conversation',
        messages: [],
      })

      render(<Chat />)

      expect(screen.getByText('My Conversation')).toBeInTheDocument()
    })

    it('should display messages count', () => {
      mockGetActiveConversation.mockReturnValue({
        id: 'conv-1',
        title: 'My Conversation',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
        ],
      })

      render(<Chat />)

      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })

    it('should display "0 message" when active conversation has no messages', () => {
      mockGetActiveConversation.mockReturnValue({
        id: 'conv-1',
        title: 'My Conversation',
        messages: [],
      })

      render(<Chat />)

      expect(screen.getByText('0 message')).toBeInTheDocument()
    })

    it('should display "Start chatting with AI" only when no active conversation', () => {
      // When no active conversation (default mock)
      render(<Chat />)

      expect(screen.getByText('Start chatting with AI')).toBeInTheDocument()
    })
  })

  describe('Conversation List', () => {
    it('should display conversations when available', () => {
      vi.mocked(useChatStore).mockReturnValue({
        conversations: [
          { id: 'conv-1', title: 'Chat 1', messages: [] },
          { id: 'conv-2', title: 'Chat 2', messages: [] },
        ],
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
      })

      render(<Chat />)

      expect(screen.getByText('Chat 1')).toBeInTheDocument()
      expect(screen.getByText('Chat 2')).toBeInTheDocument()
    })

    it('should show "No messages" for conversations without messages', () => {
      vi.mocked(useChatStore).mockReturnValue({
        conversations: [{ id: 'conv-1', title: 'Empty Chat', messages: [] }],
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
      })

      render(<Chat />)

      expect(screen.getByText('No messages')).toBeInTheDocument()
    })
  })
})
