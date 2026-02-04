/**
 * Tests for ChatInput component using TDD methodology.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('should render textarea and send button', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    const button = screen.getByRole('button', { name: /send message/i })

    expect(textarea).toBeInTheDocument()
    expect(button).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', 'Type your message...')
  })

  it('should use custom placeholder', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} placeholder="Ask me anything..." />)

    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument()
  })

  it('should disable input when disabled prop is true', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} disabled />)

    const textarea = screen.getByRole('textbox')
    const button = screen.getByRole('button')

    expect(textarea).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('should call onSend with trimmed content when send button is clicked', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, '  Hello World  ')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith('Hello World')
  })

  it('should clear textarea after sending', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test message')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(textarea).toHaveValue('')
  })

  it('should not send empty message', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('should not send whitespace-only message', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, '   ')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('should send message on Enter key press', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test message{Enter}')

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith('Test message')
  })

  it('should not send on Shift+Enter (allow newline)', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

    expect(mockSend).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  it('should disable send button when input is empty', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should enable send button when input has content', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello')

    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('should not send when disabled even with content', async () => {
    const user = userEvent.setup()
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} disabled />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const mockSend = vi.fn()
    const { container } = render(<ChatInput onSend={mockSend} className="custom-input" />)

    expect(container.firstChild).toHaveClass('custom-input')
  })

  it('should use custom minRows and maxRows', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSend={mockSend} minRows={2} maxRows={10} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('rows', '2')
    expect(textarea).toHaveStyle({ maxHeight: '240px' }) // 10 * 24
  })
})
