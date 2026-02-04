/**
 * Tests for TypingIndicator component using TDD methodology.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TypingIndicator } from './TypingIndicator'

describe('TypingIndicator', () => {
  it('should render typing dots', () => {
    render(<TypingIndicator />)
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<TypingIndicator className="custom-class" />)
    expect(screen.getByTestId('typing-indicator')).toHaveClass('custom-class')
  })

  it('should have accessible label', () => {
    render(<TypingIndicator />)
    expect(screen.getByLabelText('AI is typing')).toBeInTheDocument()
  })

  it('should render three dots', () => {
    render(<TypingIndicator />)
    const dots = screen.getAllByTestId(/typing-dot/)
    expect(dots).toHaveLength(3)
  })
})
