import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  Folder,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router'

/**
 * Dashboard page component.
 * Shows overview cards and quick actions.
 *
 * TODO: Make stats dynamic via props or API
 * Currently hardcoded for placeholder UI
 * Issue: Tests verify hardcoded values that won't match real data
 *
 * @see Dashboard.test.tsx for data contract tests
 */
export function Dashboard() {
  const stats = [
    {
      title: 'Messages',
      value: '24',
      change: '+12%',
      icon: MessageSquare,
      color: 'text-blue-500',
      href: '/chat',
    },
    {
      title: 'Tasks',
      value: '8',
      change: '3 pending',
      icon: CheckSquare,
      color: 'text-green-500',
      href: '/tasks',
    },
    {
      title: 'Events',
      value: '3',
      change: 'Today',
      icon: Calendar,
      color: 'text-purple-500',
      href: '/calendar',
    },
    {
      title: 'Files',
      value: '156',
      change: '+8 this week',
      icon: Folder,
      color: 'text-orange-500',
      href: '/files',
    },
  ]

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <BlurFade>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>
      </BlurFade>

      {/* Stats Grid */}
      <BlurFade delay={100}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <MagicCard
              key={stat.title}
              className="p-6"
              data-testid={`stat-card-${stat.title.toLowerCase()}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Link to={stat.href} className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.change}
                    </p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </Link>
            </MagicCard>
          ))}
        </div>
      </BlurFade>

      {/* Quick Actions */}
      <BlurFade delay={200}>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Common tasks and shortcuts
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/chat" data-testid="quick-action-new-chat">
              <Button className="w-full" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </Link>
            <Link to="/calendar" data-testid="quick-action-schedule-event">
              <Button className="w-full" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Event
              </Button>
            </Link>
            <Link to="/tasks" data-testid="quick-action-add-task">
              <Button className="w-full" variant="outline">
                <CheckSquare className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </Link>
          </div>
        </div>
      </BlurFade>

      {/* Recent Activity */}
      <BlurFade delay={300}>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your latest interactions
          </p>

          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Activity {i}</p>
                  <p className="text-xs text-muted-foreground">
                    {i} hour{i > 1 ? 's' : ''} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BlurFade>
    </div>
  )
}
