import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

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
    const { skuId, months = 3 } = body

    if (!skuId) {
      return NextResponse.json(
        { error: 'skuId is required' },
        { status: 400 }
      )
    }

    // Get historical sales data (last 6-12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const historicalSales = await prisma.customerOrderItem.findMany({
      where: {
        skuId,
        order: {
          orderDate: {
            gte: twelveMonthsAgo,
          },
          status: {
            in: ['confirmed', 'delivered'],
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

    // Calculate moving average (simple average of last 6 months)
    const monthlyValues = Object.values(salesByMonth)
    const average = monthlyValues.length > 0
      ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
      : 0

    // Generate forecasts for next N months
    const forecasts = []
    const today = new Date()
    
    for (let i = 1; i <= months; i++) {
      const forecastMonth = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const forecastedQuantity = Math.round(average)

      const forecast = await prisma.salesForecast.upsert({
        where: {
          skuId_forecastMonth: {
            skuId,
            forecastMonth,
          },
        },
        update: {
          forecastedQuantity,
        },
        create: {
          skuId,
          forecastMonth,
          forecastedQuantity,
          createdBy: decoded.userId,
        },
        include: {
          sku: true,
        },
      })

      forecasts.push(forecast)
    }

    return NextResponse.json({ forecasts, average })
  } catch (error: any) {
    console.error('Forecast generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

