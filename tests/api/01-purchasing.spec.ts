import { test, expect, refs, itemBatches } from '../fixtures/api'

const sum = (batches: any[]) => batches.reduce((s, b) => s + b.quantity, 0)

test.describe('Purchasing → Goods Receipt (raw stock in)', () => {
  test('PO create → confirm → full receipt increases raw stock and marks PO fully_received', async ({ api }) => {
    const supplier = await refs.supplier(api) // SUP-001
    const warehouse = await refs.warehouse(api) // WH-001
    const sugar = await refs.item(api, 'RM-002') // low-stock raw material
    const gUnit = await refs.unit(api, 'G')

    const before = sum(await itemBatches(api, sugar.id))

    // 1) create PO (draft)
    const poRes = await api.post('/api/purchase-orders', {
      data: {
        supplierId: supplier.id,
        orderDate: new Date().toISOString(),
        items: [{ itemId: sugar.id, quantity: 500, unitId: gUnit.id, unitPrice: 0.05, taxRate: 0 }],
      },
    })
    expect(poRes.status()).toBe(201)
    const po = (await poRes.json()).purchaseOrder
    expect(po.status).toBe('draft')

    // 2) confirm
    const confRes = await api.put(`/api/purchase-orders/${po.id}/confirm`)
    expect(confRes.ok()).toBeTruthy()
    expect((await confRes.json()).purchaseOrder.status).toBe('confirmed')

    // 3) receive in full
    const grRes = await api.post('/api/goods-receipts', {
      data: {
        poId: po.id,
        warehouseId: warehouse.id,
        receiptDate: new Date().toISOString(),
        items: [{ itemId: sugar.id, batchNumber: 'GR-SUGAR-1', quantity: 500, unitId: gUnit.id, unitCost: 0.05 }],
      },
    })
    expect(grRes.status()).toBe(201)

    // raw stock increased by exactly 500
    const after = sum(await itemBatches(api, sugar.id))
    expect(after).toBe(before + 500)

    // PO is now fully_received
    const poGet = await api.get(`/api/purchase-orders/${po.id}`)
    const body = await poGet.json()
    const status = (body.purchaseOrder ?? body.po ?? body).status
    expect(status).toBe('fully_received')
  })

  test('PO rejects empty items', async ({ api }) => {
    const supplier = await refs.supplier(api)
    const res = await api.post('/api/purchase-orders', {
      data: { supplierId: supplier.id, orderDate: new Date().toISOString(), items: [] },
    })
    expect(res.ok()).toBeFalsy()
  })
})
