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

    // Was N+1: 1 groupBy + N findUnique. Now: 2 queries total.
    const lowStockBatches = await prisma.inventoryBatch.groupBy({
      by: ['itemId', 'warehouseId'],
      where: { quantity: { lt: threshold } },
      _sum: { quantity: true },
    })

    const itemIds = [...new Set(lowStockBatches.map(b => b.itemId))]
    const items = itemIds.length
      ? await prisma.item.findMany({
          where: { id: { in: itemIds } },
          include: { baseUnit: true },
        })
      : []
    const itemById = new Map(items.map(i => [i.id, i]))

    const validSuggestions = lowStockBatches.flatMap(batch => {
      const item = itemById.get(batch.itemId)
      if (!item) return []
      const currentStock = batch._sum.quantity || 0
      const suggestedQuantity = Math.max(threshold - currentStock, item.moq || 0)
      return [{
        item,
        warehouseId: batch.warehouseId,
        currentStock,
        suggestedQuantity,
        moq: item.moq,
      }]
    })

    return NextResponse.json({ suggestions: validSuggestions })
  } catch (error) {
    console.error('Purchase suggestions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

