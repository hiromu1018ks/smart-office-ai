/**
 * MessageList Component
 *
 * Container for displaying chat messages with auto-scroll.
 */

import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { cn } from '@/lib/utils'
import type { StreamingMessage } from '@/lib/types-chat'

export interface MessageListProps {
  /** Messages to display */
  messages: StreamingMessage[]
  /** Additional CSS classes */
  className?: string
}

/**
 * Message list component with auto-scroll behavior.
 *
 * @example
 * ```tsx
 * <MessageList
 *   messages={conversation.messages}
 *   className="flex-1 overflow-y-auto"
 * />
 * ```
 */
export function MessageList({ messages, className }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { autoScrollIfNeeded } = useAutoScroll(containerRef.current)

  // Auto-scroll when messages change
  useEffect(() => {
    autoScrollIfNeeded()
  }, [messages, autoScrollIfNeeded])

  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} data-testid="empty-chat-state">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="mt-2 text-sm">Ask questions, get help with tasks, or brainstorm ideas</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col gap-4 overflow-y-auto', className)}
      data-testid="message-list"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
}
