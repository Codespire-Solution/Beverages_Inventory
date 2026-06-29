import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

const CONFIRMED_OR_DELIVERED = ['confirmed', 'delivered']
const CONFIRMED_PO_STATUSES = ['confirmed', 'partially_received', 'fully_received']

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!verifyToken(token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const today = new Date()
    const dateStart = startDateParam ? new Date(startDateParam) : new Date(today.getFullYear(), today.getMonth(), 1)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = endDateParam ? new Date(endDateParam) : today
    if (endDateParam) dateEnd.setHours(23, 59, 59, 999)

    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
    sixMonthsAgo.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // Run every independent query in parallel — was 17 sequential awaits.
    const [
      batchValuationRows,
      lowStockRows,
      inStockItemRows,
      salesInPeriod,
      salesTrendRows,
      topSKUsAgg,
      activeItemRows,
      purchasesInPeriod,
      inventoryTrendRows,
      pendingPOs,
      pendingOrders,
      inProgressProduction,
      expiringItems,
      overdueDeliveries,
      finishedGoodsCount,
      recentOrders,
      recentPOs,
    ] = await Promise.all([
      prisma.inventoryBatch.findMany({
        where: { quantity: { gt: 0 } },
        select: { quantity: true, unitCost: true, item: { select: { standardCost: true } } },
      }),
      prisma.inventoryBatch.findMany({
        where: { quantity: { gt: 0 } },
        select: { quantity: true, item: { select: { minStockQuantity: true } } },
      }),
      prisma.inventoryBatch.findMany({
        where: { quantity: { gt: 0 } },
        select: { itemId: true },
        distinct: ['itemId'],
      }),
      prisma.customerOrder.aggregate({
        where: { orderDate: { gte: dateStart, lte: dateEnd }, status: { in: CONFIRMED_OR_DELIVERED } },
        _sum: { grandTotal: true },
      }),
      prisma.customerOrder.findMany({
        where: { orderDate: { gte: sixMonthsAgo }, status: { in: CONFIRMED_OR_DELIVERED } },
        select: { orderDate: true, grandTotal: true },
      }),
      prisma.customerOrderItem.groupBy({
        by: ['skuId'],
        where: {
          order: { orderDate: { gte: thirtyDaysAgo }, status: { in: CONFIRMED_OR_DELIVERED } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.salesDeliveryItem.findMany({
        where: { delivery: { deliveryDate: { gte: ninetyDaysAgo } } },
        select: { batch: { select: { itemId: true } } },
      }),
      prisma.purchaseOrder.aggregate({
        where: { orderDate: { gte: dateStart, lte: dateEnd }, status: { in: CONFIRMED_PO_STATUSES } },
        _sum: { grandTotal: true },
      }),
      prisma.inventoryBatch.findMany({
        where: { receivedDate: { gte: sixMonthsAgo } },
        select: { receivedDate: true, quantity: true, unitCost: true, item: { select: { standardCost: true } } },
      }),
      prisma.purchaseOrder.count({ where: { status: 'draft' } }),
      prisma.customerOrder.count({ where: { status: 'pending' } }),
      prisma.productionBatch.count({ where: { status: 'in_progress' } }),
      prisma.inventoryBatch.count({
        where: { expiryDate: { lte: thirtyDaysFromNow, gte: today }, quantity: { gt: 0 } },
      }),
      prisma.customerOrder.count({
        where: { expectedDeliveryDate: { lt: today }, status: { in: ['confirmed'] } },
      }),
      prisma.inventoryBatch.groupBy({
        by: ['itemId'],
        where: { quantity: { gt: 0 }, item: { category: 'finished_good', isActive: true } },
        _sum: { quantity: true },
      }).then(rows => rows.filter(r => (r._sum.quantity ?? 0) > 0).length),
      prisma.customerOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, createdAt: true, status: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, poNumber: true, createdAt: true, status: true,
          supplier: { select: { name: true } },
        },
      }),
    ])

    // Resolve top-SKU details in one round-trip (was N+1)
    const skuIds = topSKUsAgg.map(t => t.skuId)
    const skuDetails = skuIds.length
      ? await prisma.sku.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, name: true, code: true },
        })
      : []
    const skuById = new Map(skuDetails.map(s => [s.id, s]))

    const activeItemIds = new Set(activeItemRows.map(r => r.batch?.itemId).filter(Boolean) as number[])

    const inventoryValue = batchValuationRows.reduce(
      (sum, b) => sum + b.quantity * (b.unitCost ?? b.item.standardCost),
      0,
    )
    const lowStockCount = lowStockRows.filter(
      b => b.quantity < (b.item.minStockQuantity ?? 100),
    ).length
    const slowMovingCount = inStockItemRows.filter(r => !activeItemIds.has(r.itemId)).length

    const salesByMonth = new Map<string, number>()
    for (const o of salesTrendRows) {
      const d = new Date(o.orderDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + (o.grandTotal ?? 0))
    }

    const inventoryByMonth = new Map<string, number>()
    for (const b of inventoryTrendRows) {
      const d = new Date(b.receivedDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cost = b.unitCost ?? b.item.standardCost
      inventoryByMonth.set(key, (inventoryByMonth.get(key) ?? 0) + b.quantity * cost)
    }

    const recentActivity = [
      ...recentOrders.map(o => ({
        type: 'order' as const,
        id: o.id,
        reference: o.orderNumber,
        description: `Customer order from ${o.customer.name}`,
        date: o.createdAt,
        status: o.status,
      })),
      ...recentPOs.map(p => ({
        type: 'purchase_order' as const,
        id: p.id,
        reference: p.poNumber,
        description: `Purchase order to ${p.supplier.name}`,
        date: p.createdAt,
        status: p.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    const alerts: { type: string; message: string; link: string }[] = []
    if (lowStockCount > 0) {
      alerts.push({ type: 'warning', message: `${lowStockCount} items are low on stock`, link: '/inventory' })
    }
    if (expiringItems > 0) {
      alerts.push({ type: 'warning', message: `${expiringItems} items are expiring soon`, link: '/reports/inventory?reportType=expiring' })
    }
    if (overdueDeliveries > 0) {
      alerts.push({ type: 'error', message: `${overdueDeliveries} customer orders are overdue`, link: '/customer-orders' })
    }
    if (pendingPOs > 0) {
      alerts.push({ type: 'info', message: `${pendingPOs} purchase orders are pending confirmation`, link: '/purchase-orders' })
    }

    const salesTotal = salesInPeriod._sum.grandTotal ?? 0
    const purchasesTotal = purchasesInPeriod._sum.grandTotal ?? 0

    return NextResponse.json({
      inventoryValue,
      lowStockCount,
      salesThisMonth: salesTotal,
      topSKUs: topSKUsAgg.map(t => {
        const sku = skuById.get(t.skuId)
        return {
          skuId: t.skuId,
          sku: sku?.name ?? 'Unknown',
          skuCode: sku?.code ?? '',
          quantity: t._sum.quantity ?? 0,
        }
      }),
      slowMovingCount,
      cashFlow: {
        purchases: purchasesTotal,
        sales: salesTotal,
        net: salesTotal - purchasesTotal,
      },
      salesTrend: [...salesByMonth.entries()]
        .map(([month, value]) => ({ month, value }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      inventoryTrend: [...inventoryByMonth.entries()]
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
