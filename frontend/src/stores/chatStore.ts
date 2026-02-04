/**
 * Chat store using Zustand.
 *
 * Manages chat state including:
 * - Conversations with messages
 * - Active conversation tracking
 * - Streaming message state
 * - Model selection
 * - Loading and error states
 */

import { create } from 'zustand'
import type { ChatMessage, StreamingMessage, ModelInfo } from '@/lib/types-chat'
import { sendMessageStream, getModels } from '@/lib/chat-api'

// ============================================================================
// Types
// ============================================================================

/**
 * Chat conversation state.
 */
export interface ChatConversation {
  id: string
  title: string
  messages: StreamingMessage[]
  createdAt: Date
  updatedAt: Date
  model?: string | null
}

/**
 * Internal state (without computed properties).
 */
interface ChatStateInternal {
  conversations: ChatConversation[]
  activeConversationId: string | null
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  availableModels: ModelInfo[]
  selectedModel: string | null
}

/**
 * Chat store state structure with computed getter.
 */
export interface ChatState extends ChatStateInternal {
  // Computed - use as a function
  getActiveConversation: () => ChatConversation | null

  // Actions
  sendMessage: (content: string, conversationId?: string) => Promise<void>
  createConversation: () => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void
  updateConversationTitle: (id: string, title: string) => void
  clearError: () => void
  fetchModels: () => Promise<void>
  setSelectedModel: (model: string) => void
  reset: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for messages and conversations.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new streaming message.
 */
function createStreamingMessage(
  role: 'user' | 'assistant',
  content: string
): StreamingMessage {
  return {
    id: generateId(),
    role,
    content,
    isStreaming: role === 'assistant',
    timestamp: new Date(),
  }
}

/**
 * Truncate text to a maximum length for titles.
 */
function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ChatStateInternal = {
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  isStreaming: false,
  error: null,
  availableModels: [],
  selectedModel: null,
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  ...initialState,

  // Computed getter function
  getActiveConversation: () => {
    const state = get()
    return state.conversations.find((c) => c.id === state.activeConversationId) ?? null
  },

  // Create a new conversation
  createConversation: () => {
    const id = generateId()
    const newConversation: ChatConversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    set({
      conversations: [...get().conversations, newConversation],
      activeConversationId: id,
      error: null,
    })

    return id
  },

  // Delete a conversation
  deleteConversation: (id: string) => {
    const { conversations, activeConversationId } = get()
    const newConversations = conversations.filter((c) => c.id !== id)

    set({
      conversations: newConversations,
      // If we deleted the active conversation, select another or clear
      activeConversationId:
        activeConversationId === id
          ? newConversations.length > 0
            ? newConversations[0].id
            : null
          : activeConversationId,
    })
  },

  // Set active conversation
  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id })
  },

  // Update conversation title
  updateConversationTitle: (id: string, title: string) => {
    const { conversations } = get()
    const newConversations = conversations.map((c) =>
      c.id === id ? { ...c, title, updatedAt: new Date() } : c
    )

    set({ conversations: newConversations })
  },

  // Clear error state
  clearError: () => {
    set({ error: null })
  },

  // Set selected model
  setSelectedModel: (model: string) => {
    set({ selectedModel: model })
  },

  // Fetch available models
  fetchModels: async () => {
    set({ isLoading: true, error: null })

    try {
      const models = await getModels()
      set({ availableModels: models, isLoading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models'
      set({ isLoading: false, error: errorMessage, availableModels: [] })
    }
  },

  // Send a message
  sendMessage: async (content: string, conversationId?: string) => {
    // Don't send empty messages
    if (!content.trim()) {
      return
    }

    const state = get()
    const { conversations, selectedModel, isStreaming } = state

    // Don't allow sending while already streaming
    if (isStreaming) {
      return
    }

    set({ error: null, isStreaming: true })

    try {
      // Get or create conversation
      let activeId = conversationId ?? state.activeConversationId
      let targetConversation = conversations.find((c) => c.id === activeId)

      // Create new conversation if none exists
      if (!targetConversation) {
        activeId = get().createConversation()
        targetConversation = get().conversations.find((c) => c.id === activeId)!
      }

      // Create user message
      const userMessage = createStreamingMessage('user', content)

      // Create assistant message (empty initially)
      const assistantMessage = createStreamingMessage('assistant', '')

      // Update conversation with messages
      const updatedConversation: ChatConversation = {
        ...targetConversation,
        messages: [...targetConversation.messages, userMessage, assistantMessage],
        updatedAt: new Date(),
        // Update title based on first user message
        title:
          targetConversation.messages.length === 0
            ? truncateText(content)
            : targetConversation.title,
      }

      // Use get().conversations to get latest state after createConversation
      set({
        conversations: get().conversations.map((c) =>
          c.id === activeId ? updatedConversation : c
        ),
      })

      // Prepare message history for API
      const messageHistory: ChatMessage[] = updatedConversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Send message to API
      const result = await sendMessageStream(
        messageHistory,
        selectedModel,
        undefined
      )

      // Stream response chunks
      let fullContent = ''
      let streamError: string | null = null

      for await (const chunk of result.streamChunks()) {
        // Check for error in chunk
        if (chunk.error) {
          streamError = chunk.error
        }

        fullContent += chunk.content

        // Update assistant message with new content
        const currentState = get()
        const currentConv = currentState.conversations.find((c) => c.id === activeId)
        if (currentConv) {
          const updatedMessages = currentConv.messages.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: fullContent,
                  isStreaming: !chunk.done,
                  error: streamError,
                }
              : m
          )

          set({
            conversations: currentState.conversations.map((c) =>
              c.id === activeId ? { ...c, messages: updatedMessages } : c
            ),
          })
        }

        if (chunk.done) {
          break
        }
      }

      // Set final streaming state
      const finalState = get()
      const finalConv = finalState.conversations.find((c) => c.id === activeId)
      if (finalConv) {
        const finalMessages = finalConv.messages.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, isStreaming: false, error: streamError }
            : m
        )

        set({
          conversations: finalState.conversations.map((c) =>
            c.id === activeId ? { ...c, messages: finalMessages } : c
          ),
          isStreaming: false,
          error: streamError,
        })
      } else {
        set({ isStreaming: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      set({ error: errorMessage, isStreaming: false })
    }
  },

  // Reset store to initial state
  reset: () => {
    set(initialState)
  },
}))

// ============================================================================
// Selector Helpers
// ============================================================================

/**
 * Selector for active conversation.
 * Use this instead of directly accessing state.activeConversation
 */
export function selectActiveConversation(state: ChatState): ChatConversation | null {
  return state.conversations.find((c) => c.id === state.activeConversationId) ?? null
}
