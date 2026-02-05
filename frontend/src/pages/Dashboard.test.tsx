/**
 * Tests for Dashboard Page Component.
 *
 * IMPORTANT NOTE: Current tests verify hardcoded implementation details.
 * These tests document the CURRENT behavior and will serve as regression tests
 * during UI refactoring, but they DO NOT validate dynamic data flow.
 *
 * When Dashboard accepts dynamic data via props/API, these tests should be
 * replaced with proper contract tests that validate the data contract.
 *
 * @see ./Dashboard.tsx for TODO comment on making stats dynamic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'

// Mock react-router Link component
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    Link: ({ children, to, className, ...props }: any) => (
      <a href={to} className={className} data-testid={props['data-testid']} {...props}>
        {children}
      </a>
    ),
  }
})

// Mock MagicCard component
vi.mock('@/components/ui/magic-card', () => ({
  MagicCard: ({ children, className, 'data-testid': dataTestId, style }: any) => (
    <div className={className} data-testid={dataTestId} style={style}>
      {children}
    </div>
  ),
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, disabled }: any) => (
    <button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

import { Dashboard } from './Dashboard'

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the dashboard page', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('should render the main heading', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/Welcome back!/i)).toBeInTheDocument()
  })

  describe('Stats Cards', () => {
    it('should render all stats cards', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByTestId('stat-card-messages')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-tasks')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-events')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-files')).toBeInTheDocument()
    })

    it('should display correct values for each stat', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('156')).toBeInTheDocument()
    })

    it('should display change metrics for each stat', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('+12%')).toBeInTheDocument()
      expect(screen.getByText('3 pending')).toBeInTheDocument()
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('+8 this week')).toBeInTheDocument()
    })
  })

  describe('Quick Actions', () => {
    it('should render quick actions section', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('should render New Chat button', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      const newChatBtn = screen.getByTestId('quick-action-new-chat')
      expect(newChatBtn).toBeInTheDocument()
    })

    it('should render Schedule Event button', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      const scheduleEventBtn = screen.getByTestId('quick-action-schedule-event')
      expect(scheduleEventBtn).toBeInTheDocument()
    })

    it('should render Add Task button', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      const addTaskBtn = screen.getByTestId('quick-action-add-task')
      expect(addTaskBtn).toBeInTheDocument()
    })
  })

  describe('Recent Activity', () => {
    it('should render recent activity section', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })

    it('should render activity items', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      // Check for activity content
      expect(screen.getByText('Activity 1')).toBeInTheDocument()
      expect(screen.getByText('Activity 2')).toBeInTheDocument()
      expect(screen.getByText('Activity 3')).toBeInTheDocument()
    })

    it('should render activity items with time ago', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('1 hour ago')).toBeInTheDocument()
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('should have proper spacing between sections', () => {
      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      )

      const dashboardPage = container.querySelector('[data-testid="dashboard-page"]')
      expect(dashboardPage).toHaveClass('space-y-8')
    })
  })
})

/**
 * Data Contract Tests (for future dynamic implementation)
 *
 * These tests document the contract for when Dashboard accepts dynamic data.
 * Currently skipped because Dashboard uses hardcoded values.
 *
 * To enable: Remove `.skip` and update Dashboard to accept stats as props
 */
describe.skip('Data Contract (for future dynamic implementation)', () => {
  // Future stat interface:
  // interface Stat {
  //   title: string
  //   value: string
  //   change: string
  //   icon: ComponentType<{ className?: string }>
  //   color: string
  //   href: string
  // }

  it('should render stats from props when made dynamic', () => {
    // This test documents the contract for when Dashboard accepts dynamic data
    // Implementation will fail until Dashboard accepts props:
    //
    // const mockStats: Stat[] = [
    //   { title: 'Test', value: '99', change: '+5%', icon: MessageSquare, color: 'text-blue-500', href: '/test' }
    // ]
    // render(<Dashboard stats={mockStats} />)
    // expect(screen.getByText('99')).toBeInTheDocument()
    // expect(screen.getByText('+5%')).toBeInTheDocument()

    expect(true).toBe(true) // Placeholder - will fail when properly implemented
  })

  it('should render empty state when no stats provided', () => {
    // Contract: Dashboard should handle empty stats gracefully
    // render(<Dashboard stats={[]} />)
    // expect(screen.queryByTestId('stat-card-messages')).not.toBeInTheDocument()

    expect(true).toBe(true) // Placeholder
  })

  it('should render activities from props when made dynamic', () => {
    // Contract: Activities should be passed as props
    // const mockActivities = [
    //   { id: '1', title: 'Test Activity', timeAgo: '5 minutes ago' }
    // ]
    // render(<Dashboard activities={mockActivities} />)
    // expect(screen.getByText('Test Activity')).toBeInTheDocument()

    expect(true).toBe(true) // Placeholder
  })
})
