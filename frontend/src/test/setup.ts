import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeEach } from 'vitest'

// Mock localStorage BEFORE any imports that might use it
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Define localStorage on both global and globalThis
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Clear localStorage mock before each test
beforeEach(() => {
  localStorageMock.getItem.mockReturnValue(null)
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver

// Mock matchMedia
Object.defineProperty(globalThis.window || globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock HTMLFormElement.prototype.requestSubmit for jsdom
HTMLFormElement.prototype.requestSubmit = vi.fn(function(this: HTMLFormElement) {
  // Simulate form submission by dispatching a submit event
  const event = new Event('submit', { bubbles: true, cancelable: true })
  this.dispatchEvent(event)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any
