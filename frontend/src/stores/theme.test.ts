import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './theme'

// Mock matchMedia for system theme detection
const matchMediaMock = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
})

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useThemeStore.setState({ theme: 'dark' })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have default theme as dark', () => {
      // Create a fresh store instance for this test
      const { theme } = useThemeStore.getState()
      expect(theme).toBe('dark')
    })

    it('should have setTheme function', () => {
      const { setTheme } = useThemeStore.getState()
      expect(typeof setTheme).toBe('function')
    })
  })

  describe('setTheme', () => {
    it('should update theme to light', () => {
      const { setTheme } = useThemeStore.getState()

      setTheme('light')

      expect(useThemeStore.getState().theme).toBe('light')
    })

    it('should update theme to dark', () => {
      // First set to light
      const { setTheme } = useThemeStore.getState()
      setTheme('light')

      // Then set back to dark
      setTheme('dark')

      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('should update theme to system', () => {
      const { setTheme } = useThemeStore.getState()

      setTheme('system')

      expect(useThemeStore.getState().theme).toBe('system')
    })
  })

  describe('getResolvedTheme', () => {
    it('should return dark when theme is dark', () => {
      // This test runs first, checking default state
      const store = useThemeStore.getState()

      expect(store.theme).toBe('dark')
      expect(store.getResolvedTheme()).toBe('dark')
    })

    it('should return light when theme is light', () => {
      // Change to light
      const { setTheme } = useThemeStore.getState()
      setTheme('light')

      const store = useThemeStore.getState()
      expect(store.theme).toBe('light')
      expect(store.getResolvedTheme()).toBe('light')
    })

    it('should return dark when system prefers dark mode', () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
      const { setTheme } = useThemeStore.getState()
      setTheme('system')

      const store = useThemeStore.getState()

      expect(store.getResolvedTheme()).toBe('dark')
    })

    it('should return light when system prefers light mode', () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
      const { setTheme } = useThemeStore.getState()
      setTheme('system')

      const store = useThemeStore.getState()

      expect(store.getResolvedTheme()).toBe('light')
    })

    it('should update resolvedTheme when theme changes', () => {
      // Start with dark (default)
      const store = useThemeStore.getState()
      expect(store.getResolvedTheme()).toBe('dark')

      // Change to light using setTheme
      store.setTheme('light')
      expect(useThemeStore.getState().getResolvedTheme()).toBe('light')
    })
  })
})
