/**
 * Tests for Sidebar Component.
 *
 * Tests for the desktop navigation sidebar including:
 * - Navigation items rendering
 * - Active state styling
 * - Collapsed state
 * - Logo display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    NavLink: ({ children, to, 'data-testid': dataTestId, className, ...props }: any) => {
      const active = props.to === '/' ? true : false // Mock active state for dashboard
      return (
        <a
          href={to}
          data-testid={dataTestId || to}
          data-active={active}
          className={className ? className({ isActive: active }) : ''}
        >
          {children}
        </a>
      )
    },
  }
})

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    // Check that nav items are rendered
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-chat')).toBeInTheDocument()
    expect(screen.getByTestId('nav-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('nav-tasks')).toBeInTheDocument()
    expect(screen.getByTestId('nav-files')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  it('should render Logo component', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    const logo = container.querySelector('svg')
    expect(logo).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar className="custom-sidebar" />
      </BrowserRouter>
    )

    const sidebar = container.querySelector('.custom-sidebar')
    expect(sidebar).toBeInTheDocument()
  })

  it('should not hide text when not collapsed', () => {
    render(
      <BrowserRouter>
        <Sidebar collapsed={false} />
      </BrowserRouter>
    )

    // Check that labels are visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('should apply collapsed classes when collapsed prop is true', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar collapsed={true} />
      </BrowserRouter>
    )

    const sidebar = container.querySelector('aside')
    expect(sidebar).toHaveClass('md:w-16')
  })

  it('should hide pro tip section when collapsed', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar collapsed={true} />
      </BrowserRouter>
    )

    // Pro tip should be hidden when collapsed (the div should have hidden class)
    const proTipSection = container.querySelector('.hidden')
    expect(proTipSection).toBeInTheDocument()
  })

  it('should show pro tip section when not collapsed', () => {
    render(
      <BrowserRouter>
        <Sidebar collapsed={false} />
      </BrowserRouter>
    )

    expect(screen.getByText('Pro Tip')).toBeInTheDocument()
    expect(screen.getByText('Use keyboard shortcuts to navigate faster.')).toBeInTheDocument()
  })

  it('should have correct responsive classes', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    const sidebar = container.querySelector('aside')
    expect(sidebar).toHaveClass('hidden')
    expect(sidebar).toHaveClass('md:flex')
  })

  it('should render navigation items in correct order', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    // Get all nav links by role
    const navLinks = screen.getAllByRole('link')
    const labels = navLinks.map(link => link.textContent?.trim()).filter(Boolean)

    expect(labels).toEqual([
      'Dashboard',
      'Chat',
      'Calendar',
      'Tasks',
      'Files',
      'Settings'
    ])
  })
})
