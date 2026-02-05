import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 *
 * Configured for Smart Office AI frontend testing.
 * Tests run against the Vite dev server which is started automatically.
 *
 * NixOS: Use system chromium via channel
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Fully parallelize tests by default
  fullyParallel: false,

  // Limit parallel workers to avoid login conflicts
  workers: 1,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/e2e/junit.xml' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests - uses Vite dev server
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the test for debugging
    trace: 'on-first-retry',

    // Screenshot: only on failure
    screenshot: 'only-on-failure',

    // Video: retain on failure
    video: 'retain-on-failure',

    // Navigation timeout (longer for AI responses)
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 10000,
  },

  // Projects define different test configurations
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // On NixOS, use system chromium directly
        // Provide path via PLAYWRIGHT_CHROMIUM_PATH env var
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start the dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
