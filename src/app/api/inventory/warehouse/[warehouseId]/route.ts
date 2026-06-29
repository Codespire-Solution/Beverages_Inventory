import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { warehouseId: string } }
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

    const warehouseId = parseInt(params.warehouseId)
    if (isNaN(warehouseId)) {
      return NextResponse.json({ error: 'Invalid Warehouse ID' }, { status: 400 })
    }

    const batches = await prisma.inventoryBatch.findMany({
      where: { warehouseId },
      include: {
        item: true,
        unit: true,
      },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { receivedDate: 'asc' },
      ],
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Warehouse batches GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

