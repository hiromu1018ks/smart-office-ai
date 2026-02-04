/**
 * ChatMessage Component
 *
 * Renders a single chat message with markdown support.
 * Displays user and assistant messages with different styling.
 */

import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import { TypingIndicator } from './TypingIndicator'
import type { StreamingMessage } from '@/lib/types-chat'

export interface ChatMessageProps {
  /** The message to render */
  message: StreamingMessage
  /** Additional CSS classes */
  className?: string
  /** Whether to show timestamp */
  showTimestamp?: boolean
}

/**
 * Chat message component with markdown rendering.
 *
 * @example
 * ```tsx
 * <ChatMessage
 *   message={{
 *     id: '1',
 *     role: 'user',
 *     content: 'Hello AI',
 *     isStreaming: false,
 *     timestamp: new Date()
 *   }}
 *   showTimestamp
 * />
 * ```
 */
export function ChatMessage({ message, className, showTimestamp = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isError = message.error !== undefined && message.error !== null

  return (
    <div
      data-testid={`chat-message-${message.role}`}
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Content */}
        {message.content && !isUser && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // Security: Add rel="noopener noreferrer" to all external links
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    rel="noopener noreferrer"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* User messages don't need markdown for now */}
        {message.content && isUser && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Typing indicator for streaming assistant messages */}
        {message.isStreaming && !isUser && (
          <TypingIndicator className="text-foreground/70" />
        )}

        {/* Error message */}
        {isError && (
          <p className="mt-2 text-sm text-destructive">
            {message.error}
          </p>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <time
            dateTime={message.timestamp.toISOString()}
            className="mt-1 block text-xs opacity-70"
          >
            {format(message.timestamp, 'HH:mm')}
          </time>
        )}
      </div>
    </div>
  )
}
