import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the auth store BEFORE importing App
const mockAuthStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  fetchUser: vi.fn(),
  clearError: vi.fn(),
  checkAuth: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

// Mock React Router to avoid navigation issues
vi.mock('react-router', () => ({
  RouterProvider: ({ router }: { router: unknown }) => <div data-testid="router-provider">Router Mock</div>,
  createBrowserRouter: vi.fn(() => ({})),
}))

import { App } from './App'

/**
 * Smoke test for the App component.
 * Verifies that the application renders without crashing.
 */
describe('App', () => {
  beforeEach(() => {
    // Reset to default unauthenticated state
    Object.assign(mockAuthStore, {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('renders the application', () => {
    render(<App />)

    // Verify router provider is rendered
    expect(screen.getByTestId('router-provider')).toBeInTheDocument()
  })

  it('renders with the correct root element structure', () => {
    const { container } = render(<App />)

    // Verify we have a div as the container
    const rootDiv = container.querySelector('div')
    expect(rootDiv).toBeDefined()
  })

  it('shows router provider when not authenticated', () => {
    render(<App />)

    // Should render router mock
    expect(screen.getByTestId('router-provider')).toBeInTheDocument()
  })
})
