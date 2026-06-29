import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getFIFOBatches } from '@/lib/fifo'

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
      return NextResponse.json({ error: 'Invalid Customer Order ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const items = searchParams.get('items') // JSON string of [{skuId, quantity}]

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'warehouseId is required' },
        { status: 400 }
      )
    }

    const warehouseIdNum = parseInt(warehouseId)
    let deliveryItems: Array<{ skuId: number; quantity: number }> = []

    if (items) {
      try {
        deliveryItems = JSON.parse(items)
      } catch {
        return NextResponse.json(
          { error: 'Invalid items format' },
          { status: 400 }
        )
      }
    } else {
      // Get order items if items not provided
      const order = await prisma.customerOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              sku: true,
            },
          },
        },
      })

      if (!order) {
        return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
      }

      deliveryItems = order.items
        .filter((item) => item.fulfilledQuantity < item.quantity)
        .map((item) => ({
          skuId: item.skuId,
          quantity: item.quantity - item.fulfilledQuantity,
        }))
    }

    // Was N×4 sequential queries per SKU. Now: 3 round-trips total + FIFO in parallel.
    const skuIds = deliveryItems.map(d => d.skuId)
    const skus = await prisma.sku.findMany({ where: { id: { in: skuIds } } })
    const skuById = new Map(skus.map(s => [s.id, s]))
    const itemCodes = skus.map(s => s.code)
    const fgItems = itemCodes.length
      ? await prisma.item.findMany({
          where: { category: 'finished_good', code: { in: itemCodes } },
          select: { id: true, code: true },
        })
      : []
    const fgItemByCode = new Map(fgItems.map(i => [i.code, i]))

    // Pre-fetch stock totals per (itemId, warehouseId) in one query
    const fgItemIds = fgItems.map(i => i.id)
    const stockTotals = fgItemIds.length
      ? await prisma.inventoryBatch.groupBy({
          by: ['itemId'],
          where: { itemId: { in: fgItemIds }, warehouseId: warehouseIdNum, quantity: { gt: 0 } },
          _sum: { quantity: true },
        })
      : []
    const stockByItemId = new Map(stockTotals.map(s => [s.itemId, s._sum.quantity || 0]))

    // Run FIFO previews in parallel (FIFO needs ordered batch picks so can't trivially batch)
    const previewResults = await Promise.all(deliveryItems.map(async (deliveryItem) => {
      const sku = skuById.get(deliveryItem.skuId)
      if (!sku) return { skuId: deliveryItem.skuId, error: 'SKU not found' as const }

      const finishedGoodsItem = fgItemByCode.get(sku.code)
      if (!finishedGoodsItem) {
        return {
          skuId: deliveryItem.skuId,
          sku: { id: sku.id, code: sku.code, name: sku.name },
          requiredQuantity: deliveryItem.quantity,
          availableStock: 0,
          isSufficient: false,
          error: 'No finished goods inventory found for this SKU' as const,
        }
      }

      const availableStock = stockByItemId.get(finishedGoodsItem.id) ?? 0
      const isSufficient = availableStock >= deliveryItem.quantity

      let fifoBatches: any[] = []
      let fifoError: string | null = null
      try {
        const picked = await getFIFOBatches(finishedGoodsItem.id, warehouseIdNum, deliveryItem.quantity)
        const batchIds = picked.map(b => b.batchId)
        const batches = batchIds.length
          ? await prisma.inventoryBatch.findMany({
              where: { id: { in: batchIds } },
              include: { unit: true },
            })
          : []
        const batchById = new Map(batches.map(b => [b.id, b]))
        fifoBatches = picked.map(fb => {
          const batch = batchById.get(fb.batchId)
          return {
            ...fb,
            batch: batch ? {
              id: batch.id, batchNumber: batch.batchNumber,
              receivedDate: batch.receivedDate, expiryDate: batch.expiryDate,
              unit: batch.unit,
            } : null,
          }
        })
      } catch (error: any) {
        fifoError = error.message
      }

      return {
        skuId: deliveryItem.skuId,
        sku: { id: sku.id, code: sku.code, name: sku.name, hasExpiry: sku.hasExpiry },
        requiredQuantity: deliveryItem.quantity,
        availableStock,
        isSufficient,
        fifoBatches,
        fifoError,
      }
    }))

    const deliveryPreview = previewResults

    const allSufficient = deliveryPreview.every((d) => d.isSufficient && !d.error)

    return NextResponse.json({
      orderId: id,
      warehouseId: warehouseIdNum,
      allSufficient,
      items: deliveryPreview,
    })
  } catch (error) {
    console.error('Delivery preview GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


