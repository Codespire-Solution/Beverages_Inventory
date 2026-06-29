import { test, expect } from '@playwright/test'

/**
 * UI happy-path journey: create a customer order through the New Order screen
 * and land on its detail page. Exercises the shared CustomerOrderForm end to end.
 */
test('UI: create a customer order and save as pending', async ({ page }) => {
  await page.goto('/customer-orders/new')

  // header
  await expect(page.getByRole('heading', { name: 'Create Customer Order' })).toBeVisible()

  // pick customer + add one line item
  await page.getByLabel('Customer').selectOption({ label: 'Sharma Stores' })
  await page.getByLabel('SKU').selectOption({ label: 'SKU-OJ1L - Orange Juice 1L' })
  await page.getByLabel('Quantity', { exact: true }).fill('2')
  await page.getByLabel('Unit Price', { exact: true }).fill('40')

  await page.getByRole('button', { name: 'Add', exact: true }).click()

  // the line item now appears in the table (the Remove button only exists for added rows)
  await expect(page.getByTitle('Remove')).toBeVisible()

  // save as pending → redirect to the order detail page
  await page.getByRole('button', { name: 'Save as Pending' }).click()
  await expect(page).toHaveURL(/\/customer-orders\/\d+$/)
})
