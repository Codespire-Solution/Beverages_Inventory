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

    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            sku: true,
            unit: true,
          },
        },
        deliveries: {
          include: {
            items: {
              include: {
                sku: true,
                batch: true,
                unit: true,
              },
            },
            warehouse: true,
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

    if (!order) {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Customer order GET error:', error)
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
    const { customerId, orderDate, expectedDeliveryDate, notes, items, status } = body

    // Guard: only 'pending' and 'cancelled' may be set through this general edit route.
    // Confirming and delivering have their own dedicated routes that run the proper
    // workflow (stock checks, inventory updates) — so disallow forging those here.
    if (status !== undefined && !['pending', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status change. Use the Confirm or Deliver actions instead.' },
        { status: 400 }
      )
    }

    // If items are provided, recalculate totals
    let totalAmount = 0
    let taxAmount = 0

    if (items && items.length > 0) {
      // Delete existing items and create new ones
      await prisma.customerOrderItem.deleteMany({
        where: { orderId: id },
      })

      for (const item of items) {
        const lineTotal = item.quantity * item.unitPrice
        const lineTax = lineTotal * (item.taxRate || 0) / 100
        totalAmount += lineTotal
        taxAmount += lineTax
      }
    }

    const grandTotal = totalAmount + taxAmount

    const order = await prisma.customerOrder.update({
      where: { id },
      data: {
        customerId: customerId !== undefined ? customerId : undefined,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        // Only touch expectedDeliveryDate when the caller actually sent it.
        // (Sending undefined leaves it unchanged; sending '' clears it.)
        expectedDeliveryDate:
          expectedDeliveryDate !== undefined
            ? (expectedDeliveryDate ? new Date(expectedDeliveryDate) : null)
            : undefined,
        notes,
        status,
        ...(items && items.length > 0 && {
          totalAmount,
          taxAmount,
          grandTotal,
          items: {
            create: items.map((item: any) => ({
              skuId: item.skuId,
              quantity: item.quantity,
              unitId: item.unitId,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 0,
              lineTotal: item.quantity * item.unitPrice,
            })),
          },
        }),
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
    console.error('Customer order PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
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

    // Check if order is pending
    const order = await prisma.customerOrder.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending orders' },
        { status: 400 }
      )
    }

    await prisma.customerOrder.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Customer order deleted successfully' })
  } catch (error: any) {
    console.error('Customer order DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

