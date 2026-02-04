/**
 * TypeScript type definitions for chat functionality.
 *
 * These types mirror the backend schemas in backend/app/schemas/ai.py
 * and ensure type safety between frontend and backend communication.
 */

// ============================================================================
// Chat Message Types
// ============================================================================

/**
 * Role of a chat message sender.
 * Matches backend/app/schemas/ai.py ChatMessage.role
 */
export type ChatRole = 'system' | 'user' | 'assistant'

/**
 * A single chat message.
 * Matches backend/app/schemas/ai.py ChatMessage
 */
export interface ChatMessage {
  role: ChatRole
  content: string
}

/**
 * Streaming message state for UI display.
 * Combines message content with streaming metadata.
 */
export interface StreamingMessage extends ChatMessage {
  id: string
  isStreaming: boolean
  error?: string | null
  timestamp: Date
}

// ============================================================================
// Chat Request Types
// ============================================================================

/**
 * Request payload for chat completion.
 * Matches backend/app/schemas/ai.py ChatRequest
 */
export interface ChatRequest {
  messages: ChatMessage[]
  model?: string | null
  temperature?: number | null
}

// ============================================================================
// Chat Response Types
// ============================================================================

/**
 * Response from blocking chat completion.
 * Matches backend/app/schemas/ai.py ChatResponse
 */
export interface ChatResponse {
  message: ChatMessage
  model: string
  done: boolean
}

/**
 * SSE stream chunk for streaming chat.
 * Matches backend/app/schemas/ai.py StreamChunk
 */
export interface StreamChunk {
  content: string
  model: string
  done: boolean
  error?: string | null
}

// ============================================================================
// Model Info Types
// ============================================================================

/**
 * Information about an available AI model.
 * Matches backend/app/schemas/ai.py ModelInfo
 */
export interface ModelInfo {
  name: string
  size: number | null
}

/**
 * Response from model list endpoint.
 */
export interface ModelsResponse {
  models: ModelInfo[]
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * AI service health check response.
 * Matches backend/app/schemas/ai.py HealthResponse
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  ollama_reachable: boolean
}

// ============================================================================
// Chat State Types (for Zustand store)
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
 * Chat store state structure.
 */
export interface ChatState {
  // State
  conversations: ChatConversation[]
  activeConversationId: string | null
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  availableModels: ModelInfo[]
  selectedModel: string | null

  // Computed (as methods to avoid stale closures in Zustand)
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
// Streaming Callback Types
// ============================================================================

/**
 * Callback for receiving streaming chunks.
 */
export type StreamCallback = (chunk: StreamChunk) => void

/**
 * Callback for streaming completion.
 */
export type StreamCompleteCallback = (fullMessage: string, error?: string | null) => void
