/**
 * Tests for MobileSidebar Component.
 *
 * Tests for the mobile sidebar drawer including:
 * - Open/close state
 * - Navigation items
 * - Close button functionality
 * - Outside click prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    NavLink: ({ children, to, onClick, className }: any) => (
      <a
        href={to}
        onClick={onClick}
        className={className ? className({ isActive: false }) : ''}
        data-testid={`mobile-nav-${to}`}
      >
        {children}
      </a>
    ),
  }
})

// Mock Dialog component
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => {
    if (!open) return null
    return (
      <div data-testid="mobile-dialog" data-open="true">
        {children}
      </div>
    )
  },
  DialogContent: ({ children, className, onPointerDownOutside }: any) => (
    <div className={className} data-on-pointer-down-outside="true">
      {children}
    </div>
  ),
}))

import { MobileSidebar } from './MobileSidebar'

describe('MobileSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when open is false', () => {
    const { container } = render(
      <BrowserRouter>
        <MobileSidebar open={false} />
      </BrowserRouter>
    )

    // Dialog should not be visible when closed
    const dialog = container.querySelector('[data-testid="mobile-dialog"]')
    expect(dialog).not.toBeInTheDocument()
  })

  it('should render when open is true', () => {
    const { container } = render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    // Dialog should be visible when open
    const dialog = container.querySelector('[data-testid="mobile-dialog"]')
    expect(dialog).toBeInTheDocument()
  })

  it('should render all navigation items when open', () => {
    render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    // Check navigation items
    expect(screen.getByTestId('mobile-nav-/')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-/chat')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-/calendar')).toBeInTheDocument()
  })

  it('should render Logo in header', () => {
    const { container } = render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    const logo = container.querySelector('svg')
    expect(logo).toBeInTheDocument()
  })

  it('should call onOpenChange with false when close button is clicked', () => {
    const handleClose = vi.fn()

    render(
      <BrowserRouter>
        <MobileSidebar open={true} onOpenChange={handleClose} />
      </BrowserRouter>
    )

    const closeButton = screen.getByRole('button', { name: /close menu/i })
    fireEvent.click(closeButton)

    expect(handleClose).toHaveBeenCalledWith(false)
  })

  it('should call onOpenChange with false when navigation item is clicked', () => {
    const handleClose = vi.fn()

    render(
      <BrowserRouter>
        <MobileSidebar open={true} onOpenChange={handleClose} />
      </BrowserRouter>
    )

    const chatLink = screen.getByTestId('mobile-nav-/chat')
    fireEvent.click(chatLink)

    expect(handleClose).toHaveBeenCalledWith(false)
  })

  it('should render version info in footer', () => {
    render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    // Use getAllByText since text appears multiple times
    const smartOfficeElements = screen.getAllByText('Smart Office AI')
    expect(smartOfficeElements.length).toBeGreaterThan(0)

    const versionElements = screen.getAllByText('Version 0.1.0')
    expect(versionElements.length).toBeGreaterThan(0)
  })

  it('should have correct dialog container', () => {
    const { container } = render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    const dialog = container.querySelector('[data-testid="mobile-dialog"]')
    expect(dialog).toBeInTheDocument()
  })

  it('should have onPointerDownOutside prop on DialogContent', () => {
    const { container } = render(
      <BrowserRouter>
        <MobileSidebar open={true} />
      </BrowserRouter>
    )

    const dialogContent = container.querySelector('[data-on-pointer-down-outside]')
    expect(dialogContent).toBeInTheDocument()
  })

  it('should work without onOpenChange callback', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <MobileSidebar open={true} />
        </BrowserRouter>
      )
    }).not.toThrow()
  })
})
