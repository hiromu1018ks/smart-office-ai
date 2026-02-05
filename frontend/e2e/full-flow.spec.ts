import { test, expect } from './fixtures'
import { selectors, login, TEST_USER, waitForLoginSuccess, logout } from './helpers'

/**
 * End-to-End Integration Tests
 *
 * Tests for complete user flows across multiple pages:
 * - Login → Dashboard → Chat → Logout
 * - Multi-page navigation
 * - Browser back/forward
 */

test.describe('エンドツーエンドフロー', () => {
  test.describe('完全なユーザーフロー', () => {
    test('ログイン→ダッシュボード→チャット→ログアウト', async ({ page }) => {
      // Step 1: Navigate to login
      await page.goto('/login')
      await expect(page.locator(selectors.loginForm)).toBeVisible()

      // Step 2: Login with test user
      await login(page, {
        email: TEST_USER.email,
        password: TEST_USER.password,
      })

      // Step 3: Wait for redirect to dashboard
      await waitForLoginSuccess(page)
      await expect(page).toHaveURL('/')

      // Step 4: Navigate to chat
      await page.goto('/chat')
      await expect(page.locator(selectors.chatPage)).toBeVisible()

      // Step 5: Go back to dashboard
      await page.click('[data-testid="nav-dashboard"]')
      await expect(page).toHaveURL('/')

      // Step 6: Logout
      await logout(page)
      await expect(page).toHaveURL('/login')
    })

    test('ダッシュボードから各ページへ遷移できる', async ({ authenticatedPage }) => {
      // Should start on dashboard
      await expect(authenticatedPage).toHaveURL('/')

      // Navigate to chat via sidebar
      await authenticatedPage.click('[data-testid="nav-chat"]')
      await expect(authenticatedPage).toHaveURL('/chat')
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()

      // Navigate back to dashboard
      await authenticatedPage.click('[data-testid="nav-dashboard"]')
      await expect(authenticatedPage).toHaveURL('/')
    })
  })

  test.describe('ページ間ナビゲーション', () => {
    test('ログイン画面のリンクが正しい', async ({ page }) => {
      await page.goto('/login')

      // Check signup link
      const signupLink = page.locator('a[href="/register"]')
      await expect(signupLink).toBeVisible()

      // Check forgot password link
      const forgotLink = page.locator('a[href="/forgot-password"]')
      await expect(forgotLink).toBeVisible()
    })

    test('ログイン画面の見出しとテキストが正しい', async ({ page }) => {
      await page.goto('/login')

      // Check main heading
      await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible()

      // Check subheading
      await expect(page.locator('text=Sign in to Smart Office AI')).toBeVisible()
    })
  })

  test.describe('エラーハンドリング', () => {
    test('存在しないページにアクセス', async ({ page }) => {
      // Try to access a non-existent route
      await page.goto('/this-page-does-not-exist')

      // Should handle gracefully - currently shows login page (catch-all route)
      await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible()
    })
  })

  test.describe('ブラウザ戻る/進むボタン', () => {
    test('チャットからダッシュボードに戻る', async ({ authenticatedPage }) => {
      // Start on dashboard
      await expect(authenticatedPage).toHaveURL('/')

      // Navigate to chat
      await authenticatedPage.goto('/chat')
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()

      // Browser back should return to dashboard
      await authenticatedPage.goBack()
      await expect(authenticatedPage).toHaveURL('/')

      // Browser forward should return to chat
      await authenticatedPage.goForward()
      await expect(authenticatedPage).toHaveURL('/chat')
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()
    })
  })
})

/**
 * Smoke Tests
 *
 * Quick tests to verify the application is working at a basic level
 */
test.describe('Smoke Tests', () => {
  test('アプリケーションが読み込める', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login since not authenticated
    await page.waitForURL('/login', { timeout: 5000 })

    // Login page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('ログイン画面の主要要素が表示される', async ({ page }) => {
    await page.goto('/login')

    // Check all major elements
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator(selectors.loginEmail)).toBeVisible()
    await expect(page.locator(selectors.loginPassword)).toBeVisible()
    await expect(page.locator(selectors.loginSubmit)).toBeVisible()
  })

  test('スタイルが正しく適用されている', async ({ page }) => {
    await page.goto('/login')

    // Check that the form is styled (has the expected classes)
    const form = page.locator('[data-testid="login-form"]')
    await expect(form).toBeVisible()

    // Check that inputs have proper styling
    const emailInput = page.locator('[data-testid="login-email"]')
    await expect(emailInput).toHaveCSS('border-style', 'solid')
  })

  test('ログインしてダッシュボードが表示される', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // Login with test user
    await login(page, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    })

    // Wait for redirect to dashboard
    await waitForLoginSuccess(page)
    await expect(page).toHaveURL('/')

    // Dashboard should be visible
    await expect(page.locator(selectors.dashboardPage)).toBeVisible()
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })
})
