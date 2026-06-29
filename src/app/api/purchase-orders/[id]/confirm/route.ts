import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function PUT(
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

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'confirmed',
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    })

    return NextResponse.json({ purchaseOrder })
  } catch (error: any) {
    console.error('Purchase order confirm error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
