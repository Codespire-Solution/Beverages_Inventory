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

    // Get all finished goods items
    const finishedGoodsItems = await prisma.item.findMany({
      where: {
        category: 'finished_good',
        isActive: true,
      },
      include: {
        baseUnit: true,
        preferredUnit: true,
      },
    })

    // Get stock for each finished goods item (which corresponds to SKUs)
    const finishedGoodsStock = await Promise.all(
      finishedGoodsItems.map(async (item) => {
        // Find matching SKU by code
        const sku = await prisma.sku.findUnique({
          where: { code: item.code },
        })

        if (!sku) return null

        // Get all batches for this item
        const whereClause: any = {
          itemId: item.id,
          quantity: { gt: 0 },
        }
        if (warehouseId) whereClause.warehouseId = parseInt(warehouseId)

        const batches = await prisma.inventoryBatch.findMany({
          where: whereClause,
          include: {
            warehouse: true,
            unit: true,
          },
        })

        // Convert all batches to base unit and sum
        let totalStockInBaseUnit = 0
        const stockByWarehouse: any[] = []

        for (const batch of batches) {
          const batchUnit = batch.unit
          let batchQuantityInBase = batch.quantity
          
          if (batchUnit.baseUnitId) {
            batchQuantityInBase = batch.quantity * batchUnit.conversionFactor
          }

          totalStockInBaseUnit += batchQuantityInBase

          // Group by warehouse
          const existingWarehouse = stockByWarehouse.find(
            (w) => w.warehouseId === batch.warehouseId
          )
          if (existingWarehouse) {
            existingWarehouse.totalQuantity += batchQuantityInBase
          } else {
            stockByWarehouse.push({
              warehouseId: batch.warehouseId,
              warehouse: batch.warehouse,
              totalQuantity: batchQuantityInBase,
            })
          }
        }

        // Convert to preferred unit
        let totalStock = totalStockInBaseUnit
        let displayUnit = item.baseUnit

        if (item.preferredUnitId && item.preferredUnit) {
          const preferredUnit = item.preferredUnit
          if (preferredUnit.baseUnitId) {
            totalStock = totalStockInBaseUnit / preferredUnit.conversionFactor
          }
          displayUnit = preferredUnit
        }

        // Convert warehouse stocks to preferred unit
        stockByWarehouse.forEach((w) => {
          if (item.preferredUnitId && item.preferredUnit) {
            const preferredUnit = item.preferredUnit
            if (preferredUnit.baseUnitId) {
              w.totalQuantity = w.totalQuantity / preferredUnit.conversionFactor
            }
          }
        })

        return {
          skuId: sku.id,
          skuCode: sku.code,
          skuName: sku.name,
          itemId: item.id,
          totalStock,
          displayUnit: {
            id: displayUnit.id,
            code: displayUnit.code,
            name: displayUnit.name,
          },
          stockByWarehouse,
          minStockQuantity: item.minStockQuantity,
          isLowStock: item.minStockQuantity
            ? totalStock < item.minStockQuantity
            : false,
        }
      })
    )

    // Filter out nulls and apply filters
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


