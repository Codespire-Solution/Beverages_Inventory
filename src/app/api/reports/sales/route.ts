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
    const skuId = searchParams.get('skuId')
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      status: {
        in: ['confirmed', 'delivered'],
      },
    }
    if (customerId) where.customerId = parseInt(customerId)
    if (startDate || endDate) {
      where.orderDate = {}
      if (startDate) where.orderDate.gte = new Date(startDate)
      if (endDate) where.orderDate.lte = new Date(endDate)
    }

    const orders = await prisma.customerOrder.findMany({
      where,
      include: {
        customer: true,
        items: {
          where: skuId ? { skuId: parseInt(skuId) } : undefined,
          include: {
            sku: true,
            unit: true,
          },
        },
      },
    })

    // Group by SKU
    const bySKU = orders.reduce((acc: any, order) => {
      order.items.forEach((item) => {
        const key = item.skuId
        if (!acc[key]) {
          acc[key] = {
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          }
        }
        acc[key].quantity += item.quantity
        acc[key].revenue += item.lineTotal
      })
      return acc
    }, {})

    // Group by customer
    const byCustomer = orders.reduce((acc: any, order) => {
      const key = order.customerId
      if (!acc[key]) {
        acc[key] = {
          customer: order.customer,
          orders: 0,
          revenue: 0,
        }
      }
      acc[key].orders += 1
      acc[key].revenue += order.grandTotal
      return acc
    }, {})

    // Top selling SKUs
    const topSKUs = Object.values(bySKU)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10)

    // Slow moving inventory (items with no sales in last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const recentSales = await prisma.customerOrderItem.findMany({
      where: {
        order: {
          orderDate: {
            gte: ninetyDaysAgo,
          },
          status: {
            in: ['confirmed', 'delivered'],
          },
        },
      },
      select: {
        skuId: true,
      },
    })

    const activeSKUIds = new Set(recentSales.map((s) => s.skuId))

    const allSKUs = await prisma.sku.findMany({
      where: {
        isActive: true,
      },
    })

    const slowMoving = allSKUs.filter((sku) => !activeSKUIds.has(sku.id))

    return NextResponse.json({
      bySKU: Object.values(bySKU),
      byCustomer: Object.values(byCustomer),
      topSKUs,
      slowMoving,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.grandTotal, 0),
    })
  } catch (error) {
    console.error('Sales report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

