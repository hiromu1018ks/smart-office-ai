/**
 * Tests for Header Component.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the header displays user information correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
    clearError: vi.fn(),
    checkAuth: vi.fn(),
  })),
}))

import { Header } from './Header'
import { useAuthStore } from '@/stores/authStore'

describe('Header', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: mockLogout,
      fetchUser: vi.fn(),
      clearError: vi.fn(),
      checkAuth: vi.fn(),
    })
  })

  describe('When user is authenticated', () => {
    it('should display user name from auth store', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      }

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        token: 'valid-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: vi.fn(),
      })

      render(<Header />)

      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should display user email if no username', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'test@example.com', // Email as username
        is_active: true,
        totp_enabled: false,
      }

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        token: 'valid-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: vi.fn(),
      })

      render(<Header />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  describe('When user is not authenticated', () => {
    it('should display fallback user text', () => {
      render(<Header />)

      expect(screen.getByText(/user/i)).toBeInTheDocument()
    })
  })

  describe('Logout functionality', () => {
    it('should call logout when logout menu item is clicked', async () => {
      const user = userEvent.setup()

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      }

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        token: 'valid-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: vi.fn(),
      })

      render(<Header />)

      // Click the user menu button
      const userMenuButton = screen.getByText('testuser').closest('button')
      if (!userMenuButton) throw new Error('User menu button not found')

      await user.click(userMenuButton)

      // Click the logout option
      const logoutButton = screen.getByText(/log out/i)
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalled()
    })
  })
})
