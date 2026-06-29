import { test, expect, refs } from '../fixtures/api'

test.describe('Production (recipe explosion + FIFO material preview + yield)', () => {
  test('preview explodes recipe and lists FIFO raw batches (soonest expiry first)', async ({ api }) => {
    const sku = await refs.sku(api) // SKU-OJ1L
    const warehouse = await refs.warehouse(api) // WH-001

    // active recipe version from the SKU detail
    const skuRes = await api.get(`/api/skus/${sku.id}`)
    expect(skuRes.ok()).toBeTruthy()
    const skuFull = (await skuRes.json()).sku
    const recipe = (skuFull.recipeVersions ?? []).find((r: any) => r.isActive) ?? skuFull.recipeVersions[0]
    expect(recipe, 'SKU should have a recipe version').toBeTruthy()

    // create production batch, target 5 units
    const target = 5
    const pbRes = await api.post('/api/production-batches', {
      data: {
        skuId: sku.id,
        recipeVersionId: recipe.id,
        warehouseId: warehouse.id,
        targetQuantity: target,
        productionDate: new Date().toISOString(),
      },
    })
    expect(pbRes.status()).toBe(201)
    const batch = (await pbRes.json()).batch
    expect(batch.status).toBe('in_progress')

    // preview material issue (FIFO)
    const prevRes = await api.get(
      `/api/production-batches/${batch.id}/preview-material-issue?warehouseId=${warehouse.id}`
    )
    expect(prevRes.ok()).toBeTruthy()
    const preview = await prevRes.json()
    expect(preview.allSufficient).toBeTruthy()

    // Orange concentrate: 20ml/unit * 5 = 100ml required, spanning lots OC-A → OC-B → OC-C
    const oc = await refs.item(api, 'RM-001')
    const ocLine = preview.materials.find((m: any) => m.item.id === oc.id)
    expect(ocLine, 'preview should include orange concentrate').toBeTruthy()
    // 20ml/unit * target 5 = 100ml required (FIFO spans lots OC-A→OC-B→OC-C)
    expect(ocLine.requiredQuantity).toBeCloseTo(100, 2)
    expect(ocLine.isSufficient).toBeTruthy()
    // FIFO: first picked lot is the soonest-expiry one (OC-A)
    expect(ocLine.fifoBatches[0].batch.batchNumber).toBe('OC-A')

    // complete the batch -> yield = actual/target * 100
    const compRes = await api.put(`/api/production-batches/${batch.id}/complete`, {
      data: { actualQuantity: 5, wasteQuantity: 0 },
    })
    expect(compRes.ok()).toBeTruthy()
    const completed = await compRes.json()
    expect(completed.batch.status).toBe('completed')
    expect(parseFloat(completed.yieldPercentage)).toBeCloseTo(100, 1)
  })
})
