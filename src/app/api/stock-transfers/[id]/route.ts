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

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            item: true,
            batch: true,
            unit: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }

    return NextResponse.json({ transfer })
  } catch (error) {
    console.error('Stock transfer GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
