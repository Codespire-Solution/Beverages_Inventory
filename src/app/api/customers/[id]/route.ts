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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: {
            orderDate: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Customer GET error:', error)
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
    const { name, contactPerson, phone, email, address, taxRate, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (address !== undefined) updateData.address = address
    if (taxRate !== undefined) updateData.taxRate = taxRate
    if (isActive !== undefined) updateData.isActive = isActive

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ customer })
  } catch (error: any) {
    console.error('Customer PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
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

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error: any) {
    console.error('Customer DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

