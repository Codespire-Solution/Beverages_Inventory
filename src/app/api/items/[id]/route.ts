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

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        baseUnit: true,
        preferredUnit: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Item GET error:', error)
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
    const {
      name,
      description,
      category,
      baseUnitId,
      preferredUnitId,
      standardCost,
      moq,
      minStockQuantity,
      taxRate,
      hasExpiry,
      isActive,
    } = body

    if (!name || !category || !baseUnitId) {
      return NextResponse.json(
        { error: 'Name, category, and baseUnitId are required' },
        { status: 400 }
      )
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        name,
        description: description || null,
        category,
        baseUnitId: parseInt(baseUnitId),
        preferredUnitId: preferredUnitId ? parseInt(preferredUnitId) : null,
        standardCost: standardCost || 0,
        moq: moq || null,
        minStockQuantity: minStockQuantity || null,
        taxRate: taxRate || 0,
        hasExpiry: hasExpiry || false,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: decoded.userId,
      },
      include: {
        baseUnit: true,
        preferredUnit: true,
      },
    })

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Item PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    // Soft delete
    await prisma.item.update({
      where: { id },
      data: { isActive: false, updatedBy: decoded.userId },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error: any) {
    console.error('Item DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

