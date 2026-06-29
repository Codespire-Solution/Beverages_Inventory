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
    const month = searchParams.get('month')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (skuId) where.skuId = parseInt(skuId)
    if (month) {
      const monthDate = new Date(month)
      where.forecastMonth = monthDate
    }
    if (startDate || endDate) {
      where.forecastMonth = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setDate(1)
        where.forecastMonth.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setMonth(end.getMonth() + 1)
        end.setDate(0)
        where.forecastMonth.lte = end
      }
    }

    const forecasts = await prisma.salesForecast.findMany({
      where,
      include: {
        sku: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        forecastMonth: 'desc',
      },
    })

    return NextResponse.json({ forecasts })
  } catch (error) {
    console.error('Forecasts GET error:', error)
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
    const { skuId, forecastMonth, forecastedQuantity } = body

    if (!skuId || !forecastMonth || forecastedQuantity === undefined) {
      return NextResponse.json(
        { error: 'skuId, forecastMonth, and forecastedQuantity are required' },
        { status: 400 }
      )
    }

    // Set to first day of month
    const monthDate = new Date(forecastMonth)
    monthDate.setDate(1)
    monthDate.setHours(0, 0, 0, 0)

    const forecast = await prisma.salesForecast.upsert({
      where: {
        skuId_forecastMonth: {
          skuId,
          forecastMonth: monthDate,
        },
      },
      update: {
        forecastedQuantity,
      },
      create: {
        skuId,
        forecastMonth: monthDate,
        forecastedQuantity,
        createdBy: decoded.userId,
      },
      include: {
        sku: true,
      },
    })

    return NextResponse.json({ forecast }, { status: 201 })
  } catch (error: any) {
    console.error('Forecast POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

