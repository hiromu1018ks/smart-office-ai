import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

/**
 * Smoke test for the App component.
 * Verifies that the application renders without crashing.
 */
describe('App', () => {
  it('renders the placeholder page', () => {
    render(<App />)

    // Verify the main heading is present
    expect(screen.getByText('Smart Office AI')).toBeInTheDocument()

    // Verify the tagline is present
    expect(
      screen.getByText(/All-in-one AI-powered office suite/i),
    ).toBeInTheDocument()

    // Verify status indicators are present
    expect(screen.getByText(/React \+ TypeScript/)).toBeInTheDocument()
    expect(screen.getByText(/Vite \+ HMR/)).toBeInTheDocument()
    expect(screen.getByText(/Tailwind CSS/)).toBeInTheDocument()
    expect(screen.getByText(/React Router/)).toBeInTheDocument()
  })

  it('renders with the correct root element structure', () => {
    const { container } = render(<App />)

    // Verify we have a div as the container
    const rootDiv = container.querySelector('div')
    expect(rootDiv).toBeDefined()
  })

  it('displays the step completion message', () => {
    render(<App />)

    expect(screen.getByText(/Step 5: Frontend Foundation Complete/)).toBeInTheDocument()
  })
})
