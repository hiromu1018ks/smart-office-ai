/**
 * Tests for Login Page Component.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the login page handles user input, validation,
 * and authentication flow correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'

// Mock the API module BEFORE importing Login
vi.mock('@/lib/api', () => ({
  login: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
  isTOTPRequiredError: vi.fn((error: unknown) => {
    // Handle string errors (from auth store)
    if (typeof error === 'string') {
      return error.toLowerCase().includes('totp')
    }
    return false
  }),
}))

// Mock useNavigate
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
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

import { Login } from './Login'
import { useAuthStore } from '@/stores/authStore'

// Wrapper with router
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Login Page', () => {
  const mockLogin = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      fetchUser: vi.fn(),
      clearError: mockClearError,
      checkAuth: vi.fn(),
    })
  })

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      render(<Login />, { wrapper })

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })



    it('should render forgot password link', () => {
      render(<Login />, { wrapper })

      const link = screen.getByText(/forgot password/i)
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/forgot-password')
    })

    it('should render sign up link', () => {
      render(<Login />, { wrapper })

      const link = screen.getByText(/sign up/i)
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/register')
    })

    it('should render welcome message', () => {
      render(<Login />, { wrapper })

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require email field', async () => {
      const user = userEvent.setup()
      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Submit with empty email
      await user.clear(emailInput)
      await user.click(submitButton)

      // HTML5 validation should prevent submit
      expect(emailInput).toBeInvalid()
    })

    it('should require password field', async () => {
      const user = userEvent.setup()
      render(<Login />, { wrapper })

      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Submit with empty password
      await user.clear(passwordInput)
      await user.click(submitButton)

      // HTML5 validation should prevent submit
      expect(passwordInput).toBeInvalid()
    })

    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)

      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should reject invalid email format', async () => {
      const user = userEvent.setup()
      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'not-an-email')
      await user.click(submitButton)

      // HTML5 validation should catch this
      expect(emailInput).toBeInvalid()
    })
  })

  describe('Login Flow', () => {
    it('should call authStore.login on form submit', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
          totp_code: undefined,
        })
      })
    })

    it('should show loading state during login', async () => {
      const user = userEvent.setup()
      let resolveLogin: () => void
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve
      })

      mockLogin.mockReturnValue(loginPromise)

      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: mockClearError,
        checkAuth: vi.fn(),
      })

      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      // Use a more flexible selector - match either "Sign in" or "Signing in..."
      const submitButton = screen.getByRole('button', { name: /signing in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.click(submitButton)

      // Button should be disabled during loading
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      resolveLogin!()
      await loginPromise
    })

    it('should clear previous errors on form submit', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Previous error',
        login: mockLogin,
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: mockClearError,
        checkAuth: vi.fn(),
      })

      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled()
      })
    })
  })

  describe('TOTP Support', () => {
    it('should show TOTP input when TOTP is required', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'TOTP code required',
        login: mockLogin,
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: mockClearError,
        checkAuth: vi.fn(),
      })

      render(<Login />, { wrapper })

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/123456/i)).toBeInTheDocument()
    })

    it('should include TOTP code in login request when provided', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'TOTP code required',
        login: mockLogin,
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: mockClearError,
        checkAuth: vi.fn(),
      })

      render(<Login />, { wrapper })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const totpInput = screen.getByPlaceholderText(/123456/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(totpInput, '123456')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
          totp_code: '123456',
        })
      })
    })
  })

  describe('Error Display', () => {
    it('should display error message from auth store', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Invalid email or password',
        login: mockLogin,
        logout: vi.fn(),
        fetchUser: vi.fn(),
        clearError: mockClearError,
        checkAuth: vi.fn(),
      })

      render(<Login />, { wrapper })

      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })

    it('should not display error when error is null', () => {
      render(<Login />, { wrapper })

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })


})
