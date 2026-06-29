import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Get all batches for this item grouped by warehouse
    const batches = await prisma.inventoryBatch.findMany({
      where: { itemId: id },
      include: {
        warehouse: true,
        unit: true,
      },
      orderBy: {
        warehouseId: 'asc',
      },
    })

    // Group by warehouse and calculate totals
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
      acc[warehouseId].batches.push(batch)
      return acc
    }, {})

    const stockLevels = Object.values(stockByWarehouse)

    return NextResponse.json({ stockLevels })
  } catch (error) {
    console.error('Item stock GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

