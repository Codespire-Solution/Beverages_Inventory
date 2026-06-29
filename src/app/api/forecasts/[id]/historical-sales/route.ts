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
      return NextResponse.json({ error: 'Invalid Forecast ID' }, { status: 400 })
    }

    // Get forecast to find SKU
    const forecast = await prisma.salesForecast.findUnique({
      where: { id },
      include: {
        sku: true,
      },
    })

    if (!forecast) {
      return NextResponse.json({ error: 'Forecast not found' }, { status: 404 })
    }

    // Get historical sales data (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const historicalSales = await prisma.customerOrderItem.findMany({
      where: {
        skuId: forecast.skuId,
        order: {
          orderDate: {
            gte: twelveMonthsAgo,
          },
          status: {
            in: ['confirmed', 'partially_fulfilled', 'fulfilled'],
          },
        },
      },
      include: {
        order: true,
      },
    })

    // Group by month
    const salesByMonth: { [key: string]: number } = {}
    historicalSales.forEach((item) => {
      const month = new Date(item.order.orderDate)
      month.setDate(1)
      month.setHours(0, 0, 0, 0)
      const monthKey = month.toISOString()
      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + item.quantity
    })

    // Convert to array format for charts
    const historicalData = Object.entries(salesByMonth)
      .map(([month, quantity]) => ({
        month: new Date(month),
        quantity,
      }))
      .sort((a, b) => a.month.getTime() - b.month.getTime())

    return NextResponse.json({ historicalData })
  } catch (error) {
    console.error('Historical sales GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


