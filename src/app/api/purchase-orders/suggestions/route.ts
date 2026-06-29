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

    // Get low stock items
    const lowStockBatches = await prisma.inventoryBatch.groupBy({
      by: ['itemId', 'warehouseId'],
      where: {
        quantity: {
          lt: threshold,
        },
      },
      _sum: {
        quantity: true,
      },
    })

    const suggestions = await Promise.all(
      lowStockBatches.map(async (batch) => {
        const item = await prisma.item.findUnique({
          where: { id: batch.itemId },
          include: {
            baseUnit: true,
          },
        })

        if (!item) return null

        const currentStock = batch._sum.quantity || 0
        const suggestedQuantity = Math.max(
          threshold - currentStock,
          item.moq || 0
        )

        return {
          item,
          warehouseId: batch.warehouseId,
          currentStock,
          suggestedQuantity,
          moq: item.moq,
        }
      })
    )

    // Filter out nulls
    const validSuggestions = suggestions.filter((s): s is NonNullable<typeof s> => s !== null)

    return NextResponse.json({ suggestions: validSuggestions })
  } catch (error) {
    console.error('Purchase suggestions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

