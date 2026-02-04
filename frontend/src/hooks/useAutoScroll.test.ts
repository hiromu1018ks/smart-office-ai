/**
 * Tests for useAutoScroll hook using TDD methodology.
 *
 * Test structure:
 * 1. Auto-scroll on new messages
 * 2. Respect user scroll position (don't auto-scroll if scrolled up)
 * 3. Scroll to bottom on manual trigger
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useAutoScroll } from './useAutoScroll'
import { cleanup } from '@testing-library/react'

// Mock container class
class MockScrollContainer {
  private _scrollTop = 0
  private _scrollHeight = 100
  private _clientHeight = 50

  get scrollTop(): number {
    return this._scrollTop
  }

  set scrollTop(value: number) {
    this._scrollTop = value
  }

  get scrollHeight(): number {
    return this._scrollHeight
  }

  set scrollHeight(value: number) {
    this._scrollHeight = value
  }

  get clientHeight(): number {
    return this._clientHeight
  }

  set clientHeight(value: number) {
    this._clientHeight = value
  }
}

describe('useAutoScroll', () => {
  let mockContainer: MockScrollContainer

  beforeEach(() => {
    // Create a mock container element
    mockContainer = new MockScrollContainer()

    // Mock IntersectionObserver
    vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('scrollToBottom', () => {
    it('should scroll container to bottom', () => {
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      act(() => {
        result.current.scrollToBottom()
      })

      expect(mockContainer.scrollTop).toBe(50) // 100 - 50
    })

    it('should handle empty container', () => {
      mockContainer.scrollHeight = 0
      mockContainer.clientHeight = 0

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      act(() => {
        result.current.scrollToBottom()
      })

      // Should not throw
      expect(mockContainer.scrollTop).toBe(0)
    })

    it('should scroll to bottom when content height changes', () => {
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      // Initial scroll
      act(() => {
        result.current.scrollToBottom()
      })
      expect(mockContainer.scrollTop).toBe(50) // 100 - 50

      // Change scrollHeight
      mockContainer.scrollHeight = 200

      act(() => {
        result.current.scrollToBottom()
      })
      expect(mockContainer.scrollTop).toBe(150) // 200 - 50
    })
  })

  describe('isNearBottom', () => {
    it('should return true when near bottom', () => {
      mockContainer.scrollTop = 45 // Near bottom (5px from bottom)
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      expect(result.current.isNearBottom()).toBe(true)
    })

    it('should return false when scrolled up', () => {
      mockContainer.scrollTop = 0 // At top
      mockContainer.scrollHeight = 200 // Taller content
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      // Distance from bottom = 200 - 50 - 0 = 150, which is > 50 threshold
      expect(result.current.isNearBottom()).toBe(false)
    })

    it('should return true when exactly at bottom', () => {
      mockContainer.scrollTop = 50 // Exactly at bottom
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      expect(result.current.isNearBottom()).toBe(true)
    })
  })

  describe('autoScrollIfNeeded', () => {
    it('should scroll to bottom when near bottom', () => {
      mockContainer.scrollTop = 45 // Near bottom
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      act(() => {
        result.current.autoScrollIfNeeded()
      })

      expect(mockContainer.scrollTop).toBe(50) // Should scroll to bottom
    })

    it('should not scroll when user has scrolled up', () => {
      mockContainer.scrollTop = 10 // Scrolled up
      mockContainer.scrollHeight = 200 // Taller content
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      act(() => {
        result.current.autoScrollIfNeeded()
      })

      expect(mockContainer.scrollTop).toBe(10) // Should stay at same position
    })

    it('should handle null container gracefully', () => {
      const { result } = renderHook(() => useAutoScroll(null))

      act(() => {
        result.current.autoScrollIfNeeded()
      })

      // Should not throw
    })
  })

  describe('edge cases', () => {
    it('should handle container with zero height', () => {
      mockContainer.clientHeight = 0

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      expect(result.current.isNearBottom()).toBe(true) // Edge case treated as "near bottom"
    })

    it('should handle container with zero scrollHeight', () => {
      mockContainer.scrollHeight = 0
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      expect(result.current.isNearBottom()).toBe(true) // Edge case treated as "near bottom"
    })

    it('should handle negative scrollTop (invalid but possible)', () => {
      mockContainer.scrollTop = -10
      mockContainer.scrollHeight = 100
      mockContainer.clientHeight = 50

      const { result } = renderHook(() => useAutoScroll(mockContainer as unknown as HTMLElement))

      expect(result.current.isNearBottom()).toBe(false)
    })
  })
})

