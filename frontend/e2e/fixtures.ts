import { test as base, type Page } from '@playwright/test'
import {
  login,
  clearStorage,
  waitForLoginSuccess,
  TEST_USER,
  TEST_ENDPOINTS,
  setupTestUser,
} from './helpers'

/**
 * Custom test fixtures with authentication support
 *
 * Extends Playwright's base test with:
 * - authenticatedPage: A page instance with a logged-in user
 * - testUser: Test user credentials
 */

export type AuthFixtures = {
  authenticatedPage: Page
  testUser: typeof TEST_USER
}

// Storage key for JWT token (must match api.ts)
const TOKEN_STORAGE_KEY = 'soai-token'
const AUTH_STATE_KEY = 'soai-auth-state'

// Setup test user once (before all tests)
setupTestUser()

export const test = base.extend<AuthFixtures>({
  // Provide an authenticated page for tests
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page first (required for localStorage access)
    await page.goto(TEST_ENDPOINTS.login)

    // Clear ALL storage (cookies + localStorage + sessionStorage)
    await page.context().clearCookies()
    await clearStorage(page)

    // Perform actual login with backend
    try {
      await login(page, {
        email: TEST_USER.email,
        password: TEST_USER.password,
      })

      // Wait for successful login (redirect to dashboard)
      await waitForLoginSuccess(page)

      // Verify we're actually on dashboard before using
      await base.expect(page).toHaveURL(TEST_ENDPOINTS.dashboard, { timeout: 10000 })

      // CRITICAL: Verify token is stored in localStorage
      const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_STORAGE_KEY)
      if (!token) {
        throw new Error('Login succeeded but token was not stored in localStorage')
      }

      // Verify auth state is also stored
      const authState = await page.evaluate((key) => localStorage.getItem(key), AUTH_STATE_KEY)
      if (!authState) {
        throw new Error('Login succeeded but auth state was not stored in localStorage')
      }

      // Wait a bit for React state to stabilize
      await page.waitForTimeout(500)
    } catch (error) {
      // If login fails, the test will fail with the actual error
      throw error
    }

    // Use the authenticated page in the test
    await use(page)

    // Cleanup: clear all auth data after test
    await clearStorage(page)
    await page.context().clearCookies()
  },

  // Provide test user credentials
  testUser: async ({}, use) => {
    await use(TEST_USER)
  },
})

// Re-export expect from base test
export const expect = base.expect
