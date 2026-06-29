import { test, expect, refs } from '../fixtures/api'

test.describe('Master data CRUD + validation', () => {
  test('warehouse: create, duplicate code rejected, missing field rejected', async ({ api }) => {
    expect((await api.post('/api/warehouses', { data: { code: 'WH-TEST', name: 'Test WH' } })).status()).toBe(201)
    expect((await api.post('/api/warehouses', { data: { code: 'WH-TEST', name: 'Dup' } })).status()).toBe(400)
    expect((await api.post('/api/warehouses', { data: { name: 'No Code' } })).status()).toBe(400)
  })

  test('supplier: create + duplicate code rejected', async ({ api }) => {
    expect((await api.post('/api/suppliers', { data: { code: 'SUP-TEST', name: 'T' } })).status()).toBe(201)
    expect((await api.post('/api/suppliers', { data: { code: 'SUP-TEST', name: 'T2' } })).status()).toBe(400)
  })

  test('customer: create with taxRate + duplicate rejected', async ({ api }) => {
    const c = await api.post('/api/customers', { data: { code: 'CUST-TEST', name: 'T', taxRate: 12 } })
    expect(c.status()).toBe(201)
    expect((await c.json()).customer.taxRate).toBe(12)
    expect((await api.post('/api/customers', { data: { code: 'CUST-TEST', name: 'T2' } })).status()).toBe(400)
  })

  test('item: create needs name/category/baseUnitId', async ({ api }) => {
    const g = await refs.unit(api, 'G')
    expect(
      (await api.post('/api/items', { data: { code: 'IT-TEST', name: 'Test Item', category: 'raw_material', baseUnitId: g.id } })).status()
    ).toBe(201)
    expect((await api.post('/api/items', { data: { name: 'No Category' } })).status()).toBe(400)
  })

  test('sku: create + duplicate + missing unitId rejected', async ({ api }) => {
    const pcs = await refs.unit(api, 'PCS')
    expect((await api.post('/api/skus', { data: { code: 'SKU-TEST', name: 'T', unitId: pcs.id } })).status()).toBe(201)
    expect((await api.post('/api/skus', { data: { code: 'SKU-TEST', name: 'T2', unitId: pcs.id } })).status()).toBe(400)
    expect((await api.post('/api/skus', { data: { code: 'SKU-TEST2', name: 'T3' } })).status()).toBe(400)
  })

  test('recipe: create version + duplicate version rejected', async ({ api }) => {
    const pcs = await refs.unit(api, 'PCS')
    const ml = await refs.unit(api, 'ML')
    const water = await refs.item(api, 'RM-003')
    const sku = (await (await api.post('/api/skus', { data: { code: 'SKU-REC', name: 'Recipe SKU', unitId: pcs.id } })).json()).sku
    const body = {
      skuId: sku.id,
      versionNumber: 1,
      effectiveFrom: new Date().toISOString(),
      ingredients: [{ itemId: water.id, quantity: 10, unitId: ml.id }],
    }
    expect((await api.post('/api/recipes', { data: body })).status()).toBe(201)
    expect((await api.post('/api/recipes', { data: body })).status()).toBe(400) // duplicate skuId+version
  })

  test('unit: admin can create + duplicate rejected', async ({ api }) => {
    expect((await api.post('/api/units', { data: { code: 'XU2', name: 'X Unit 2' } })).status()).toBe(201)
    expect((await api.post('/api/units', { data: { code: 'XU2', name: 'dup' } })).status()).toBe(400)
  })
})
