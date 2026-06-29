import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Use date range if provided, otherwise use current month
    const today = new Date()
    let dateStart = new Date()
    dateStart.setDate(1)
    dateStart.setHours(0, 0, 0, 0)

    if (startDate) {
      dateStart = new Date(startDate)
      dateStart.setHours(0, 0, 0, 0)
    }

    let dateEnd = today
    if (endDate) {
      dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
    }

    // Get inventory value
    const batches = await prisma.inventoryBatch.findMany({
      include: {
        item: true,
      },
    })

    const inventoryValue = batches.reduce((sum, batch) => {
      const cost = batch.unitCost || batch.item.standardCost
      return sum + (batch.quantity * cost)
    }, 0)

    // Get low stock items (quantity < minStockQuantity or 100)
    const lowStockItems = batches.filter((b) => {
      const minStock = b.item.minStockQuantity || 100
      return b.quantity < minStock && b.quantity > 0
    })

    const lowStockCount = lowStockItems.length

    // Get sales in date range
    const salesInPeriod = await prisma.customerOrder.aggregate({
      where: {
        orderDate: {
          gte: dateStart,
          lte: dateEnd,
        },
        status: {
          in: ['confirmed', 'delivered'],
        },
      },
      _sum: {
        grandTotal: true,
      },
    })

    // Get sales trend (last 6 months for chart)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const salesTrend = await prisma.customerOrder.findMany({
      where: {
        orderDate: {
          gte: sixMonthsAgo,
        },
        status: {
          in: ['confirmed', 'delivered'],
        },
      },
      select: {
        orderDate: true,
        grandTotal: true,
      },
    })

    // Group sales by month for trend chart
    const salesByMonth: { [key: string]: number } = {}
    salesTrend.forEach((order) => {
      const month = new Date(order.orderDate)
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + (order.grandTotal || 0)
    })

    // Get top selling SKUs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const topSKUs = await prisma.customerOrderItem.groupBy({
      by: ['skuId'],
      where: {
        order: {
          orderDate: {
            gte: thirtyDaysAgo,
          },
          status: {
            in: ['confirmed', 'delivered'],
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    })

    const topSKUsWithDetails = await Promise.all(
      topSKUs.map(async (item) => {
        const sku = await prisma.sku.findUnique({
          where: { id: item.skuId },
        })
        return {
          skuId: item.skuId,
          sku: sku?.name || 'Unknown',
          skuCode: sku?.code || '',
          quantity: item._sum.quantity || 0,
        }
      })
    )

    // Get slow moving inventory (items with no movement in last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const recentDeliveries = await prisma.salesDelivery.findMany({
      where: {
        deliveryDate: {
          gte: ninetyDaysAgo,
        },
      },
      include: {
        items: {
          include: {
            batch: true,
          },
        },
      },
    })

    const activeItemIds = new Set(
      recentDeliveries.flatMap(d => d.items.map(i => i.batch?.itemId).filter(Boolean))
    )

    const slowMovingCount = batches.filter(
      b => !activeItemIds.has(b.itemId) && b.quantity > 0
    ).length

    // Cash flow (purchases vs sales in date range)
    const purchasesInPeriod = await prisma.purchaseOrder.aggregate({
      where: {
        orderDate: {
          gte: dateStart,
          lte: dateEnd,
        },
        status: {
          in: ['confirmed', 'partially_received', 'fully_received'],
        },
      },
      _sum: {
        grandTotal: true,
      },
    })

    // Get inventory value trend (last 6 months)
    const inventoryTrend = await prisma.inventoryBatch.findMany({
      where: {
        receivedDate: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        item: true,
      },
    })

    // Group inventory value by month
    const inventoryByMonth: { [key: string]: number } = {}
    inventoryTrend.forEach((batch) => {
      const month = new Date(batch.receivedDate)
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
      const cost = batch.unitCost || batch.item.standardCost
      inventoryByMonth[monthKey] = (inventoryByMonth[monthKey] || 0) + (batch.quantity * cost)
    })

    // Additional metrics
    const pendingPOs = await prisma.purchaseOrder.count({
      where: {
        status: 'draft',
      },
    })

    const pendingOrders = await prisma.customerOrder.count({
      where: {
        status: 'pending',
      },
    })

    const inProgressProduction = await prisma.productionBatch.count({
      where: {
        status: 'in_progress',
      },
    })

    // Expiring items (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const expiringItems = await prisma.inventoryBatch.count({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: today,
        },
        quantity: {
          gt: 0,
        },
      },
    })

    // Overdue deliveries (expected delivery date passed but not delivered)
    // Only 'confirmed' orders can be overdue; 'delivered' orders are done.
    const overdueDeliveries = await prisma.customerOrder.count({
      where: {
        expectedDeliveryDate: {
          lt: today,
        },
        status: {
          in: ['confirmed'],
        },
      },
    })

    // Finished goods inventory count (SKUs with stock)
    const finishedGoodsItems = await prisma.item.findMany({
      where: {
        category: 'finished_good',
        isActive: true,
      },
    })

    const finishedGoodsWithStock = await Promise.all(
      finishedGoodsItems.map(async (item) => {
        const stockResult = await prisma.inventoryBatch.aggregate({
          where: {
            itemId: item.id,
            quantity: {
              gt: 0,
            },
          },
          _sum: {
            quantity: true,
          },
        })
        return stockResult._sum.quantity && stockResult._sum.quantity > 0
      })
    )

    const finishedGoodsCount = finishedGoodsWithStock.filter(Boolean).length

    // Recent activity (last 10 activities)
    const recentOrders = await prisma.customerOrder.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    })

    const recentPOs = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
      },
    })

    const recentActivity = [
      ...recentOrders.map((order) => ({
        type: 'order',
        id: order.id,
        reference: order.orderNumber,
        description: `Customer order from ${order.customer.name}`,
        date: order.createdAt,
        status: order.status,
      })),
      ...recentPOs.map((po) => ({
        type: 'purchase_order',
        id: po.id,
        reference: po.poNumber,
        description: `Purchase order to ${po.supplier.name}`,
        date: po.createdAt,
        status: po.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    // Alerts
    const alerts: any[] = []
    if (lowStockCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowStockCount} items are low on stock`,
        link: '/inventory',
      })
    }
    if (expiringItems > 0) {
      alerts.push({
        type: 'warning',
        message: `${expiringItems} items are expiring soon`,
        link: '/reports/inventory?reportType=expiring',
      })
    }
    if (overdueDeliveries > 0) {
      alerts.push({
        type: 'error',
        message: `${overdueDeliveries} customer orders are overdue`,
        link: '/customer-orders',
      })
    }
    if (pendingPOs > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingPOs} purchase orders are pending confirmation`,
        link: '/purchase-orders',
      })
    }

    return NextResponse.json({
      inventoryValue,
      lowStockCount,
      salesThisMonth: salesInPeriod._sum.grandTotal || 0,
      topSKUs: topSKUsWithDetails,
      slowMovingCount,
      cashFlow: {
        purchases: purchasesInPeriod._sum.grandTotal || 0,
        sales: salesInPeriod._sum.grandTotal || 0,
        net: (salesInPeriod._sum.grandTotal || 0) - (purchasesInPeriod._sum.grandTotal || 0),
      },
      salesTrend: Object.entries(salesByMonth)
        .map(([month, value]) => ({ month, value }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      inventoryTrend: Object.entries(inventoryByMonth)
        .map(([month, value]) => ({ month, value }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      additionalMetrics: {
        pendingPOs,
        pendingOrders,
        inProgressProduction,
        expiringItems,
        overdueDeliveries,
        finishedGoodsCount,
      },
      recentActivity,
      alerts,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
