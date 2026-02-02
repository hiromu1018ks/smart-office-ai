import { BlurFade } from '@/components/ui/blur-fade'
import { MessageSquare, Plus, Send } from 'lucide-react'
import { MagicCard } from '@/components/ui/magic-card'
import { Button } from '@/components/ui/button'

/**
 * Chat page component (placeholder).
 */
export function Chat() {
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <button className="rounded-md border p-1 hover:bg-accent">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <MagicCard
                key={i}
                className="cursor-pointer p-3 hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Conversation {i}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Last message preview...
                    </p>
                  </div>
                </div>
              </MagicCard>
            ))}
          </div>
        </BlurFade>

        {/* Main Chat Area */}
        <BlurFade delay={200} className="flex-1">
          <MagicCard className="flex h-full flex-col">
            {/* Chat Header */}
            <div className="border-b p-4">
              <h3 className="font-semibold">New Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Start chatting with AI
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4">
              <div className="flex h-full items-center justify-center text-center">
                <div className="max-w-sm">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">
                    Start a conversation
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ask questions, get help with tasks, or brainstorm ideas
                  </p>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="icon" className="h-9 w-9">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </MagicCard>
        </BlurFade>
      </div>
    </div>
  )
}
