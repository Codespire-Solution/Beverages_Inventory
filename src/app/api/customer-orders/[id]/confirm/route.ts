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

    const order = await prisma.customerOrder.update({
      where: { id },
      data: {
        status: 'confirmed',
      },
      include: {
        customer: true,
        items: {
          include: {
            sku: true,
            unit: true,
          },
        },
      },
    })

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('Customer order confirm error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

