import { test, expect } from './fixtures'
import { selectors } from './helpers'

/**
 * Dashboard E2E Tests
 *
 * Tests for:
 * - Dashboard page rendering
 * - Stats cards display
 * - Quick actions navigation
 * - Recent activity section
 */

test.describe('ダッシュボード', () => {
  test.describe('ページ表示', () => {
    test('ダッシュボードが表示される', async ({ authenticatedPage }) => {
      // Check dashboard container
      await expect(authenticatedPage.locator(selectors.dashboardPage)).toBeVisible()

      // Check heading
      await expect(authenticatedPage.locator('h1:has-text("Dashboard")')).toBeVisible()

      // Check subheading
      await expect(
        authenticatedPage.locator('text=Welcome back! Here\'s what\'s happening today')
      ).toBeVisible()
    })

    test('統計カードが表示される', async ({ authenticatedPage }) => {
      // Check all stat cards are visible
      await expect(authenticatedPage.locator(selectors.statCard('messages'))).toBeVisible()
      await expect(authenticatedPage.locator(selectors.statCard('tasks'))).toBeVisible()
      await expect(authenticatedPage.locator(selectors.statCard('events'))).toBeVisible()
      await expect(authenticatedPage.locator(selectors.statCard('files'))).toBeVisible()
    })

    test('統計カードの内容が正しい', async ({ authenticatedPage }) => {
      // Messages card
      const messagesCard = authenticatedPage.locator(selectors.statCard('messages'))
      await expect(messagesCard).toContainText('Messages')
      await expect(messagesCard).toContainText('24')

      // Tasks card
      const tasksCard = authenticatedPage.locator(selectors.statCard('tasks'))
      await expect(tasksCard).toContainText('Tasks')
      await expect(tasksCard).toContainText('8')

      // Events card
      const eventsCard = authenticatedPage.locator(selectors.statCard('events'))
      await expect(eventsCard).toContainText('Events')
      await expect(eventsCard).toContainText('3')

      // Files card
      const filesCard = authenticatedPage.locator(selectors.statCard('files'))
      await expect(filesCard).toContainText('Files')
      await expect(filesCard).toContainText('156')
    })
  })

  test.describe('クイックアクション', () => {
    test('クイックアクションセクションが表示される', async ({ authenticatedPage }) => {
      await expect(
        authenticatedPage.locator('h2:has-text("Quick Actions")')
      ).toBeVisible()
      await expect(
        authenticatedPage.locator('text=Common tasks and shortcuts')
      ).toBeVisible()
    })

    test('New Chatボタンでチャット画面へ遷移する', async ({ authenticatedPage }) => {
      // Click New Chat quick action
      await authenticatedPage.click(selectors.quickActionNewChat)

      // Should navigate to chat page
      await authenticatedPage.waitForURL('/chat')
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()
    })

    test('Schedule Eventボタンでカレンダー画面へ遷移する（プレースホルダー）', async ({
      authenticatedPage,
    }) => {
      // Click Schedule Event quick action
      await authenticatedPage.click(selectors.quickActionScheduleEvent)

      // Should navigate to calendar page (placeholder)
      await authenticatedPage.waitForURL('/calendar')
    })

    test('Add Taskボタンでタスク画面へ遷移する（プレースホルダー）', async ({ authenticatedPage }) => {
      // Click Add Task quick action
      await authenticatedPage.click(selectors.quickActionAddTask)

      // Should navigate to tasks page (placeholder)
      await authenticatedPage.waitForURL('/tasks')
    })
  })

  test.describe('最近のアクティビティ', () => {
    test('Recent Activityセクションが表示される', async ({ authenticatedPage }) => {
      await expect(
        authenticatedPage.locator('h2:has-text("Recent Activity")')
      ).toBeVisible()
      await expect(
        authenticatedPage.locator('text=Your latest interactions')
      ).toBeVisible()
    })

    test('アクティビティアイテムが表示される', async ({ authenticatedPage }) => {
      // There should be 3 activity items shown
      const activityItems = authenticatedPage.locator('[class*="rounded-lg border p-4"]')
      const count = await activityItems.count()
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  test.describe('サイドバーナビゲーション', () => {
    test('サイドバーのDashboardリンクがアクティブ', async ({ authenticatedPage }) => {
      // The dashboard nav item should be active (highlighted)
      const dashboardNav = authenticatedPage.locator(selectors.navDashboard)
      await expect(dashboardNav).toHaveClass(/bg-primary/)
    })

    test('サイドバーからChatへ移動', async ({ authenticatedPage }) => {
      // Click Chat in sidebar
      await authenticatedPage.click(selectors.navChat)

      // Should navigate to chat
      await authenticatedPage.waitForURL('/chat')
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()
    })

    test('サイドバーからDashboardへ戻る', async ({ authenticatedPage }) => {
      // First navigate to chat
      await authenticatedPage.click(selectors.navChat)
      await authenticatedPage.waitForURL('/chat')

      // Then navigate back to dashboard
      await authenticatedPage.click(selectors.navDashboard)
      await authenticatedPage.waitForURL('/')

      await expect(authenticatedPage.locator(selectors.dashboardPage)).toBeVisible()
    })
  })

  test.describe('レスポンシブデザイン', () => {
    test('モバイルビューでダッシュボードが表示される', async ({ authenticatedPage }) => {
      // Set mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })

      // Dashboard should still be visible
      await expect(authenticatedPage.locator(selectors.dashboardPage)).toBeVisible()

      // Stats should be visible
      await expect(authenticatedPage.locator(selectors.statCard('messages'))).toBeVisible()
    })
  })
})
