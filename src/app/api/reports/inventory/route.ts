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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (itemId) where.itemId = parseInt(itemId)
    if (startDate || endDate) {
      where.receivedDate = {}
      if (startDate) where.receivedDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.receivedDate.lte = end
      }
    }

    // Get all inventory batches
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

    // Group by warehouse and item
    const stockByWarehouse = filteredBatches.reduce((acc: any, batch) => {
      const key = `${batch.warehouseId}-${batch.itemId}`
      if (!acc[key]) {
        acc[key] = {
          warehouse: batch.warehouse,
          item: batch.item,
          totalQuantity: 0,
          totalValue: 0,
          batches: [],
        }
      }
      const cost = batch.unitCost || batch.item.standardCost
      acc[key].totalQuantity += batch.quantity
      acc[key].totalValue += batch.quantity * cost
      acc[key].batches.push(batch)
      return acc
    }, {})

    // Get low stock items (below min stock quantity or 100 if not set)
    const lowStockItems = filteredBatches.filter((b) => {
      const minStock = b.item.minStockQuantity || 100
      return b.quantity < minStock
    })

    // Get expiring items (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const expiringItems = filteredBatches.filter(
      (b) => b.expiryDate && b.expiryDate <= thirtyDaysFromNow && b.expiryDate >= new Date()
    )

    return NextResponse.json({
      stockByWarehouse: Object.values(stockByWarehouse),
      lowStockItems: lowStockItems.length,
      expiringItems: expiringItems.length,
      totalItems: filteredBatches.length,
    })
  } catch (error) {
    console.error('Inventory report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
