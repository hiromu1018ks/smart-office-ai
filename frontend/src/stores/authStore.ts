/**
 * Authentication store using Zustand.
 *
 * Manages user authentication state including:
 * - Current user data
 * - JWT token
 * - Authentication status
 * - Loading and error states
 *
 * Persists token to localStorage for session recovery.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, TokenResponse } from '@/lib/types'
import * as api from '@/lib/api'

/**
 * Auth store state structure.
 */
interface AuthState {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<User>
  clearError: () => void
  checkAuth: () => Promise<void>
}

/**
 * Custom storage adapter that works with tests.
 */
const customStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
}

/**
 * Auth store with persist middleware.
 * Only token is persisted; user data is refetched on app load.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })

        try {
          // Call login API
          const response: TokenResponse = await api.login(credentials)

          // Save token
          api.setToken(response.access_token)

          // Fetch user data
          const user = await api.getCurrentUser()

          set({
            user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          })
          throw error
        }
      },

      // Logout action
      logout: () => {
        api.clearToken()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      // Fetch current user
      fetchUser: async () => {
        set({ isLoading: true, error: null })

        try {
          const user = await api.getCurrentUser()
          set({ user, isLoading: false })
          return user
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user'
          set({ isLoading: false, error: errorMessage })
          throw error
        }
      },

      // Clear error action
      clearError: () => {
        set({ error: null })
      },

      // Check authentication status (called on app load)
      checkAuth: async () => {
        const token = api.getToken()

        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
          return
        }

        set({ isLoading: true })

        try {
          const user = await api.getCurrentUser()
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          // Token is invalid, clear it
          api.clearToken()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'soai-auth-state',
      // Only persist token, not runtime state
      partialize: (state) => ({ token: state.token }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage: customStorage as any,
    }
  )
)
