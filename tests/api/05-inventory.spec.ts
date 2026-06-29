import { test, expect, refs, itemBatches } from '../fixtures/api'

test.describe('Inventory: adjustments, transfers, alerts', () => {
  test('stock adjustment decreases a batch quantity', async ({ api }) => {
    const wh1 = await refs.warehouse(api, 'WH-001')
    const water = await refs.item(api, 'RM-003')
    const ml = await refs.unit(api, 'ML')
    const wt = (await itemBatches(api, water.id)).find((b) => b.batchNumber === 'WT-A')
    const before = wt.quantity

    const res = await api.post('/api/stock-adjustments', {
      data: {
        warehouseId: wh1.id,
        adjustmentDate: new Date().toISOString(),
        reason: 'count correction',
        items: [{ itemId: water.id, batchId: wt.id, quantityChange: -100, unitId: ml.id }],
      },
    })
    expect(res.status()).toBe(201)

    const after = (await itemBatches(api, water.id)).find((b) => b.id === wt.id).quantity
    expect(after).toBeCloseTo(before - 100, 2)
  })

  test('stock transfer moves stock between warehouses; over-transfer blocked', async ({ api }) => {
    const from = await refs.warehouse(api, 'WH-002')
    const to = await refs.warehouse(api, 'WH-001')
    const oc = await refs.item(api, 'RM-001')
    const ml = await refs.unit(api, 'ML')
    const w2 = (await itemBatches(api, oc.id)).find((b) => b.batchNumber === 'OC-W2') // 25 in WH-002
    expect(w2, 'seed should have OC-W2 in WH-002').toBeTruthy()

    // over-transfer (more than available) -> rejected
    const over = await api.post('/api/stock-transfers', {
      data: {
        fromWarehouseId: from.id,
        toWarehouseId: to.id,
        transferDate: new Date().toISOString(),
        items: [{ itemId: oc.id, batchId: w2.id, quantity: w2.quantity + 100, unitId: ml.id }],
      },
    })
    expect(over.ok()).toBeFalsy()

    // valid transfer of 10 decrements the source batch
    const ok = await api.post('/api/stock-transfers', {
      data: {
        fromWarehouseId: from.id,
        toWarehouseId: to.id,
        transferDate: new Date().toISOString(),
        items: [{ itemId: oc.id, batchId: w2.id, quantity: 10, unitId: ml.id }],
      },
    })
    expect(ok.status()).toBe(201)
    const w2After = (await itemBatches(api, oc.id)).find((b) => b.id === w2.id)
    expect(w2After.quantity).toBeCloseTo(w2.quantity - 10, 2)
  })

  test('same-warehouse transfer rejected', async ({ api }) => {
    const wh = await refs.warehouse(api, 'WH-001')
    const oc = await refs.item(api, 'RM-001')
    const ml = await refs.unit(api, 'ML')
    const b = (await itemBatches(api, oc.id)).find((x) => x.warehouseId === wh.id)
    const res = await api.post('/api/stock-transfers', {
      data: {
        fromWarehouseId: wh.id,
        toWarehouseId: wh.id,
        transferDate: new Date().toISOString(),
        items: [{ itemId: oc.id, batchId: b.id, quantity: 1, unitId: ml.id }],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('low-stock alert lists the below-minimum item (RM-002)', async ({ api }) => {
    const res = await api.get('/api/inventory/low-stock?threshold=100')
    expect(res.ok()).toBeTruthy()
    const codes = (await res.json()).lowStockItems.map((x: any) => x.item?.code)
    expect(codes).toContain('RM-002')
  })

  test('expiring alert lists soon-to-expire batches', async ({ api }) => {
    const res = await api.get('/api/inventory/expiring?days=30')
    expect(res.ok()).toBeTruthy()
    expect((await res.json()).batches.length).toBeGreaterThan(0)
  })
})
