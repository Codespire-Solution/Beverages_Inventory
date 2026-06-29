import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const skuId = searchParams.get('skuId')
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')

    // Was N items × (1 SKU lookup + 1 batch query) = 2N round-trips.
    // Now: 3 queries total, regardless of N.
    const batchWhere: any = {
      quantity: { gt: 0 },
      item: { category: 'finished_good', isActive: true },
    }
    if (warehouseId) batchWhere.warehouseId = parseInt(warehouseId)

    const [finishedGoodsItems, batches, allSkus] = await Promise.all([
      prisma.item.findMany({
        where: { category: 'finished_good', isActive: true },
        include: { baseUnit: true, preferredUnit: true },
      }),
      prisma.inventoryBatch.findMany({
        where: batchWhere,
        select: {
          itemId: true,
          warehouseId: true,
          quantity: true,
          unit: { select: { baseUnitId: true, conversionFactor: true } },
          warehouse: true,
        },
      }),
      prisma.sku.findMany({
        select: { id: true, code: true, name: true },
      }),
    ])

    const skuByCode = new Map(allSkus.map(s => [s.code, s]))
    const batchesByItem = new Map<number, typeof batches>()
    for (const b of batches) {
      const list = batchesByItem.get(b.itemId)
      if (list) list.push(b)
      else batchesByItem.set(b.itemId, [b])
    }

    const finishedGoodsStock = finishedGoodsItems.map((item) => {
      const sku = skuByCode.get(item.code)
      if (!sku) return null

      const itemBatches = batchesByItem.get(item.id) ?? []
      let totalStockInBaseUnit = 0
      const stockByWarehouse: any[] = []

      for (const batch of itemBatches) {
        const factor = batch.unit.baseUnitId ? batch.unit.conversionFactor : 1
        const batchQuantityInBase = batch.quantity * factor
        totalStockInBaseUnit += batchQuantityInBase

        const existing = stockByWarehouse.find(w => w.warehouseId === batch.warehouseId)
        if (existing) {
          existing.totalQuantity += batchQuantityInBase
        } else {
          stockByWarehouse.push({
            warehouseId: batch.warehouseId,
            warehouse: batch.warehouse,
            totalQuantity: batchQuantityInBase,
          })
        }
      }

      let totalStock = totalStockInBaseUnit
      let displayUnit = item.baseUnit
      if (item.preferredUnitId && item.preferredUnit) {
        if (item.preferredUnit.baseUnitId) {
          totalStock = totalStockInBaseUnit / item.preferredUnit.conversionFactor
        }
        displayUnit = item.preferredUnit
      }

      stockByWarehouse.forEach(w => {
        if (item.preferredUnitId && item.preferredUnit?.baseUnitId) {
          w.totalQuantity = w.totalQuantity / item.preferredUnit.conversionFactor
        }
      })

      return {
        skuId: sku.id,
        skuCode: sku.code,
        skuName: sku.name,
        itemId: item.id,
        totalStock,
        displayUnit: { id: displayUnit.id, code: displayUnit.code, name: displayUnit.name },
        stockByWarehouse,
        minStockQuantity: item.minStockQuantity,
        isLowStock: item.minStockQuantity ? totalStock < item.minStockQuantity : false,
      }
    })

    let filtered = finishedGoodsStock.filter((stock) => stock !== null)

    if (skuId) {
      filtered = filtered.filter((s) => s?.skuId === parseInt(skuId))
    }

    if (lowStock) {
      filtered = filtered.filter((s) => s?.isLowStock)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s?.skuCode.toLowerCase().includes(searchLower) ||
          s?.skuName.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ finishedGoods: filtered })
  } catch (error) {
    console.error('Finished goods inventory GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


