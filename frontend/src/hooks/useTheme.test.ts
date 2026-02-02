import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'
import { useThemeStore } from '../stores/theme'

// Mock matchMedia
const matchMediaMock = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
})

// Mock document.documentElement for class manipulation
const classListMock = {
  add: vi.fn(),
  remove: vi.fn(),
}
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: classListMock,
  },
})

describe('useTheme', () => {
  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({ theme: 'dark' })
    vi.clearAllMocks()
    // Default to light mode preference
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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial render', () => {
    it('should return current theme from store', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('dark')
    })

    it('should return resolved theme', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.resolvedTheme).toBe('dark')
    })

    it('should return setTheme function', () => {
      const { result } = renderHook(() => useTheme())

      expect(typeof result.current.setTheme).toBe('function')
    })

    it('should add dark class to document element on initial render', () => {
      renderHook(() => useTheme())

      // remove is called with both classes, then add with dark
      expect(classListMock.remove).toHaveBeenCalledWith('light', 'dark')
      expect(classListMock.add).toHaveBeenCalledWith('dark')
    })
  })

  describe('theme switching', () => {
    it('should switch to light theme', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')
    })

    it('should switch to dark theme', () => {
      // Start with light
      useThemeStore.setState({ theme: 'light' })
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should switch to system theme', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('system')
      })

      expect(result.current.theme).toBe('system')
    })

    it('should update document classes when theme changes', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      // remove is called with both classes, then add with light
      expect(classListMock.remove).toHaveBeenCalledWith('light', 'dark')
      expect(classListMock.add).toHaveBeenCalledWith('light')
    })
  })

  describe('resolvedTheme', () => {
    it('should return light when theme is light', () => {
      useThemeStore.setState({ theme: 'light' })
      const { result } = renderHook(() => useTheme())

      expect(result.current.resolvedTheme).toBe('light')
    })

    it('should return dark when theme is dark', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.resolvedTheme).toBe('dark')
    })

    it('should return dark when system theme and prefers dark', () => {
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

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('system')
      })

      expect(result.current.resolvedTheme).toBe('dark')
    })

    it('should return light when system theme and prefers light', () => {
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

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('system')
      })

      expect(result.current.resolvedTheme).toBe('light')
    })
  })
})
