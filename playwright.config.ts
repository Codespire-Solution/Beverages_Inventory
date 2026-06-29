import { defineConfig } from '@playwright/test'

/**
 * Playwright config for beverage-inventory E2E + API tests.
 * - globalSetup resets+seeds the DB and logs in (saves storageState).
 * - baseURL points at the dev server (port 3002 by default).
 * - workers:1 because all tests share one database.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',
    storageState: 'tests/.auth/admin.json',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
})
