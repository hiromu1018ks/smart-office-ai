# E2E Tests

This directory contains end-to-end tests using Playwright.

## Setup

Install Playwright browsers:

```bash
npm run test:e2e:install
```

## Running Tests

### Standard environments

```bash
# Run all E2E tests (Chrome, Firefox, Safari, Mobile)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run only Chromium tests
npm run test:e2e -- --project=chromium

# Run a specific test file
npm run test:e2e -- auth.spec.ts

# Run tests matching a pattern
npm run test:e2e -- -g "ログイン"
```

### NixOS

NixOS requires special handling to run Playwright tests:

```bash
# Using nix-shell with system chromium
nix-shell -p chromium --run 'cd frontend && PLAYWRIGHT_CHROMIUM_PATH=$(which chromium) npx playwright test --project=chromium'

# Or create an alias for convenience
alias e2e-test="nix-shell -p chromium --run 'cd frontend && PLAYWRIGHT_CHROMIUM_PATH=$(which chromium) npx playwright test'"
e2e-test --project=chromium
```

Alternatively, you can use `steam-run`:

```bash
steam-run npm run test:e2e
```

## View Test Results

```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── auth.spec.ts        # Authentication flow tests
├── chat.spec.ts        # Chat functionality tests
├── dashboard.spec.ts   # Dashboard tests
├── full-flow.spec.ts   # End-to-end integration tests
├── fixtures.ts         # Custom test fixtures (auth helpers)
├── helpers.ts          # Test utilities and selectors
└── README.md           # This file
```

## Test Coverage

### Authentication (`auth.spec.ts`)
- Login page display
- Form validation
- Error handling
- Protected route redirection
- Remember me functionality
- Logout functionality

### Dashboard (`dashboard.spec.ts`)
- Dashboard page display
- Stats cards rendering
- Quick actions navigation
- Recent activity section
- Sidebar navigation

### Chat (`chat.spec.ts`)
- Chat page display
- Message sending
- Keyboard shortcuts (Enter, Shift+Enter)
- AI response handling
- Conversation management
- Responsive design

### Full Flow (`full-flow.spec.ts`)
- Complete user flows
- Navigation between pages
- Error handling
- Browser back/forward buttons
- Smoke tests

## Known Issues

### NixOS Environment

If you're on NixOS, you may encounter this error:

```
NixOS cannot run dynamically linked executables intended for generic linux environments
```

To fix this, you need to install Chromium via your system package manager and tell Playwright to use it:

```bash
# Install chromium via nix
nix-shell -p chromium

# Then run tests with system Chromium
PLAYWRIGHT_BROWSERS_PATH=0 npm run test:e2e
```

Alternatively, use the Playwright UI mode which may work better:

```bash
npm run test:e2e:ui
```

### Backend Required

Some tests require the backend to be running:

```bash
# Start backend services
make up

# Then run E2E tests
npm run test:e2e
```

## Writing New Tests

1. Import fixtures for authenticated tests:

```typescript
import { test, expect } from './fixtures'
```

2. Use helpers for common actions:

```typescript
import { login, sendChatMessage, waitForAIResponse } from './helpers'

test('my test', async ({ page }) => {
  await login(page, { email: 'test@example.com', password: 'password' })
  await sendChatMessage(page, 'Hello')
  await waitForAIResponse(page)
})
```

3. Use authenticatedPage fixture for tests that require login:

```typescript
test('dashboard test', async ({ authenticatedPage }) => {
  // Already logged in!
  await expect(authenticatedPage.locator('h1')).toContainText('Dashboard')
})
```

## Test IDs

Components use `data-testid` attributes for stable selectors:

- `login-form`, `login-email`, `login-password`, `login-submit`
- `dashboard-page`, `stat-card-{name}`, `quick-action-{action}`
- `chat-page`, `chat-input`, `send-button`, `new-conversation-btn`
- `user-menu-trigger`, `logout-button`
- `nav-dashboard`, `nav-chat`, `nav-tasks`, etc.

See `helpers.ts` for a complete list of selectors.
