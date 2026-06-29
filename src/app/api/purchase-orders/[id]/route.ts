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

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
            unit: true,
          },
        },
        receipts: {
          include: {
            items: {
              include: {
                item: true,
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

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return NextResponse.json({ purchaseOrder })
  } catch (error) {
    console.error('Purchase order GET error:', error)
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
    const { orderDate, expectedDeliveryDate, notes, items, status } = body

    // If items are provided, recalculate totals
    let totalAmount = 0
    let taxAmount = 0

    if (items && items.length > 0) {
      // Delete existing items and create new ones
      await prisma.purchaseOrderItem.deleteMany({
        where: { poId: id },
      })

      for (const item of items) {
        const lineTotal = item.quantity * item.unitPrice
        const lineTax = lineTotal * (item.taxRate || 0) / 100
        totalAmount += lineTotal
        taxAmount += lineTax
      }
    }

    const grandTotal = totalAmount + taxAmount

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        orderDate: orderDate ? new Date(orderDate) : undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes,
        status,
        ...(items && items.length > 0 && {
          totalAmount,
          taxAmount,
          grandTotal,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
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
    console.error('Purchase order PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
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

    // Check if PO is draft
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
    })

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (po.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft purchase orders' },
        { status: 400 }
      )
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Purchase order deleted successfully' })
  } catch (error: any) {
    console.error('Purchase order DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
