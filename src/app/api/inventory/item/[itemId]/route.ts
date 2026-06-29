import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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

    const itemId = parseInt(params.itemId)
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid Item ID' }, { status: 400 })
    }

    const batches = await prisma.inventoryBatch.findMany({
      where: { itemId },
      include: {
        warehouse: true,
        unit: true,
      },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { receivedDate: 'asc' },
      ],
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Item batches GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

