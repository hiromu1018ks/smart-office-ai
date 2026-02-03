/**
 * Tests for Auth Store.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the auth store handles authentication state correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock localStorage BEFORE importing stores
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

vi.stubGlobal('localStorage', localStorageMock)

// Mock the API module
vi.mock('@/lib/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
  isAuthenticated: vi.fn(() => false),
}))

// Import the store after mocking
import { useAuthStore } from './authStore'
import * as api from '@/lib/api'
import type { TokenResponse } from '@/lib/types'

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('login', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'Password123',
    }

    const mockTokenResponse = {
      access_token: 'jwt-token',
      token_type: 'bearer' as const,
      expires_in: 1800,
    }

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      totp_enabled: false,
    }

    it('should successfully login and set user', async () => {
      vi.mocked(api.login).mockResolvedValue(mockTokenResponse)
      vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser)

      const state = useAuthStore.getState()

      await state.login(mockCredentials)

      // Get fresh state after async operation
      const newState = useAuthStore.getState()

      expect(api.login).toHaveBeenCalledWith(mockCredentials)
      expect(api.setToken).toHaveBeenCalledWith('jwt-token')
      expect(api.getCurrentUser).toHaveBeenCalled()
      expect(newState.user).toEqual(mockUser)
      expect(newState.token).toBe('jwt-token')
      expect(newState.isAuthenticated).toBe(true)
      expect(newState.isLoading).toBe(false)
      expect(newState.error).toBeNull()
    })

    it('should handle login failure with invalid credentials', async () => {
      const error = new Error('Invalid email or password')
      vi.mocked(api.login).mockRejectedValue(error)

      const state = useAuthStore.getState()

      await expect(state.login(mockCredentials)).rejects.toThrow('Invalid email or password')

      const newState = useAuthStore.getState()
      expect(newState.error).toBe('Invalid email or password')
      expect(newState.isLoading).toBe(false)
      expect(newState.isAuthenticated).toBe(false)
      expect(newState.user).toBeNull()
    })

    it('should handle TOTP required error', async () => {
      const totpError = new Error('TOTP code required')
      vi.mocked(api.login).mockRejectedValue(totpError)

      const state = useAuthStore.getState()

      await expect(state.login(mockCredentials)).rejects.toThrow('TOTP code required')

      const newState = useAuthStore.getState()
      expect(newState.error).toBe('TOTP code required')
      expect(newState.isLoading).toBe(false)
    })

    it('should set loading state during login', async () => {
      let resolveLogin: (value: TokenResponse) => void
      const loginPromise = new Promise<TokenResponse>((resolve) => {
        resolveLogin = resolve
      })

      const mockTokenResponse: TokenResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 1800,
      }

      vi.mocked(api.login).mockReturnValue(loginPromise)
      vi.mocked(api.getCurrentUser).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      })

      const state = useAuthStore.getState()

      // Start login (will be pending)
      const loginResult = state.login(mockCredentials)

      // Check loading state - need to get fresh state
      expect(useAuthStore.getState().isLoading).toBe(true)

      // Resolve and complete
      resolveLogin!(mockTokenResponse)
      vi.mocked(api.setToken).mockImplementation(() => {})
      await loginResult

      const newState = useAuthStore.getState()
      expect(newState.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user and token on logout', () => {
      // First set a user
      useAuthStore.setState({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          totp_enabled: false,
        },
        token: 'jwt-token',
        isAuthenticated: true,
      })

      const state = useAuthStore.getState()
      state.logout()

      const newState = useAuthStore.getState()
      expect(newState.user).toBeNull()
      expect(newState.token).toBeNull()
      expect(newState.isAuthenticated).toBe(false)
      expect(api.clearToken).toHaveBeenCalled()
    })
  })

  describe('fetchUser', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      totp_enabled: false,
    }

    it('should fetch and set user', async () => {
      vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser)

      const state = useAuthStore.getState()

      await state.fetchUser()

      const newState = useAuthStore.getState()
      expect(api.getCurrentUser).toHaveBeenCalled()
      expect(newState.user).toEqual(mockUser)
    })

    it('should handle fetch user failure', async () => {
      const error = new Error('Could not validate credentials')
      vi.mocked(api.getCurrentUser).mockRejectedValue(error)

      const state = useAuthStore.getState()

      await expect(state.fetchUser()).rejects.toThrow('Could not validate credentials')

      const newState = useAuthStore.getState()
      expect(newState.error).toBe('Could not validate credentials')
    })
  })

  describe('checkAuth', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      totp_enabled: false,
    }

    it('should fetch user when token exists', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      vi.mocked(api.getToken).mockReturnValue('valid-token')
      vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser)

      const state = useAuthStore.getState()

      await state.checkAuth()

      const newState = useAuthStore.getState()
      expect(api.getCurrentUser).toHaveBeenCalled()
      expect(newState.user).toEqual(mockUser)
      expect(newState.isAuthenticated).toBe(true)
    })

    it('should not fetch user when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      vi.mocked(api.getToken).mockReturnValue(null)

      const state = useAuthStore.getState()

      await state.checkAuth()

      const newState = useAuthStore.getState()
      expect(api.getCurrentUser).not.toHaveBeenCalled()
      expect(newState.isAuthenticated).toBe(false)
    })

    it('should clear token on fetch failure', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token')
      vi.mocked(api.getToken).mockReturnValue('invalid-token')
      vi.mocked(api.getCurrentUser).mockRejectedValue(new Error('Invalid token'))

      const state = useAuthStore.getState()

      await state.checkAuth()

      const newState = useAuthStore.getState()
      expect(api.clearToken).toHaveBeenCalled()
      expect(newState.isAuthenticated).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' })

      const state = useAuthStore.getState()
      state.clearError()

      const newState = useAuthStore.getState()
      expect(newState.error).toBeNull()
    })
  })

  describe('Persistence', () => {
    it('should persist token to localStorage', () => {
      useAuthStore.setState({ token: 'test-token' })

      // The persist middleware should have been called
      // Check that setItem was called (via customStorage)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
})
