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

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        sku: true,
        recipeVersion: {
          include: {
            ingredients: {
              include: {
                item: true,
                unit: true,
              },
            },
          },
        },
        warehouse: true,
        materialIssues: {
          include: {
            items: {
              include: {
                item: true,
                batch: true,
                unit: true,
              },
            },
          },
        },
        finishedGoods: {
          include: {
            items: {
              include: {
                sku: true,
                unit: true,
              },
            },
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

    if (!batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('Production batch GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { targetQuantity, productionDate, notes, status } = body

    const batch = await prisma.productionBatch.update({
      where: { id },
      data: {
        targetQuantity,
        productionDate: productionDate ? new Date(productionDate) : undefined,
        notes,
        status,
      },
      include: {
        sku: true,
        recipeVersion: {
          include: {
            ingredients: {
              include: {
                item: true,
                unit: true,
              },
            },
          },
        },
        warehouse: true,
      },
    })

    return NextResponse.json({ batch })
  } catch (error: any) {
    console.error('Production batch PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

