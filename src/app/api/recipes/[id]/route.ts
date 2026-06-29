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

    const recipe = await prisma.recipeVersion.findUnique({
      where: { id },
      include: {
        sku: true,
        ingredients: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Recipe GET error:', error)
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
    const { effectiveFrom, effectiveTo, isActive } = body

    const recipe = await prisma.recipeVersion.update({
      where: { id },
      data: {
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        ingredients: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    })

    return NextResponse.json({ recipe })
  } catch (error: any) {
    console.error('Recipe PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if recipe is used in production batches
    const productionBatches = await prisma.productionBatch.findMany({
      where: { recipeVersionId: id },
      take: 1,
    })

    if (productionBatches.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete recipe that is used in production batches' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.recipeVersion.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Recipe deleted successfully' })
  } catch (error: any) {
    console.error('Recipe DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
