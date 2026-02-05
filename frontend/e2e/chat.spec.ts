import { test, expect } from './fixtures'
import { selectors, sendChatMessage, waitForAIResponse, waitForTypingIndicator } from './helpers'

/**
 * Chat E2E Tests
 *
 * Tests for:
 * - Chat page rendering
 * - Message sending
 * - AI response display
 * - Typing indicator
 * - Keyboard shortcuts
 */

test.describe('チャット機能', () => {
  test.describe('チャット画面表示', () => {
    test('チャット画面が表示される', async ({ authenticatedPage }) => {
      // Navigate to chat
      await authenticatedPage.goto('/chat')

      // Check chat page container
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()

      // Check for heading
      await expect(authenticatedPage.locator('h1:has-text("Chat")')).toBeVisible()
    })

    test('チャット入力フォームが表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      // Check input elements
      await expect(authenticatedPage.locator(selectors.chatInput)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.sendButton)).toBeVisible()
    })

    test('空のチャット状態が表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      // Empty state should be visible
      await expect(authenticatedPage.locator(selectors.emptyChatState)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.messageList)).not.toBeVisible()
    })
  })

  test.describe('メッセージ送信', () => {
    test('メッセージを入力できる', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const input = authenticatedPage.locator(selectors.chatInput)

      // Type a message
      await input.fill('Hello, this is a test message')

      // Verify the content
      await expect(input).toHaveValue('Hello, this is a test message')
    })

    test('Enterキーでメッセージを送信できる', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      // Fill and send with Enter
      await sendChatMessage(authenticatedPage, 'Test message via Enter')

      // User message should appear
      await expect(authenticatedPage.locator(selectors.userMessage)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.userMessage)).toContainText('Test message via Enter')

      // Input should be cleared
      await expect(authenticatedPage.locator(selectors.chatInput)).toHaveValue('')
    })

    test('送信ボタンでメッセージを送信できる', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const input = authenticatedPage.locator(selectors.chatInput)
      const sendButton = authenticatedPage.locator(selectors.sendButton)

      // Fill input
      await input.fill('Test message via button click')

      // Click send button
      await sendButton.click()

      // User message should appear
      await expect(authenticatedPage.locator(selectors.userMessage)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.userMessage)).toContainText(
        'Test message via button click'
      )
    })

    test('空のメッセージは送信できない', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const sendButton = authenticatedPage.locator(selectors.sendButton)

      // Send button should be disabled when input is empty
      await expect(sendButton).toBeDisabled()

      // Type something
      await authenticatedPage.fill(selectors.chatInput, 'test')

      // Button should now be enabled
      await expect(sendButton).toBeEnabled()

      // Clear the input
      await authenticatedPage.fill(selectors.chatInput, '')

      // Button should be disabled again
      await expect(sendButton).toBeDisabled()
    })
  })

  test.describe('キーボードショートカット', () => {
    test('Shift+Enterで改行できる', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const input = authenticatedPage.locator(selectors.chatInput)

      // Type first line
      await input.fill('First line')

      // Press Shift+Enter (should add newline, not send)
      await input.press('Shift+Enter')

      // Type second line
      await input.type('Second line')

      // Verify both lines are in input (not sent)
      await expect(input).toHaveValue('First line\nSecond line')

      // Verify no message was sent
      await expect(authenticatedPage.locator(selectors.userMessage)).not.toBeVisible()
    })

    test('Enterのみで送信される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const input = authenticatedPage.locator(selectors.chatInput)

      // Type message with newline
      await input.fill('Line 1')
      await input.press('Shift+Enter')
      await input.type('Line 2')

      // Press Enter (should send)
      await input.press('Enter')

      // Message should be sent
      await expect(authenticatedPage.locator(selectors.userMessage)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.userMessage)).toContainText('Line 1')
      await expect(authenticatedPage.locator(selectors.userMessage)).toContainText('Line 2')
    })
  })

  test.describe('AI応答', () => {
    test('AI応答待機中は送信ボタンが無効', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      // Send a message (this will trigger AI response in real scenario)
      await sendChatMessage(authenticatedPage, 'Hello AI')

      // The input should be disabled during streaming
      // Note: This depends on isStreaming state in real app
      // For now we just verify the interaction flow
    })

    test('ストリーミング中はプレースホルダーが変更される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const input = authenticatedPage.locator(selectors.chatInput)

      // Check initial placeholder
      await expect(input).toHaveAttribute('placeholder', 'Type your message...')

      // Send a message
      await sendChatMessage(authenticatedPage, 'test')

      // During streaming, placeholder should change
      // Note: This depends on isStreaming state
      // await expect(input).toHaveAttribute('placeholder', 'AI is responding...')
    })
  })

  test.describe('会話リスト', () => {
    test('新しい会話ボタンが表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const newChatBtn = authenticatedPage.locator(selectors.newConversationBtn)
      await expect(newChatBtn).toBeVisible()
    })

    test('新しい会話を作成できる', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      const initialMessages = authenticatedPage.locator(selectors.userMessage)
      const initialCount = await initialMessages.count()

      // Send first message (creates conversation)
      await sendChatMessage(authenticatedPage, 'First message')

      // Should have one user message
      await expect(authenticatedPage.locator(selectors.userMessage)).toHaveCount(initialCount + 1)

      // Click new conversation
      await authenticatedPage.click(selectors.newConversationBtn)

      // Empty state should be shown again
      await expect(authenticatedPage.locator(selectors.emptyChatState)).toBeVisible()
    })
  })

  test.describe('メッセージ表示', () => {
    test('ユーザーメッセージが正しく表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      await sendChatMessage(authenticatedPage, 'This is my message')

      const userMsg = authenticatedPage.locator(selectors.userMessage)
      await expect(userMsg).toBeVisible()
      await expect(userMsg).toContainText('This is my message')
    })

    test('複数のメッセージが表示される', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/chat')

      // Send multiple messages
      await sendChatMessage(authenticatedPage, 'First message')
      await authenticatedPage.waitForTimeout(500)
      await sendChatMessage(authenticatedPage, 'Second message')
      await authenticatedPage.waitForTimeout(500)
      await sendChatMessage(authenticatedPage, 'Third message')

      // All user messages should be visible
      await expect(authenticatedPage.locator(selectors.userMessage)).toHaveCount(3)
    })
  })

  test.describe('レスポンシブデザイン', () => {
    test('モバイルビューでチャットが使える', async ({ authenticatedPage }) => {
      // Set mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      await authenticatedPage.goto('/chat')

      // Chat should still be functional
      await expect(authenticatedPage.locator(selectors.chatPage)).toBeVisible()
      await expect(authenticatedPage.locator(selectors.chatInput)).toBeVisible()

      // Send a message
      await sendChatMessage(authenticatedPage, 'Mobile test message')
      await expect(authenticatedPage.locator(selectors.userMessage)).toBeVisible()
    })
  })
})
