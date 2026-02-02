import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

/**
 * Smoke test for the App component.
 * Verifies that the application renders without crashing.
 */
describe('App', () => {
  it('renders the application', () => {
    render(<App />)

    // Verify the app name is present
    expect(screen.getAllByText('Smart Office AI').length).toBeGreaterThan(0)
  })

  it('renders with the correct root element structure', () => {
    const { container } = render(<App />)

    // Verify we have a div as the container
    const rootDiv = container.querySelector('div')
    expect(rootDiv).toBeDefined()
  })

  it('displays navigation items', () => {
    render(<App />)

    // Verify navigation is rendered
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chat').length).toBeGreaterThan(0)
  })
})
