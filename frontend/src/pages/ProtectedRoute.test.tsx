/**
 * Tests for ProtectedRoute Component.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the protected route handles authentication correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'

// Mock the auth store BEFORE importing ProtectedRoute
const mockCheckAuth = vi.fn()
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
    checkAuth: mockCheckAuth,
  })),
}))

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

import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset localStorage mock (from setup.ts)
    const lsGetItem = globalThis.localStorage?.getItem as ReturnType<typeof vi.fn>
    if (lsGetItem) {
      lsGetItem.mockReturnValue(null)
    }

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

    it('should show loading when token exists in storage but not yet verified', () => {
      // Simulate token in localStorage (page reload scenario)
      const lsGetItem = globalThis.localStorage?.getItem as ReturnType<typeof vi.fn>
      if (lsGetItem) {
        lsGetItem.mockReturnValue('valid-token')
      }

      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: 'valid-token',
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

      // Should show loading while checkAuth completes
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
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
