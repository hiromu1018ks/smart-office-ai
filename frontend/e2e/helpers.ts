import { type Page, type Locator } from '@playwright/test'

/**
 * E2E Test Constants
 */
export const TEST_USER = {
  email: 'e2e-test@example.com',
  username: 'e2e-test-user',
  password: 'TestPass123',
  totpCode: '123456', // Mock TOTP for testing
} as const

export const TEST_ENDPOINTS = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  chat: '/chat',
} as const

/**
 * Authentication Helpers
 */

/**
 * Fill and submit the login form
 */
export async function fillLoginForm(
  page: Page,
  options: {
    email: string
    password: string
    totpCode?: string
  }
) {
  await page.fill('[data-testid="login-email"]', options.email)
  await page.fill('[data-testid="login-password"]', options.password)

  if (options.totpCode) {
    await page.fill('[data-testid="login-totp"]', options.totpCode)
  }
}

/**
 * Submit the login form
 */
export async function submitLoginForm(page: Page) {
  await page.click('[data-testid="login-submit"]')
}

/**
 * Perform complete login flow
 */
export async function login(
  page: Page,
  options: {
    email: string
    password: string
    totpCode?: string
  }
) {
  await page.goto(TEST_ENDPOINTS.login)
  await fillLoginForm(page, options)
  await submitLoginForm(page)
}

/**
 * Logout via user menu
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu-trigger"]')
  await page.click('[data-testid="logout-button"]')
}

/**
 * Wait for successful login (redirect to dashboard)
 */
export async function waitForLoginSuccess(page: Page) {
  await page.waitForURL(TEST_ENDPOINTS.dashboard, { timeout: 10000 })
}

/**
 * Setup E2E test user by registering via API
 * This should be called once before running tests
 */
export async function setupTestUser(): Promise<void> {
  const response = await fetch('http://localhost:8000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      username: TEST_USER.username,
      password: TEST_USER.password,
    }),
  })

  // Ignore errors (user might already exist)
  if (!response.ok && response.status !== 400) {
    console.warn('Failed to setup test user:', response.statusText)
  }
}

/**
 * Mock authentication by setting localStorage token directly
 * Use this when backend is not available
 * Also mocks API responses for /api/v1/auth/me
 */
export async function mockAuth(page: Page) {
  // Mock API responses before navigating
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'e2e-test@example.com',
        username: 'e2e-test-user',
        is_active: true,
        totp_enabled: false,
      }),
    })
  })

  await page.goto(TEST_ENDPOINTS.login)

  // Set mock auth token in localStorage using the correct storage keys
  await page.evaluate(() => {
    // Direct token storage (used by api.ts)
    localStorage.setItem('soai-token', 'mock_token_for_testing')

    // Zustand persist storage key for auth store
    const authState = {
      state: {
        token: 'mock_token_for_testing',
        user: {
          id: 'test-user-id',
          email: 'e2e-test@example.com',
          username: 'e2e-test-user',
          is_active: true,
          totp_enabled: false,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      version: 0,
    }
    localStorage.setItem('soai-auth-state', JSON.stringify(authState))
  })

  // Navigate to dashboard (should now pass auth check)
  await page.goto(TEST_ENDPOINTS.dashboard)
}

/**
 * Navigation Helpers
 */

/**
 * Navigate to chat page
 */
export async function navigateToChat(page: Page) {
  await page.click('[data-testid="nav-chat"]')
  await page.waitForURL(TEST_ENDPOINTS.chat)
}

/**
 * Navigate to dashboard
 */
export async function navigateToDashboard(page: Page) {
  await page.click('[data-testid="nav-dashboard"]')
  await page.waitForURL(TEST_ENDPOINTS.dashboard)
}

/**
 * Chat Helpers
 */

/**
 * Send a chat message
 */
export async function sendChatMessage(page: Page, message: string) {
  const input = page.locator('[data-testid="chat-input"]')
  await input.fill(message)
  await input.press('Enter')
}

/**
 * Wait for AI response to appear
 */
export async function waitForAIResponse(page: Page, timeout = 30000) {
  await page.waitForSelector('[data-testid="chat-message-assistant"]', {
    timeout,
  })
}

/**
 * Wait for typing indicator to appear
 */
export async function waitForTypingIndicator(page: Page) {
  await page.waitForSelector('[data-testid="typing-indicator"]', {
    timeout: 5000,
  })
}

/**
 * Wait for typing indicator to disappear
 */
export async function waitForTypingIndicatorToDisappear(page: Page) {
  await page.waitForSelector('[data-testid="typing-indicator"]', {
    state: 'hidden',
    timeout: 35000,
  })
}

/**
 * Get last user message text
 */
export async function getLastUserMessage(page: Page): Promise<string> {
  const messages = page.locator('[data-testid="chat-message-user"]')
  const count = await messages.count()
  if (count === 0) {
    throw new Error('No user messages found')
  }
  return messages.nth(count - 1).textContent() as Promise<string>
}

/**
 * Get last assistant message text
 */
export async function getLastAssistantMessage(page: Page): Promise<string> {
  const messages = page.locator('[data-testid="chat-message-assistant"]')
  const count = await messages.count()
  if (count === 0) {
    throw new Error('No assistant messages found')
  }
  return messages.nth(count - 1).textContent() as Promise<string>
}

/**
 * Assertion Helpers
 */

/**
 * Assert that the error alert is visible
 */
export async function expectErrorAlert(
  page: Page,
  options: { contains?: string } = {}
) {
  const alert = page.locator('[role="alert"]')
  await expect(alert).toBeVisible()

  if (options.contains) {
    await expect(alert).toContainText(options.contains)
  }
}

/**
 * Assert that the user is on a specific page
 */
export async function expectPage(page: Page, path: string) {
  await page.waitForURL(path)
}

/**
 * Utility Helpers
 */

/**
 * Clear localStorage
 */
export async function clearStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Wait for network idle (useful for debugging)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Take screenshot on failure (for manual debugging)
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  })
}

/**
 * Reusable selectors (for consistency across tests)
 */
export const selectors = {
  // Login page
  loginForm: '[data-testid="login-form"]',
  loginEmail: '[data-testid="login-email"]',
  loginPassword: '[data-testid="login-password"]',
  loginTotp: '[data-testid="login-totp"]',
  loginRememberMe: '[data-testid="login-remember-me"]',
  loginSubmit: '[data-testid="login-submit"]',
  loginError: '[role="alert"]',
  loginSignupLink: 'text=Sign up',
  loginForgotPassword: 'text=Forgot password?',

  // Navigation
  navDashboard: '[data-testid="nav-dashboard"]',
  navChat: '[data-testid="nav-chat"]',
  navTasks: '[data-testid="nav-tasks"]',
  navCalendar: '[data-testid="nav-calendar"]',
  navFiles: '[data-testid="nav-files"]',

  // User menu
  userMenuTrigger: '[data-testid="user-menu-trigger"]',
  logoutButton: '[data-testid="logout-button"]',

  // Dashboard
  dashboardPage: '[data-testid="dashboard-page"]',
  statCard: (name: string) => `[data-testid="stat-card-${name}"]`,
  quickActionNewChat: '[data-testid="quick-action-new-chat"]',
  quickActionScheduleEvent: '[data-testid="quick-action-schedule-event"]',
  quickActionAddTask: '[data-testid="quick-action-add-task"]',

  // Chat
  chatPage: '[data-testid="chat-page"]',
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',
  newConversationBtn: '[data-testid="new-conversation-btn"]',
  messageList: '[data-testid="message-list"]',
  userMessage: '[data-testid="chat-message-user"]',
  assistantMessage: '[data-testid="chat-message-assistant"]',
  typingIndicator: '[data-testid="typing-indicator"]',
  emptyChatState: '[data-testid="empty-chat-state"]',

  // Files
  filesPage: '[data-testid="files-page"]',
  fileUploadBtn: '[data-testid="file-upload-btn"]',
  fileListItem: '[data-testid="file-list-item"]',
  fileSearchInput: '[data-testid="file-search-input"]',
  emptyFilesState: '[data-testid="empty-files-state"]',

  // Calendar
  calendarPage: '[data-testid="calendar-page"]',
  calendarEvent: '[data-testid="calendar-event"]',
  calendarNewEventBtn: '[data-testid="calendar-new-event-btn"]',
  calendarDayView: '[data-testid="calendar-day-view"]',
  calendarWeekView: '[data-testid="calendar-week-view"]',
  calendarMonthView: '[data-testid="calendar-month-view"]',

  // Tasks
  tasksPage: '[data-testid="tasks-page"]',
  taskListItem: '[data-testid="task-list-item"]',
  taskNewBtn: '[data-testid="task-new-btn"]',
  taskCheckbox: '[data-testid="task-checkbox"]',
  emptyTasksState: '[data-testid="empty-tasks-state"]',

  // Search
  searchInput: '[data-testid="search-input"]',
  searchResults: '[data-testid="search-results"]',
  searchResultItem: '[data-testid="search-result-item"]',
  emptySearchState: '[data-testid="empty-search-state"]',
} as const
