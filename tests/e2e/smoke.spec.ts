import { test, expect } from '@playwright/test'

/**
 * Phase 1 smoke tests — prove the harness works end to end:
 * global-setup reset+seeded the DB and saved an admin login, so these
 * pages should load while authenticated (no redirect to /login).
 */
test('admin lands on the dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Beverage Inventory' })).toBeVisible()
})

test('items page loads a seeded item (no 404)', async ({ page }) => {
  await page.goto('/items')
  await expect(page.getByText('Orange Concentrate')).toBeVisible()
})
