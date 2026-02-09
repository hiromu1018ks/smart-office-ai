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
const LINE_HEIGHT_PX = 28

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
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  className,
  minRows = 3,
  maxRows = 10,
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
    <div className={cn('flex gap-4 items-end', className)}>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={minRows}
          className="w-full resize-none rounded-xl border-2 border-input bg-muted/50 px-5 py-4 text-lg focus:border-primary focus:bg-background focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors placeholder:text-muted-foreground/60"
          style={{ maxHeight: `${maxRows * LINE_HEIGHT_PX}px` }}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !content.trim()}
        size="lg"
        className="h-14 px-6 shrink-0 text-base font-medium"
        aria-label="Send message"
        data-testid="send-button"
      >
        <Send className="h-5 w-5 mr-2" />
        Send
      </Button>
    </div>
  )
}
