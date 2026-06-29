import { test, expect, refs } from '../fixtures/api'

test.describe('Stage-2 UI pages', () => {
  test('Users page lists seeded users (admin)', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByText('admin@beverage.com')).toBeVisible()
    await expect(page.getByText('user@beverage.com')).toBeVisible()
  })

  test('Item detail page renders (no 404)', async ({ page }) => {
    await page.goto('/items')
    await page.getByText('Orange Concentrate').click()
    await expect(page).toHaveURL(/\/items\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Orange Concentrate' })).toBeVisible()
  })

  test('SKU detail page renders (no 404)', async ({ page }) => {
    await page.goto('/skus')
    await page.getByText('SKU-OJ1L').first().click()
    await expect(page).toHaveURL(/\/skus\/\d+$/)
  })

  test('Recipe detail page renders (no 404)', async ({ api, page }) => {
    const sku = await refs.sku(api)
    const skuFull = (await (await api.get(`/api/skus/${sku.id}`)).json()).sku
    const recipeId = (skuFull.recipeVersions ?? [])[0].id
    await page.goto(`/recipes/${recipeId}`)
    await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}$`))
    await expect(page.getByText('Orange Juice 1L').first()).toBeVisible()
  })

  test('Edit-order page shows the warning banner for a confirmed order', async ({ api, page }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-001')
    const pcs = await refs.unit(api, 'PCS')
    const order = (await (await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: 1, unitId: pcs.id, unitPrice: 40, taxRate: 0 }],
      },
    })).json()).order
    await api.put(`/api/customer-orders/${order.id}/confirm`)

    await page.goto(`/customer-orders/${order.id}/edit`)
    await expect(page.getByText(/Editing it may not match/i)).toBeVisible()
  })
})
