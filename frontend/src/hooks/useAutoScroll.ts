/**
 * useAutoScroll Hook
 *
 * Manages auto-scroll behavior for chat message containers.
 * Automatically scrolls to bottom when new messages arrive,
 * but respects user's scroll position (won't auto-scroll if user scrolled up).
 */

import { useCallback } from 'react'

// Distance from bottom to consider "near bottom" (in pixels)
const NEAR_BOTTOM_THRESHOLD = 50

export interface AutoScrollReturn {
  /** Scroll the container to bottom */
  scrollToBottom: () => void
  /** Check if container is near bottom */
  isNearBottom: () => boolean
  /** Scroll to bottom only if near bottom (respects user scroll position) */
  autoScrollIfNeeded: () => void
}

/**
 * Hook for auto-scroll behavior.
 *
 * @param container - The scrollable container element (can be null)
 * @returns Auto-scroll control functions
 *
 * @example
 * ```tsx
 * const messagesRef = useRef<HTMLDivElement>(null)
 * const { scrollToBottom, autoScrollIfNeeded } = useAutoScroll(messagesRef.current)
 *
 * useEffect(() => {
 *   // Scroll to bottom when messages change
 *   autoScrollIfNeeded()
 * }, [messages])
 * ```
 */
export function useAutoScroll(
  container: HTMLElement | null
): AutoScrollReturn {
  const scrollToBottom = useCallback(() => {
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight - container.clientHeight
  }, [container])

  const isNearBottom = useCallback(() => {
    if (!container) {
      return true
    }

    // Edge case: zero height container
    if (container.clientHeight === 0) {
      return true
    }

    // Edge case: zero scroll height
    if (container.scrollHeight === 0) {
      return true
    }

    const distanceFromBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop

    return distanceFromBottom <= NEAR_BOTTOM_THRESHOLD
  }, [container])

  const autoScrollIfNeeded = useCallback(() => {
    if (isNearBottom()) {
      scrollToBottom()
    }
  }, [isNearBottom, scrollToBottom])

  return {
    scrollToBottom,
    isNearBottom,
    autoScrollIfNeeded,
  }
}
