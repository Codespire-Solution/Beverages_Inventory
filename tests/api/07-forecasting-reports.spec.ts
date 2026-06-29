import { test, expect, refs } from '../fixtures/api'

test.describe('Forecasting & Reports', () => {
  test('generate forecast for a SKU returns forecasts + average', async ({ api }) => {
    const sku = await refs.sku(api)
    const res = await api.post('/api/forecasts/generate', { data: { skuId: sku.id, months: 3 } })
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(Array.isArray(data.forecasts)).toBeTruthy()
    expect(data).toHaveProperty('average')
  })

  test('generate requires skuId (400 without it)', async ({ api }) => {
    expect((await api.post('/api/forecasts/generate', { data: {} })).status()).toBe(400)
  })

  test('forecast accuracy endpoint responds', async ({ api }) => {
    expect((await api.get('/api/forecasts/accuracy')).ok()).toBeTruthy()
  })

  test('report endpoints return data (200)', async ({ api }) => {
    for (const path of [
      '/api/reports/sales',
      '/api/reports/purchases',
      '/api/reports/inventory',
      '/api/reports/production',
      '/api/reports/inventory/valuation',
      '/api/reports/inventory/movement',
    ]) {
      const res = await api.get(path)
      expect(res.ok(), `${path} should return 200`).toBeTruthy()
    }
  })
})
