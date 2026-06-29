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

    // Preview FIFO batches for each SKU
    const deliveryPreview = await Promise.all(
      deliveryItems.map(async (deliveryItem) => {
        // Get SKU to find finished goods item
        const sku = await prisma.sku.findUnique({
          where: { id: deliveryItem.skuId },
        })

        if (!sku) {
          return {
            skuId: deliveryItem.skuId,
            error: 'SKU not found',
          }
        }

        // Find finished goods item
        const finishedGoodsItem = await prisma.item.findFirst({
          where: {
            code: sku.code,
            category: 'finished_good',
          },
        })

        if (!finishedGoodsItem) {
          return {
            skuId: deliveryItem.skuId,
            sku: {
              id: sku.id,
              code: sku.code,
              name: sku.name,
            },
            requiredQuantity: deliveryItem.quantity,
            availableStock: 0,
            isSufficient: false,
            error: 'No finished goods inventory found for this SKU',
          }
        }

        // Get available stock
        const stockResult = await prisma.inventoryBatch.aggregate({
          where: {
            itemId: finishedGoodsItem.id,
            warehouseId: warehouseIdNum,
            quantity: {
              gt: 0,
            },
          },
          _sum: {
            quantity: true,
          },
        })

        const availableStock = stockResult._sum.quantity || 0
        const isSufficient = availableStock >= deliveryItem.quantity

        // Preview FIFO batches
        let fifoBatches: any[] = []
        let fifoError: string | null = null
        try {
          fifoBatches = await getFIFOBatches(
            finishedGoodsItem.id,
            warehouseIdNum,
            deliveryItem.quantity
          )

          // Get batch details
          const batchIds = fifoBatches.map((b) => b.batchId)
          const batches = await prisma.inventoryBatch.findMany({
            where: {
              id: { in: batchIds },
            },
            include: {
              unit: true,
            },
          })

          fifoBatches = fifoBatches.map((fb) => {
            const batch = batches.find((b) => b.id === fb.batchId)
            return {
              ...fb,
              batch: batch
                ? {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    receivedDate: batch.receivedDate,
                    expiryDate: batch.expiryDate,
                    unit: batch.unit,
                  }
                : null,
            }
          })
        } catch (error: any) {
          fifoError = error.message
        }

        return {
          skuId: deliveryItem.skuId,
          sku: {
            id: sku.id,
            code: sku.code,
            name: sku.name,
            hasExpiry: sku.hasExpiry,
          },
          requiredQuantity: deliveryItem.quantity,
          availableStock,
          isSufficient,
          fifoBatches,
          fifoError,
        }
      })
    )

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


