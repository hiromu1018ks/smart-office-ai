/**
 * TypingIndicator Component
 *
 * Animated indicator shown while AI is streaming a response.
 * Displays three bouncing dots.
 */

import { cn } from '@/lib/utils'

export interface TypingIndicatorProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Typing indicator component with animated dots.
 *
 * @example
 * ```tsx
 * <TypingIndicator className="mb-4" />
 * ```
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      data-testid="typing-indicator"
      aria-label="AI is typing"
      className={cn('flex items-center gap-1 py-2', className)}
    >
      <span
        data-testid="typing-dot-1"
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: '0ms' }}
      />
      <span
        data-testid="typing-dot-2"
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: '150ms' }}
      />
      <span
        data-testid="typing-dot-3"
        className="h-2 w-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}
