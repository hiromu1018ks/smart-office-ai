/**
 * Chat page component.
 *
 * Main chat interface with conversation list and message area.
 */

import { useEffect } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { cn } from '@/lib/utils'

/**
 * Chat page with conversation list and message area.
 */
export function Chat() {
  const {
    conversations,
    activeConversationId,
    getActiveConversation,
    createConversation,
    setActiveConversation,
    sendMessage,
    fetchModels,
    isStreaming,
    error,
    clearError,
  } = useChatStore()

  // Fetch available models on mount
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Create new conversation
  const handleNewChat = () => {
    createConversation()
  }

  // Send message
  const handleSendMessage = (content: string) => {
    clearError()
    sendMessage(content, activeConversationId ?? undefined)
  }

  const activeConversation = getActiveConversation()

  return (
    <div className="flex h-full flex-col">
      <BlurFade>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-2 text-muted-foreground">
            Conversate with AI and team members
          </p>
        </div>
      </BlurFade>

      {/* Chat Area */}
      <div className="flex flex-1 gap-4">
        {/* Conversations List */}
        <BlurFade delay={100} className="hidden w-64 flex-col lg:flex">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewChat}
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              conversations.map((conversation) => (
                <MagicCard
                  key={conversation.id}
                  className={cn(
                    'cursor-pointer p-3 hover:bg-accent/50',
                    activeConversationId === conversation.id && 'bg-accent'
                  )}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.messages.length > 0
                          ? `${conversation.messages.length} messages`
                          : 'No messages'}
                      </p>
                    </div>
                  </div>
                </MagicCard>
              ))
            )}
          </div>
        </BlurFade>

        {/* Main Chat Area */}
        <BlurFade delay={200} className="flex flex-1">
          <MagicCard className="flex h-full flex-col">
            {/* Chat Header */}
            <div className="border-b p-4">
              <h3 className="font-semibold">
                {activeConversation?.title ?? 'New Conversation'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeConversation
                  ? `${activeConversation.messages.length} messages`
                  : 'Start chatting with AI'}
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4">
              <MessageList
                messages={activeConversation?.messages ?? []}
                className="h-full"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="border-t px-4 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t p-4">
              <ChatInput
                onSend={handleSendMessage}
                disabled={isStreaming}
                placeholder={isStreaming ? 'AI is responding...' : 'Type your message...'}
              />
            </div>
          </MagicCard>
        </BlurFade>
      </div>
    </div>
  )
}
