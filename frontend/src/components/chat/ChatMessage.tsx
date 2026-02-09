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
          'max-w-[85%] rounded-2xl px-6 py-4',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Content */}
        {message.content && !isUser && (
          <div className="prose prose-lg dark:prose-invert max-w-none">
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
                    className="text-primary hover:underline"
                    {...props}
                  >
                    {children}
                  </a>
                ),
                // Style code blocks
                code: ({ className, children, ...props }) => (
                  <code
                    className={cn(
                      'px-2 py-1 rounded-md bg-background/50 font-mono text-sm',
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre
                    className={cn(
                      'px-4 py-3 rounded-lg bg-background/80 overflow-x-auto',
                      'border border-border'
                    )}
                    {...props}
                  >
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* User messages don't need markdown for now */}
        {message.content && isUser && (
          <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{message.content}</p>
        )}

        {/* Typing indicator for streaming assistant messages */}
        {message.isStreaming && !isUser && (
          <div className="mt-2">
            <TypingIndicator className="text-foreground/70" />
          </div>
        )}

        {/* Error message */}
        {isError && (
          <p className="mt-3 text-base text-destructive font-medium">
            {message.error}
          </p>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <time
            dateTime={message.timestamp.toISOString()}
            className="mt-2 block text-sm opacity-70"
          >
            {format(message.timestamp, 'HH:mm')}
          </time>
        )}
      </div>
    </div>
  )
}
