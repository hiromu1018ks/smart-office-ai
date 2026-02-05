/**
 * API client for backend communication.
 *
 * Provides:
 * - Axios instance with JWT authentication interceptors
 * - Auth endpoint wrappers (login, register, getCurrentUser)
 * - TOTP endpoint wrappers (setup, enable, disable, verify)
 * - Token management utilities
 */

import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  TOTPSetupResponse,
  TOTPEnableRequest,
  TOTPEnableResponse,
  TOTPVerifyRequest,
  TOTPVerifyResponse,
  ApiError,
} from './types'
import { TOKEN_STORAGE_KEY, TOKEN_PREFIX } from './types'

// ============================================================================
// Axios Instance
// ============================================================================

/**
 * Create axios instance with base configuration.
 * Uses Vite proxy in development to forward /api requests to backend.
 */
export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Add JWT token to Authorization header if available.
 */
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `${TOKEN_PREFIX} ${token}`
  }
  return config
})

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Handle 401 errors by clearing token and redirecting to login.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      clearToken()
      // Don't redirect here - let the calling code handle navigation
      // This prevents redirect loops during API calls
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// Token Management
// ============================================================================

/**
 * Save JWT token to localStorage and update axios default header.
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  api.defaults.headers.common.Authorization = `${TOKEN_PREFIX} ${token}`
}

/**
 * Retrieve JWT token from localStorage.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * Remove JWT token from localStorage and clear axios default header.
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  delete api.defaults.headers.common.Authorization
}

/**
 * Check if user is authenticated (has valid token).
 */
export function isAuthenticated(): boolean {
  const token = getToken()
  return token !== null && token !== ''
}

// ============================================================================
// Auth Endpoints
// ============================================================================

/**
 * Login with email and password.
 *
 * @param credentials - Email, password, and optional TOTP code
 * @returns Token response with access_token and expires_in
 * @throws ApiError on invalid credentials or missing TOTP
 */
export async function login(
  credentials: LoginRequest
): Promise<TokenResponse> {
  try {
    const response = await api.post<TokenResponse>(
      '/v1/auth/login',
      credentials
    )
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message = axiosError.response?.data?.detail || 'Login failed'
    throw new Error(message)
  }
}

/**
 * Register a new user.
 *
 * @param userData - Email, username, and password
 * @returns Created user data
 * @throws ApiError on validation errors or duplicate email/username
 */
export async function register(
  userData: RegisterRequest
): Promise<User> {
  try {
    const response = await api.post<User>('/v1/auth/register', userData)
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message = axiosError.response?.data?.detail || 'Registration failed'
    throw new Error(message)
  }
}

/**
 * Get current authenticated user.
 *
 * Requires valid JWT token.
 *
 * @returns Current user data
 * @throws ApiError if not authenticated
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await api.get<User>('/v1/auth/me')
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message = axiosError.response?.data?.detail || 'Failed to fetch user'
    throw new Error(message)
  }
}

// ============================================================================
// TOTP Endpoints (all require authentication)
// ============================================================================

/**
 * Setup TOTP two-factor authentication (Step 1: Generate secret).
 *
 * Returns a new TOTP secret and QR code URI.
 * The secret is NOT stored yet - user must verify they can generate codes.
 *
 * @returns TOTP secret and QR code URI
 */
export async function setupTOTP(): Promise<TOTPSetupResponse> {
  try {
    const response = await api.post<TOTPSetupResponse>('/v1/auth/2fa/setup')
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message =
      axiosError.response?.data?.detail || 'Failed to setup TOTP'
    throw new Error(message)
  }
}

/**
 * Enable TOTP two-factor authentication (Step 2: Verify and save).
 *
 * Verifies the user can generate valid TOTP codes before saving the secret.
 *
 * @param request - TOTP secret and verification code
 * @returns Enable result
 */
export async function enableTOTP(
  request: TOTPEnableRequest
): Promise<TOTPEnableResponse> {
  try {
    const response = await api.post<TOTPEnableResponse>(
      '/v1/auth/2fa/enable',
      request
    )
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message =
      axiosError.response?.data?.detail || 'Failed to enable TOTP'
    throw new Error(message)
  }
}

/**
 * Disable TOTP two-factor authentication.
 *
 * Requires a valid TOTP code to disable.
 *
 * @param request - TOTP verification code
 * @returns Disable result
 */
export async function disableTOTP(
  request: TOTPVerifyRequest
): Promise<TOTPEnableResponse> {
  try {
    const response = await api.post<TOTPEnableResponse>(
      '/v1/auth/2fa/disable',
      request
    )
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message =
      axiosError.response?.data?.detail || 'Failed to disable TOTP'
    throw new Error(message)
  }
}

/**
 * Verify a TOTP code (for checking validity without enabling).
 *
 * @param request - TOTP verification code
 * @returns Verification result
 */
export async function verifyTOTP(
  request: TOTPVerifyRequest
): Promise<TOTPVerifyResponse> {
  try {
    const response = await api.post<TOTPVerifyResponse>(
      '/v1/auth/2fa/verify',
      request
    )
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>
    const message =
      axiosError.response?.data?.detail || 'Failed to verify TOTP'
    throw new Error(message)
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is a TOTP required error (400 status).
 * Handles both AxiosError objects and error message strings.
 */
export function isTOTPRequiredError(error: unknown): boolean {
  // Handle string errors (from auth store)
  if (typeof error === 'string') {
    return error.toLowerCase().includes('totp')
  }

  // Handle Error objects with message property
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('totp')
  }

  // Handle AxiosError objects
  const axiosError = error as AxiosError<ApiError>
  return axiosError.response?.status === 400 &&
    axiosError.response?.data?.detail?.toLowerCase().includes('totp')
}

/**
 * Extract error message from API error or return default.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  if (!error) {
    return defaultMessage
  }
  const axiosError = error as AxiosError<ApiError>
  return axiosError.response?.data?.detail ||
    axiosError.message ||
    defaultMessage
}

/**
 * Check if error is an authentication/authorization error.
 */
export function isAuthError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiError>
  const status = axiosError.response?.status
  return status === 401 || status === 403
}
