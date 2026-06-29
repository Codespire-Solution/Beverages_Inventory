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
    const category = searchParams.get('category')
    const itemId = searchParams.get('itemId')
    const threshold = parseInt(searchParams.get('threshold') || '100')

    const where: any = {
      quantity: {
        gt: 0, // Only batches with stock
      },
    }
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (itemId) where.itemId = parseInt(itemId)

    // Get all batches
    const batches = await prisma.inventoryBatch.findMany({
      where,
      include: {
        item: true,
        warehouse: true,
        unit: true,
      },
    })

    // Filter by category if provided
    let filteredBatches = batches
    if (category) {
      filteredBatches = batches.filter((batch) => batch.item.category === category)
    }

    // Group by item and warehouse, calculate total stock
    const stockByItem: { [key: string]: any } = {}
    filteredBatches.forEach((batch) => {
      const key = `${batch.itemId}-${batch.warehouseId}`
      if (!stockByItem[key]) {
        stockByItem[key] = {
          item: batch.item,
          warehouse: batch.warehouse,
          totalQuantity: 0,
          batches: [],
        }
      }
      stockByItem[key].totalQuantity += batch.quantity
      stockByItem[key].batches.push(batch)
    })

    // Filter low stock items
    const lowStockItems = Object.values(stockByItem).filter((stock: any) => {
      const minStock = stock.item.minStockQuantity || threshold
      return stock.totalQuantity < minStock
    })

    return NextResponse.json({
      lowStockItems,
      threshold,
      totalItems: lowStockItems.length,
    })
  } catch (error) {
    console.error('Low stock report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


