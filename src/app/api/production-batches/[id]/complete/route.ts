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

    const body = await request.json()
    const { actualQuantity, wasteQuantity } = body

    if (actualQuantity === undefined) {
      return NextResponse.json(
        { error: 'actualQuantity is required' },
        { status: 400 }
      )
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }

    // Calculate yield percentage
    const yieldPercentage = batch.targetQuantity > 0
      ? (actualQuantity / batch.targetQuantity) * 100
      : 0

    const updatedBatch = await prisma.productionBatch.update({
      where: { id },
      data: {
        actualQuantity,
        wasteQuantity: wasteQuantity || 0,
        status: 'completed',
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

    return NextResponse.json({
      batch: updatedBatch,
      yieldPercentage: yieldPercentage.toFixed(2),
    })
  } catch (error: any) {
    console.error('Production batch complete error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

