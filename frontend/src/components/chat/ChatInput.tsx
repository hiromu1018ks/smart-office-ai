/**
 * ChatInput Component
 *
 * Input field for sending chat messages with auto-resize textarea.
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Constants for textarea auto-resize calculation
const LINE_HEIGHT_PX = 24

export interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (content: string) => void
  /** Whether input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Minimum rows */
  minRows?: number
  /** Maximum rows */
  maxRows?: number
}

/**
 * Chat input component with auto-resize textarea.
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(content) => sendMessage(content)}
 *   disabled={isStreaming}
 *   placeholder="Type your message..."
 * />
 * ```
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  className,
  minRows = 1,
  maxRows = 5,
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.min(
      Math.max(scrollHeight, minRows * LINE_HEIGHT_PX),
      maxRows * LINE_HEIGHT_PX
    )
    textarea.style.height = `${newHeight}px`
  }, [content, minRows, maxRows])

  const handleSend = () => {
    const trimmed = content.trim()
    if (trimmed && !disabled) {
      onSend(trimmed)
      setContent('')

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <textarea
        ref={textareaRef}
        data-testid="chat-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        style={{ maxHeight: `${maxRows * LINE_HEIGHT_PX}px` }}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !content.trim()}
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label="Send message"
        data-testid="send-button"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
