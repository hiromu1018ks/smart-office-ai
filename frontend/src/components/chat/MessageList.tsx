/**
 * MessageList Component
 *
 * Container for displaying chat messages with auto-scroll.
 */

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { cn } from "@/lib/utils";
import type { StreamingMessage } from "@/lib/types-chat";

export interface MessageListProps {
  /** Messages to display */
  messages: StreamingMessage[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Message list component with auto-scroll behavior.
 */
export function MessageList({ messages, className }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { autoScrollIfNeeded } = useAutoScroll(containerRef.current);

  // Auto-scroll when messages change
  useEffect(() => {
    autoScrollIfNeeded();
  }, [messages, autoScrollIfNeeded]);

  if (messages.length === 0) {
    return (
      <div
        className={cn("flex h-full items-center justify-center p-8", className)}
        data-testid="empty-chat-state"
      >
        <div className="text-center text-muted-foreground max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">Start a conversation</h3>
          <p className="text-base leading-relaxed">
            Ask questions, get help with tasks, or brainstorm ideas with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full flex-col gap-6 overflow-y-auto px-6 py-4", className)}
      data-testid="message-list"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
