/**
 * Tests for ProtectedRoute Component.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the protected route handles authentication correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to}>
        Redirected to {to}
      </div>
    ),
  }
})

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

import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

describe('ProtectedRoute', () => {
  const mockCheckAuth = vi.fn()

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
      logout: vi.fn(),
      fetchUser: vi.fn(),
      clearError: vi.fn(),
      checkAuth: mockCheckAuth,
    })
  })

  describe('When authenticated', () => {
    it('should render children when user is authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          totp_enabled: false,
        },
        token: 'valid-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: mockCheckAuth,
      })

      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
    })
  })

  describe('When not authenticated', () => {
    it('should redirect to login when user is not authenticated', () => {
      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('navigate')).toBeInTheDocument()
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login')
    })

    it('should redirect to login when authentication is unknown (isLoading false)', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: mockCheckAuth,
      })

      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('navigate')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading indicator while checking authentication', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: vi.fn(),
        checkAuth: mockCheckAuth,
      })

      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('checkAuth initialization', () => {
    it('should call checkAuth on mount', () => {
      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      )

      expect(mockCheckAuth).toHaveBeenCalled()
    })
  })
})
