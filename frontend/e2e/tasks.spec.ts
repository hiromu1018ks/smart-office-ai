import { test, expect } from './fixtures'
import { selectors } from './helpers'

/**
 * Tasks E2E Tests
 *
 * Tests for:
 * - Task list rendering
 * - Task creation
 * - Task completion toggle
 * - Task editing/deletion
 * - Task filtering (all/active/completed)
 *
 * NOTE: Some tests may be skipped until tasks are fully implemented.
 * These tests document the expected behavior for future implementation.
 */

test.describe('タスク管理', () => {
  test.describe('タスク一覧', () => {
    test('タスクページが表示される', async ({ authenticatedPage }) => {
      // Navigate to tasks page
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Check that tasks page is visible
      await expect(authenticatedPage.locator(selectors.tasksPage)).toBeVisible()
    })

    test('空の状態が表示される（タスクがない場合）', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Check for empty state
      const emptyState = authenticatedPage.locator(selectors.emptyTasksState)
      await expect(emptyState).toBeVisible()
    })

    test('新規タスクボタンが表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Check for new task button
      const newTaskBtn = authenticatedPage.locator(selectors.taskNewBtn)
      await expect(newTaskBtn).toBeVisible()
    })
  })

  test.describe('タスク作成', () => {
    test('新規タスクを作成できる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Click new task button
      const newTaskBtn = authenticatedPage.locator(selectors.taskNewBtn)
      await newTaskBtn.click()

      // Fill in task details
      // Note: Task creation implementation pending
      test.skip(true, 'Task creation form not yet implemented')
    })

    test('タスクのタイトルを入力できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task creation form not yet implemented')
    })

    test('タスクの期日を設定できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task due date input not yet implemented')
    })

    test('タスクの優先度を設定できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task priority selection not yet implemented')
    })
  })

  test.describe('タスク操作', () => {
    test('タスクを完了できる', async ({ authenticatedPage }) => {
      // This test requires a task to exist first
      test.skip(true, 'Task completion not yet implemented - requires task creation first')

      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      const taskCheckbox = authenticatedPage.locator(selectors.taskCheckbox).first()
      await taskCheckbox.click()

      // Verify task is marked as completed
      // Implementation depends on UI feedback
    })

    test('完了したタスクを未完了に戻せる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task uncompletion not yet implemented')
    })

    test('タスクを編集できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task editing not yet implemented')
    })

    test('タスクを削除できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task deletion not yet implemented')
    })
  })

  test.describe('タスクフィルター', () => {
    test('すべてのタスクを表示できる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Click "All" filter
      const allFilter = authenticatedPage.locator('button:has-text("All")')
      await expect(allFilter).toBeVisible()

      test.skip(true, 'Task filter buttons need testIds')
    })

    test('アクティブなタスクのみ表示できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task filter buttons need testIds')
    })

    test('完了したタスクのみ表示できる', async ({ authenticatedPage }) => {
      test.skip(true, 'Task filter buttons need testIds')
    })
  })

  test.describe('タスク表示', () => {
    test('タスク一覧が正しく表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // When tasks exist, they should be displayed
      test.skip(true, 'Requires seeded test tasks')
    })

    test('タスクの詳細が表示される（期日、優先度など）', async ({ authenticatedPage }) => {
      test.skip(true, 'Requires seeded test tasks')
    })

    test('完了したタスクがスタイル変更で表示される', async ({ authenticatedPage }) => {
      test.skip(true, 'Requires seeded test tasks')
    })
  })

  test.describe('タスク検索', () => {
    test('タスクを検索できる', async ({ authenticatedPage }) => {
      await authenticatedPage.click(selectors.navTasks)
      await authenticatedPage.waitForURL('/tasks')

      // Search functionality
      test.skip(true, 'Task search not yet implemented')
    })
  })
})

/**
 * Contract Tests
 *
 * These tests document the expected contract for task management features.
 */
test.describe.skip('タスク管理コントラクトテスト', () => {
  test('タスク作成リクエスト形式', async () => {
    // Contract: POST /api/v1/tasks
    // Request: { title, description?, due_date?, priority?, status }
    // Response: { id, title, description, due_date, priority, status, created_at }
    expect(true).toBe(true) // Placeholder
  })

  test('タスク一覧レスポンス形式', async () => {
    // Contract: GET /api/v1/tasks?status=&search=
    // Response: [{ id, title, description, due_date, priority, status }]
    expect(true).toBe(true) // Placeholder
  })

  test('タスク更新リクエスト形式', async () => {
    // Contract: PUT /api/v1/tasks/:id
    // Request: { title?, description?, due_date?, priority?, status? }
    // Response: Updated task object
    expect(true).toBe(true) // Placeholder
  })

  test('タスク削除リクエスト形式', async () => {
    // Contract: DELETE /api/v1/tasks/:id
    // Response: 204 No Content
    expect(true).toBe(true) // Placeholder
  })

  test('タスク完了トグルリクエスト形式', async () => {
    // Contract: PATCH /api/v1/tasks/:id/toggle
    // Request: {}
    // Response: Updated task object with toggled status
    expect(true).toBe(true) // Placeholder
  })
})
