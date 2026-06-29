import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generatePONumber } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    if (supplierId) where.supplierId = parseInt(supplierId)
    if (status) where.status = status
    if (startDate || endDate) {
      where.orderDate = {}
      if (startDate) where.orderDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.orderDate.lte = end
      }
    }
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
            unit: true,
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
      orderBy: {
        orderDate: 'desc',
      },
    })

    return NextResponse.json({ purchaseOrders })
  } catch (error) {
    console.error('Purchase orders GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { supplierId, orderDate, expectedDeliveryDate, notes, items, status } = body

    if (!supplierId || !orderDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'supplierId, orderDate, and items are required' },
        { status: 400 }
      )
    }

    // Generate PO number
    const count = await prisma.purchaseOrder.count()
    const poNumber = generatePONumber(count + 1)

    // Calculate totals
    let totalAmount = 0
    let taxAmount = 0

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate || 0) / 100
      totalAmount += lineTotal
      taxAmount += lineTax
    }

    const grandTotal = totalAmount + taxAmount

    // Create PO with items
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        status: status || 'draft',
        totalAmount,
        taxAmount,
        grandTotal,
        notes,
        createdBy: decoded.userId,
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

    return NextResponse.json({ purchaseOrder }, { status: 201 })
  } catch (error: any) {
    console.error('Purchase order POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
