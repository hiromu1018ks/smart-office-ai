/**
 * TypeScript type definitions matching backend Pydantic schemas.
 *
 * These types mirror the backend schemas in backend/app/schemas/auth.py
 * and ensure type safety between frontend and backend communication.
 */

// ============================================================================
// Constants
// ============================================================================

/** LocalStorage key for auth state (Zustand persist) */
export const AUTH_STORAGE_KEY = 'soai-auth-state'

/** Token prefix for Authorization header */
export const TOKEN_PREFIX = 'Bearer'

/** LocalStorage key for JWT token (direct access) */
export const TOKEN_STORAGE_KEY = 'soai-token'

// ============================================================================
// User Types
// ============================================================================

/**
 * User response from backend.
 * Matches backend/app/schemas/auth.py UserResponse
 */
export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  totp_enabled: boolean
}

// ============================================================================
// Auth Request Types
// ============================================================================

/**
 * Login request payload.
 * Matches backend/app/schemas/auth.py UserLoginRequest
 */
export interface LoginRequest {
  email: string
  password: string
  totp_code?: string | null
}

/**
 * Register request payload.
 * Matches backend/app/schemas/auth.py UserCreateRequest
 */
export interface RegisterRequest {
  email: string
  username: string
  password: string
}

// ============================================================================
// Auth Response Types
// ============================================================================

/**
 * Token response from login endpoint.
 * Matches backend/app/schemas/auth.py TokenResponse
 */
export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

// ============================================================================
// TOTP Types
// ============================================================================

/**
 * TOTP setup response.
 * Matches backend/app/schemas/auth.py TOTPSetupResponse
 */
export interface TOTPSetupResponse {
  secret: string
  qr_code_uri: string
}

/**
 * TOTP enable request (Step 2 of 2FA setup).
 * Matches backend/app/schemas/auth.py TOTPEnableRequest
 */
export interface TOTPEnableRequest {
  secret: string
  code: string
}

/**
 * TOTP enable/disable response.
 * Matches backend/app/schemas/auth.py TOTPEnableResponse
 */
export interface TOTPEnableResponse {
  enabled: boolean
  message: string
}

/**
 * TOTP verify request.
 * Matches backend/app/schemas/auth.py TOTPVerifyRequest
 */
export interface TOTPVerifyRequest {
  code: string
}

/**
 * TOTP verify response.
 * Matches backend/app/schemas/auth.py TOTPVerifyResponse
 */
export interface TOTPVerifyResponse {
  verified: boolean
  message: string
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response.
 * Matches backend/app/schemas/auth.py ErrorResponse
 */
export interface ApiError {
  detail: string
  code?: string | null
}

// ============================================================================
// Auth State Types (for Zustand store)
// ============================================================================

/**
 * Authentication state structure for persistence.
 * Only token is persisted; user data is refetched on app load.
 */
export interface AuthPersistedState {
  token: string | null
}

/**
 * Full authentication state including runtime-only data.
 */
export interface AuthState extends AuthPersistedState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// ============================================================================
// API Client State
// ============================================================================

/**
 * API request state for optimistic updates.
 */
export interface ApiRequestState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}
