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
    const threshold = parseInt(searchParams.get('threshold') || '100')

    // Get batches with quantity below threshold
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        quantity: {
          lt: threshold,
        },
      },
      include: {
        item: true,
        warehouse: true,
        unit: true,
      },
      orderBy: {
        quantity: 'asc',
      },
    })

    // Group by item and warehouse to get total stock per item per warehouse
    const lowStockItems = batches.reduce((acc: any, batch) => {
      const key = `${batch.itemId}-${batch.warehouseId}`
      if (!acc[key]) {
        acc[key] = {
          item: batch.item,
          warehouse: batch.warehouse,
          totalQuantity: 0,
          batches: [],
        }
      }
      acc[key].totalQuantity += batch.quantity
      acc[key].batches.push(batch)
      return acc
    }, {})

    return NextResponse.json({
      lowStockItems: Object.values(lowStockItems),
      threshold,
    })
  } catch (error) {
    console.error('Low stock GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

