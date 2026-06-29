import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { skuId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const skuId = parseInt(params.skuId)
    if (isNaN(skuId)) {
      return NextResponse.json({ error: 'Invalid SKU ID' }, { status: 400 })
    }

    // Get SKU to find its code
    const sku = await prisma.sku.findUnique({
      where: { id: skuId },
    })

    if (!sku) {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 })
    }

    // Find finished goods item with matching code
    const finishedGoodsItem = await prisma.item.findFirst({
      where: {
        code: sku.code,
        category: 'finished_good',
      },
    })

    if (!finishedGoodsItem) {
      // No finished goods item exists, so stock is 0
      return NextResponse.json({ totalStock: 0, stockByWarehouse: [] })
    }

    // Get all batches for this finished goods item
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        itemId: finishedGoodsItem.id,
        quantity: {
          gt: 0, // Only batches with available stock
        },
      },
      include: {
        warehouse: true,
        unit: true,
      },
      orderBy: {
        warehouseId: 'asc',
      },
    })

    // Calculate total stock
    const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0)

    // Group by warehouse
    const stockByWarehouse = batches.reduce((acc: any, batch) => {
      const warehouseId = batch.warehouseId
      if (!acc[warehouseId]) {
        acc[warehouseId] = {
          warehouse: batch.warehouse,
          totalQuantity: 0,
          batches: [],
        }
      }
      acc[warehouseId].totalQuantity += batch.quantity
      acc[warehouseId].batches.push({
        id: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        unit: batch.unit,
        expiryDate: batch.expiryDate,
        receivedDate: batch.receivedDate,
      })
      return acc
    }, {})

    return NextResponse.json({
      totalStock,
      stockByWarehouse: Object.values(stockByWarehouse),
    })
  } catch (error) {
    console.error('SKU stock GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


