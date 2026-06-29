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
    const days = parseInt(searchParams.get('days') || '90')
    const skuId = searchParams.get('skuId')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get all sales in the period
    const recentSales = await prisma.customerOrderItem.findMany({
      where: {
        order: {
          orderDate: {
            gte: cutoffDate,
          },
          status: {
            in: ['confirmed', 'partially_fulfilled', 'fulfilled'],
          },
        },
        ...(skuId ? { skuId: parseInt(skuId) } : {}),
      },
      select: {
        skuId: true,
        quantity: true,
      },
    })

    // Group by SKU to get total sales
    const salesBySKU: { [key: number]: number } = {}
    recentSales.forEach((sale) => {
      salesBySKU[sale.skuId] = (salesBySKU[sale.skuId] || 0) + sale.quantity
    })

    // Get all active SKUs
    const allSKUs = await prisma.sku.findMany({
      where: {
        isActive: true,
        ...(skuId ? { id: parseInt(skuId) } : {}),
      },
      include: {
        unit: true,
      },
    })

    // Find slow moving SKUs (low or no sales)
    const slowMoving = allSKUs
      .map((sku) => ({
        sku,
        salesQuantity: salesBySKU[sku.id] || 0,
        daysSinceLastSale: null as number | null,
      }))
      .filter((item) => item.salesQuantity < 10) // Threshold: less than 10 units sold
      .sort((a, b) => a.salesQuantity - b.salesQuantity)

    // Get last sale date for each SKU
    const lastSales = await prisma.customerOrderItem.findMany({
      where: {
        skuId: {
          in: slowMoving.map((item) => item.sku.id),
        },
      },
      include: {
        order: {
          select: {
            orderDate: true,
          },
        },
      },
      orderBy: {
        order: {
          orderDate: 'desc',
        },
      },
    })

    // Group by SKU to get last sale date
    const lastSaleBySKU: { [key: number]: Date } = {}
    lastSales.forEach((sale) => {
      if (!lastSaleBySKU[sale.skuId] || sale.order.orderDate > lastSaleBySKU[sale.skuId]) {
        lastSaleBySKU[sale.skuId] = sale.order.orderDate
      }
    })

    // Calculate days since last sale
    const slowMovingWithDates = slowMoving.map((item) => {
      const lastSale = lastSaleBySKU[item.sku.id]
      const daysSince = lastSale
        ? Math.floor((new Date().getTime() - new Date(lastSale).getTime()) / (1000 * 60 * 60 * 24))
        : null
      return {
        ...item,
        daysSinceLastSale: daysSince,
      }
    })

    return NextResponse.json({
      slowMoving: slowMovingWithDates,
      days,
      totalItems: slowMovingWithDates.length,
    })
  } catch (error) {
    console.error('Slow moving items GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


