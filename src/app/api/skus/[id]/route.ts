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

    const sku = await prisma.sku.findUnique({
      where: { id },
      include: {
        unit: true,
        recipeVersions: {
          include: {
            ingredients: {
              include: {
                item: true,
                unit: true,
              },
            },
          },
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    })

    if (!sku) {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 })
    }

    return NextResponse.json({ sku })
  } catch (error) {
    console.error('SKU GET error:', error)
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
    const { name, description, unitId, standardCost, taxRate, hasExpiry, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (unitId !== undefined) updateData.unitId = unitId
    if (standardCost !== undefined) updateData.standardCost = standardCost
    if (taxRate !== undefined) updateData.taxRate = taxRate
    if (hasExpiry !== undefined) updateData.hasExpiry = hasExpiry
    if (isActive !== undefined) updateData.isActive = isActive

    const sku = await prisma.sku.update({
      where: { id },
      data: updateData,
      include: {
        unit: true,
      },
    })

    return NextResponse.json({ sku })
  } catch (error: any) {
    console.error('SKU PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 })
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

    // Soft delete
    await prisma.sku.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'SKU deleted successfully' })
  } catch (error: any) {
    console.error('SKU DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

