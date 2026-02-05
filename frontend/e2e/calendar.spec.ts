import { test, expect } from './fixtures'
import { selectors } from './helpers'

/**
 * Calendar E2E Tests
 *
 * Tests for:
 * - Calendar view rendering (day/week/month)
 * - Event creation
 * - Event display
 * - Event editing/deletion
 * - Navigation between dates
 *
 * NOTE: Some tests may be skipped until calendar is fully implemented.
 * These tests document the expected behavior for future implementation.
 */

test.describe('カレンダー', () => {
  test.describe('カレンダー表示', () => {
    test('カレンダーページが表示される', async ({ authenticatedPage }) => {
      // Navigate to calendar page
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Check that calendar page is visible
      await expect(authenticatedPage.locator(selectors.calendarPage)).toBeVisible()
    })

    test('月ビューがデフォルトで表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Check for month view (default)
      const monthView = authenticatedPage.locator(selectors.calendarMonthView)
      await expect(monthView).toBeVisible()
    })

    test('ビューを切り替えられる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Try switching to week view
      test.skip(true, 'View switching not yet implemented')

      const weekView = authenticatedPage.locator(selectors.calendarWeekView)
      await expect(weekView).toBeVisible()
    })

    test('今日の日付が強調表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Check that today is highlighted
      test.skip(true, 'Today highlighting implementation varies')
    })
  })

  test.describe('イベント作成', () => {
    test('新規イベントボタンが表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Check for new event button
      const newEventBtn = authenticatedPage.locator(selectors.calendarNewEventBtn)
      await expect(newEventBtn).toBeVisible()
    })

    test('新規イベントを作成できる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      const newEventBtn = authenticatedPage.locator(selectors.calendarNewEventBtn)
      await newEventBtn.click()

      // Fill in event details
      // Note: Event creation modal/form implementation pending
      test.skip(true, 'Event creation form not yet implemented')
    })

    test('イベントのタイトルと時間を入力できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Event creation form not yet implemented')
    })
  })

  test.describe('イベント表示', () => {
    test('イベントがカレンダー上に表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Check for events
      // Note: Requires seeded test events
      test.skip(true, 'Requires seeded test events')
    })

    test('イベントをクリックすると詳細が表示される', async ({ authenticatedPage }) => {
      test.skip(true, 'Event detail view not yet implemented')
    })

    test('複数のイベントが同じ日に表示される', async ({ authenticatedPage }) => {
      test.skip(true, 'Requires seeded test events')
    })
  })

  test.describe('ナビゲーション', () => {
    test('前月/次月に移動できる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      // Navigate to next month
      const nextBtn = authenticatedPage.locator('button:has-text("Next")')
      await expect(nextBtn).toBeVisible()

      test.skip(true, 'Month navigation buttons need testIds')
    })

    test('「今日」ボタンで今日に戻れる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navCalendar)
      await authenticatedPage.waitForURL('/calendar')

      const todayBtn = authenticatedPage.locator('button:has-text("Today")')
      await expect(todayBtn).toBeVisible()

      test.skip(true, 'Today button needs testId')
    })
  })

  test.describe('イベント編集・削除', () => {
    test('イベントを編集できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Event editing not yet implemented')
    })

    test('イベントを削除できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Event deletion not yet implemented')
    })
  })
})

/**
 * Contract Tests
 *
 * These tests document the expected contract for calendar features.
 */
test.describe.skip('カレンダーコントラクトテスト', () => {
  test('イベント作成リクエスト形式', async () => {
    // Contract: POST /api/v1/calendar/events
    // Request: { title, start, end, description?, location? }
    // Response: { id, title, start, end, description, location }
    expect(true).toBe(true) // Placeholder
  })

  test('イベント一覧レスポンス形式', async () => {
    // Contract: GET /api/v1/calendar/events?start=&end=
    // Response: [{ id, title, start, end }]
    expect(true).toBe(true) // Placeholder
  })

  test('イベント更新リクエスト形式', async () => {
    // Contract: PUT /api/v1/calendar/events/:id
    // Request: { title?, start?, end?, description?, location? }
    // Response: Updated event object
    expect(true).toBe(true) // Placeholder
  })

  test('イベント削除リクエスト形式', async () => {
    // Contract: DELETE /api/v1/calendar/events/:id
    // Response: 204 No Content
    expect(true).toBe(true) // Placeholder
  })
})
