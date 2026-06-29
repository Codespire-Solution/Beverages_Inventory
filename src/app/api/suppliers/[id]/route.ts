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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: {
            orderDate: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('Supplier GET error:', error)
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
    const { name, contactPerson, phone, email, address, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (address !== undefined) updateData.address = address
    if (isActive !== undefined) updateData.isActive = isActive

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ supplier })
  } catch (error: any) {
    console.error('Supplier PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
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

    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Supplier deleted successfully' })
  } catch (error: any) {
    console.error('Supplier DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

