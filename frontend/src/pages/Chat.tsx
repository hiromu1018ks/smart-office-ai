/**
 * Chat page component.
 *
 * Main chat interface with conversation list and message area.
 */

import { useEffect } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { cn } from "@/lib/utils";

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
  } = useChatStore();

  // Fetch available models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Create new conversation
  const handleNewChat = () => {
    createConversation();
  };

  // Send message
  const handleSendMessage = (content: string) => {
    clearError();
    sendMessage(content, activeConversationId ?? undefined);
  };

  const activeConversation = getActiveConversation();

  return (
    <div className="flex h-full flex-col gap-6" data-testid="chat-page">
      {/* Page Header - Compact */}
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-base text-muted-foreground mt-1">
          Conversate with AI and team members
        </p>
      </div>

      {/* Chat Area - Full height */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Conversations List Sidebar */}
        <BlurFade delay={100} className="hidden lg:flex w-64 flex-col flex-shrink-0">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4"
              onClick={handleNewChat}
              aria-label="New conversation"
              data-testid="new-conversation-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click &quot;New&quot; to start one</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <MagicCard
                  key={conversation.id}
                  className={cn(
                    "cursor-pointer p-4 hover:border-primary/50 transition-all",
                    activeConversationId === conversation.id && "border-primary bg-accent",
                  )}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold truncate mb-1">
                        {conversation.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conversation.messages.length > 0
                          ? `${conversation.messages.length} message${conversation.messages.length > 1 ? 's' : ''}`
                          : "No messages"}
                      </p>
                    </div>
                  </div>
                </MagicCard>
              ))
            )}
          </div>
        </BlurFade>

        {/* Main Chat Area - Full remaining width/height */}
        <BlurFade delay={200} className="flex-1 min-w-0">
          <MagicCard className="flex flex-col h-full overflow-hidden">
            {/* Chat Header - Compact */}
            <div className="border-b px-6 py-4 flex-shrink-0 bg-muted/20">
              <h3 className="text-lg font-semibold">
                {activeConversation?.title ?? "New Conversation"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeConversation
                  ? `${activeConversation.messages.length} message${activeConversation.messages.length > 1 ? 's' : ''}`
                  : "Start chatting with AI"}
              </p>
            </div>

            {/* Messages Area - Flexible */}
            <div className="flex-1 min-h-0 overflow-hidden bg-background/50">
              <MessageList messages={activeConversation?.messages ?? []} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="border-t border-destructive/20 bg-destructive/5 px-6 py-3 flex-shrink-0">
                <p className="text-sm text-destructive font-medium flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Input Area - Fixed at bottom */}
            <div className="border-t bg-muted/20 p-6 flex-shrink-0">
              <ChatInput
                onSend={handleSendMessage}
                disabled={isStreaming}
                placeholder={
                  isStreaming ? "AI is responding..." : "Type your message..."
                }
              />
            </div>
          </MagicCard>
        </BlurFade>
      </div>
    </div>
  );
}
