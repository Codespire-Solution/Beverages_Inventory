import { test, expect, refs, skuStock, itemBatches } from '../fixtures/api'

/** Finished-good item shares the SKU code, so its batches ARE the SKU's sellable stock. */
const fgItem = (api: any) => refs.item(api, 'SKU-OJ1L')

test.describe('Sales: order totals, FIFO delivery, partial, insufficient', () => {
  test('order totals include tax (10 x 40 @5% = 420)', async ({ api }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-001')
    const pcs = await refs.unit(api, 'PCS')
    const res = await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: 10, unitId: pcs.id, unitPrice: 40, taxRate: 5 }],
      },
    })
    expect(res.status()).toBe(201)
    const order = (await res.json()).order
    expect(order.totalAmount).toBeCloseTo(400, 2)
    expect(order.taxAmount).toBeCloseTo(20, 2)
    expect(order.grandTotal).toBeCloseTo(420, 2)
  })

  test('multi-item order sums line totals (3x40 + 2x50 = 220)', async ({ api }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-002')
    const pcs = await refs.unit(api, 'PCS')
    const res = await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [
          { skuId: sku.id, quantity: 3, unitId: pcs.id, unitPrice: 40, taxRate: 0 },
          { skuId: sku.id, quantity: 2, unitId: pcs.id, unitPrice: 50, taxRate: 0 },
        ],
      },
    })
    expect(res.status()).toBe(201)
    const order = (await res.json()).order
    expect(order.totalAmount).toBeCloseTo(220, 2)
  })

  test('FIFO delivery empties the soonest-expiry lot first and decrements stock', async ({ api }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-002')
    const warehouse = await refs.warehouse(api)
    const pcs = await refs.unit(api, 'PCS')
    const fg = await fgItem(api)

    const before = (await itemBatches(api, fg.id)).filter((b) => b.quantity > 0)
    const sorted = before.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    )
    expect(sorted.length, 'need >=2 finished lots for FIFO test').toBeGreaterThanOrEqual(2)
    const first = sorted[0]
    const second = sorted[1]
    const qty = first.quantity + 5 // empty lot #1, take 5 from lot #2

    const oRes = await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: qty, unitId: pcs.id, unitPrice: 40, taxRate: 0 }],
      },
    })
    const order = (await oRes.json()).order
    expect((await api.put(`/api/customer-orders/${order.id}/confirm`)).ok()).toBeTruthy()

    // preview picks soonest-expiry lot first
    const prev = await api.get(`/api/customer-orders/${order.id}/preview-delivery?warehouseId=${warehouse.id}`)
    const preview = await prev.json()
    expect(preview.allSufficient).toBeTruthy()
    const line = preview.items.find((i: any) => i.skuId === sku.id)
    expect(line.fifoBatches[0].batch.batchNumber).toBe(first.batchNumber)

    // deliver (auto FIFO)
    const dRes = await api.post('/api/sales-deliveries', {
      data: {
        orderId: order.id,
        warehouseId: warehouse.id,
        deliveryDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: qty, unitId: pcs.id }],
      },
    })
    expect(dRes.status()).toBe(201)

    const after = await itemBatches(api, fg.id)
    const firstAfter = after.find((b) => b.batchNumber === first.batchNumber)
    expect(firstAfter ? firstAfter.quantity : 0).toBe(0) // lot #1 emptied
    const secondAfter = after.find((b) => b.batchNumber === second.batchNumber)
    expect(secondAfter.quantity).toBeCloseTo(second.quantity - 5, 2) // 5 taken from lot #2

    const oGet = await api.get(`/api/customer-orders/${order.id}`)
    expect((await oGet.json()).order.status).toBe('delivered')
  })

  test('insufficient stock blocks delivery', async ({ api }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-001')
    const warehouse = await refs.warehouse(api)
    const pcs = await refs.unit(api, 'PCS')

    const qty = (await skuStock(api, sku.id)) + 1000
    const oRes = await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: qty, unitId: pcs.id, unitPrice: 40, taxRate: 0 }],
      },
    })
    const order = (await oRes.json()).order
    await api.put(`/api/customer-orders/${order.id}/confirm`)

    const prev = await api.get(`/api/customer-orders/${order.id}/preview-delivery?warehouseId=${warehouse.id}`)
    expect((await prev.json()).allSufficient).toBeFalsy()

    const dRes = await api.post('/api/sales-deliveries', {
      data: {
        orderId: order.id,
        warehouseId: warehouse.id,
        deliveryDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: qty, unitId: pcs.id }],
      },
    })
    expect(dRes.ok()).toBeFalsy() // delivery rejected
  })

  test('partial delivery keeps order confirmed with fulfilledQuantity', async ({ api }) => {
    const sku = await refs.sku(api)
    const cust = await refs.customer(api, 'CUST-002')
    const warehouse = await refs.warehouse(api)
    const pcs = await refs.unit(api, 'PCS')

    const stock = await skuStock(api, sku.id)
    test.skip(stock < 6, 'not enough finished stock left for partial test')

    const oRes = await api.post('/api/customer-orders', {
      data: {
        customerId: cust.id,
        orderDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: 6, unitId: pcs.id, unitPrice: 40, taxRate: 0 }],
      },
    })
    const order = (await oRes.json()).order
    await api.put(`/api/customer-orders/${order.id}/confirm`)

    const dRes = await api.post('/api/sales-deliveries', {
      data: {
        orderId: order.id,
        warehouseId: warehouse.id,
        deliveryDate: new Date().toISOString(),
        items: [{ skuId: sku.id, quantity: 2, unitId: pcs.id }],
      },
    })
    expect(dRes.status()).toBe(201)

    const got = (await (await api.get(`/api/customer-orders/${order.id}`)).json()).order
    expect(got.status).toBe('confirmed') // not fully delivered
    const item = got.items.find((i: any) => i.skuId === sku.id)
    expect(item.fulfilledQuantity).toBeCloseTo(2, 2)
  })
})
