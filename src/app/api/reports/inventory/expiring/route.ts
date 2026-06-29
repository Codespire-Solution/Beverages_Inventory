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
    const days = parseInt(searchParams.get('days') || '30')

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + days)

    const where: any = {
      expiryDate: {
        lte: expiryDate,
        gte: new Date(),
      },
      quantity: {
        gt: 0,
      },
    }
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (itemId) where.itemId = parseInt(itemId)

    const batches = await prisma.inventoryBatch.findMany({
      where,
      include: {
        item: true,
        warehouse: true,
        unit: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    })

    // Filter by category if provided
    let filteredBatches = batches
    if (category) {
      filteredBatches = batches.filter((batch) => batch.item.category === category)
    }

    // Group by item and warehouse
    const expiringItems: { [key: string]: any } = {}
    filteredBatches.forEach((batch) => {
      const key = `${batch.itemId}-${batch.warehouseId}`
      if (!expiringItems[key]) {
        expiringItems[key] = {
          item: batch.item,
          warehouse: batch.warehouse,
          totalQuantity: 0,
          earliestExpiry: batch.expiryDate,
          batches: [],
        }
      }
      expiringItems[key].totalQuantity += batch.quantity
      if (batch.expiryDate && (!expiringItems[key].earliestExpiry || batch.expiryDate < expiringItems[key].earliestExpiry)) {
        expiringItems[key].earliestExpiry = batch.expiryDate
      }
      expiringItems[key].batches.push(batch)
    })

    return NextResponse.json({
      expiringItems: Object.values(expiringItems),
      days,
      totalItems: Object.keys(expiringItems).length,
    })
  } catch (error) {
    console.error('Expiring items report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


