import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
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
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    const where: any = {
      status: {
        in: status ? [status] : ['confirmed', 'partially_received', 'received', 'cancelled'],
      },
    }
    if (supplierId) where.supplierId = parseInt(supplierId)
    if (startDate || endDate) {
      where.orderDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.orderDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.orderDate.lte = end
      }
    }
    if (itemId) {
      where.items = {
        some: {
          itemId: parseInt(itemId),
        },
      }
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
      },
    })

    // Group by supplier
    const bySupplier = purchaseOrders.reduce((acc: any, po) => {
      const key = po.supplierId
      if (!acc[key]) {
        acc[key] = {
          supplier: po.supplier,
          orders: 0,
          amount: 0,
        }
      }
      acc[key].orders += 1
      acc[key].amount += po.grandTotal
      return acc
    }, {})

    // Group by item
    const byItem = purchaseOrders.reduce((acc: any, po) => {
      po.items.forEach((item) => {
        const key = item.itemId
        if (!acc[key]) {
          acc[key] = {
            item: item.item,
            quantity: 0,
            amount: 0,
          }
        }
        acc[key].quantity += item.quantity
        acc[key].amount += item.lineTotal
      })
      return acc
    }, {})

    return NextResponse.json({
      bySupplier: Object.values(bySupplier),
      byItem: Object.values(byItem),
      totalOrders: purchaseOrders.length,
      totalAmount: purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0),
    })
  } catch (error) {
    console.error('Purchase report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
