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
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplierId = searchParams.get('supplierId')
    const itemId = searchParams.get('itemId')
    const status = searchParams.get('status')

    const today = new Date()
    let dateStart = new Date()

    // Use date range if provided, otherwise use period
    if (startDate && endDate) {
      dateStart = new Date(startDate)
    } else {
      switch (period) {
        case 'day':
          dateStart.setHours(0, 0, 0, 0)
          break
        case 'week':
          dateStart.setDate(dateStart.getDate() - 7)
          break
        case 'month':
          dateStart.setDate(1)
          dateStart.setHours(0, 0, 0, 0)
          break
      }
    }

    const where: any = {
      orderDate: {
        gte: dateStart,
      },
      status: {
        in: status ? [status] : ['confirmed', 'partially_received', 'received', 'cancelled'],
      },
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.orderDate.lte = end
    } else {
      where.orderDate.lte = today
    }

    if (supplierId) where.supplierId = parseInt(supplierId)
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
          },
        },
      },
    })

    // Group by period
    const summary: { [key: string]: { orders: number; amount: number } } = {}

    purchaseOrders.forEach((po) => {
      let key = ''
      const orderDate = new Date(po.orderDate)

      // If date range is provided, group by day; otherwise use period
      if (startDate && endDate) {
        key = orderDate.toISOString().split('T')[0]
      } else {
        switch (period) {
          case 'day':
            key = orderDate.toISOString().split('T')[0]
            break
          case 'week':
            const weekStart = new Date(orderDate)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            key = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
            break
        }
      }

      if (!summary[key]) {
        summary[key] = { orders: 0, amount: 0 }
      }

      summary[key].orders += 1
      summary[key].amount += po.grandTotal
    })

    return NextResponse.json({
      period: startDate && endDate ? 'custom' : period,
      summary: Object.entries(summary)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (error) {
    console.error('Purchase summary GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
