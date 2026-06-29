import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateDeliveryNumber } from '@/lib/utils'
import { getFIFOBatches } from '@/lib/fifo'
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

    const deliveries = await prisma.salesDelivery.findMany({
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        warehouse: true,
        items: {
          include: {
            sku: true,
            batch: {
              include: {
                item: true,
              },
            },
            unit: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        deliveryDate: 'desc',
      },
    })

    return NextResponse.json({ deliveries })
  } catch (error) {
    console.error('Sales deliveries GET error:', error)
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
    const { orderId, warehouseId, deliveryDate, notes, items } = body

    if (!orderId || !warehouseId || !deliveryDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'orderId, warehouseId, deliveryDate, and items are required' },
        { status: 400 }
      )
    }

    // Get order
    const order = await prisma.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Customer order not found' }, { status: 404 })
    }

    // Generate delivery number
    const count = await prisma.salesDelivery.count()
    const deliveryNumber = generateDeliveryNumber(count + 1)

    // Create delivery and update inventory
    const delivery = await prisma.$transaction(async (tx) => {
      // Create delivery items
      const deliveryItems = []
      for (const item of items) {
        // Use FIFO to select batches if not manually provided
        if (!item.batchId) {
          // Get SKU to find finished goods item
          const sku = await tx.sku.findUnique({
            where: { id: item.skuId },
          })

          if (!sku) continue

          // Find finished goods item
          const finishedGoodsItem = await tx.item.findFirst({
            where: {
              code: sku.code,
              category: 'finished_good',
            },
          })

          if (!finishedGoodsItem) continue

          // Get FIFO batches
          const selectedBatches = await getFIFOBatches(
            finishedGoodsItem.id,
            warehouseId,
            item.quantity
          )

          for (const batch of selectedBatches) {
            deliveryItems.push({
              skuId: item.skuId,
              batchId: batch.batchId,
              quantity: batch.quantity,
              unitId: item.unitId,
            })

            // Decrease batch quantity
            await tx.inventoryBatch.update({
              where: { id: batch.batchId },
              data: {
                quantity: {
                  decrement: batch.quantity,
                },
              },
            })
          }
        } else {
          // Manual batch selection
          deliveryItems.push({
            skuId: item.skuId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitId: item.unitId,
          })

          // Decrease batch quantity
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          })
        }
      }

      // Create delivery
      const delivery = await tx.salesDelivery.create({
        data: {
          deliveryNumber,
          orderId,
          warehouseId,
          deliveryDate: new Date(deliveryDate),
          notes,
          createdBy: decoded.userId,
          items: {
            create: deliveryItems,
          },
        },
        include: {
          items: {
            include: {
              sku: true,
              batch: true,
              unit: true,
            },
          },
        },
      })

      // Update order fulfilled quantities
      for (const item of items) {
        const orderItem = order.items.find((oi: any) => oi.skuId === item.skuId)
        if (orderItem) {
          await tx.customerOrderItem.update({
            where: { id: orderItem.id },
            data: {
              fulfilledQuantity: {
                increment: item.quantity,
              },
            },
          })
        }
      }

      // Check if order is fully fulfilled
      const updatedOrder = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      })

      if (updatedOrder) {
        const allItemsFulfilled = updatedOrder.items.every((item: any) => {
          return item.fulfilledQuantity >= item.quantity
        })

        if (allItemsFulfilled) {
          await tx.customerOrder.update({
            where: { id: orderId },
            data: { status: 'delivered' },
          })
        }
      }

      return delivery
    })

    return NextResponse.json({ delivery }, { status: 201 })
  } catch (error: any) {
    console.error('Sales delivery POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

