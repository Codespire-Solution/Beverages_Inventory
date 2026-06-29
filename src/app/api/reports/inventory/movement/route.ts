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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const itemId = searchParams.get('itemId')
    const category = searchParams.get('category')
    const warehouseId = searchParams.get('warehouseId')

    const whereAdjustments: any = {}
    const whereReceipts: any = {}
    const whereDeliveries: any = {}
    const whereTransfers: any = {}

    if (startDate || endDate) {
      if (startDate) {
        whereAdjustments.adjustmentDate = { gte: new Date(startDate) }
        whereReceipts.receiptDate = { gte: new Date(startDate) }
        whereDeliveries.deliveryDate = { gte: new Date(startDate) }
        whereTransfers.transferDate = { gte: new Date(startDate) }
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereAdjustments.adjustmentDate = { ...whereAdjustments.adjustmentDate, lte: end }
        whereReceipts.receiptDate = { ...whereReceipts.receiptDate, lte: end }
        whereDeliveries.deliveryDate = { ...whereDeliveries.deliveryDate, lte: end }
        whereTransfers.transferDate = { ...whereTransfers.transferDate, lte: end }
      }
    }

    if (warehouseId) {
      whereAdjustments.warehouseId = parseInt(warehouseId)
      whereReceipts.warehouseId = parseInt(warehouseId)
      whereDeliveries.warehouseId = parseInt(warehouseId)
      whereTransfers.OR = [
        { fromWarehouseId: parseInt(warehouseId) },
        { toWarehouseId: parseInt(warehouseId) },
      ]
    }

    // Get stock adjustments
    const adjustments = await prisma.stockAdjustment.findMany({
      where: itemId
        ? {
            ...whereAdjustments,
            items: {
              some: {
                itemId: parseInt(itemId),
              },
            },
          }
        : whereAdjustments,
      include: {
        items: {
          include: {
            item: true,
            unit: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        adjustmentDate: 'desc',
      },
    })

    // Get goods receipts
    const receipts = await prisma.goodsReceipt.findMany({
      where: itemId
        ? {
            ...whereReceipts,
            items: {
              some: {
                itemId: parseInt(itemId),
              },
            },
          }
        : whereReceipts,
      include: {
        items: {
          include: {
            item: true,
            unit: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        receiptDate: 'desc',
      },
    })

    // Get finished goods receipts
    const finishedGoodsReceipts = await prisma.finishedGoodsReceipt.findMany({
      where: whereReceipts,
      include: {
        items: {
          include: {
            sku: true,
            unit: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        receiptDate: 'desc',
      },
    })

    // Get sales deliveries
    const deliveries = await prisma.salesDelivery.findMany({
      where: itemId
        ? {
            ...whereDeliveries,
            items: {
              some: {
                batch: {
                  itemId: parseInt(itemId),
                },
              },
            },
          }
        : whereDeliveries,
      include: {
        items: {
          include: {
            batch: {
              include: {
                item: true,
              },
            },
            sku: true,
            unit: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        deliveryDate: 'desc',
      },
    })

    // Get stock transfers
    const transfers = await prisma.stockTransfer.findMany({
      where: itemId
        ? {
            ...whereTransfers,
            items: {
              some: {
                itemId: parseInt(itemId),
              },
            },
          }
        : whereTransfers,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            item: true,
            batch: true,
            unit: true,
          },
        },
      },
      orderBy: {
        transferDate: 'desc',
      },
    })

    // Get material issues (for production)
    const materialIssues = await prisma.materialIssue.findMany({
      where: itemId
        ? {
            ...(startDate || endDate
              ? {
                  issueDate: {
                    ...(startDate ? { gte: new Date(startDate) } : {}),
                    ...(endDate ? { lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
            items: {
              some: {
                itemId: parseInt(itemId),
              },
            },
          }
        : startDate || endDate
        ? {
            issueDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {},
      include: {
        items: {
          include: {
            item: true,
            batch: true,
            unit: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        issueDate: 'desc',
      },
    })

    // Combine all movements into a unified list
    const movements: any[] = []

    // Add adjustments (decreases/increases)
    adjustments.forEach((adj) => {
      adj.items.forEach((item) => {
        movements.push({
          type: 'adjustment',
          date: adj.adjustmentDate,
          reference: adj.adjustmentNumber,
          item: item.item,
          warehouse: adj.warehouse,
          quantity: item.quantityChange,
          unit: item.unit,
          reason: item.reason || adj.reason,
        })
      })
    })

    // Add receipts (increases)
    receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        movements.push({
          type: 'receipt',
          date: receipt.receiptDate,
          reference: receipt.receiptNumber,
          item: item.item,
          warehouse: receipt.warehouse,
          quantity: item.quantity,
          unit: item.unit,
          batchNumber: item.batchNumber,
        })
      })
    })

    // Add finished goods receipts (increases for finished goods)
    finishedGoodsReceipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        movements.push({
          type: 'finished_goods_receipt',
          date: receipt.receiptDate,
          reference: receipt.receiptNumber,
          item: null, // Finished goods are SKUs, not items
          sku: item.sku,
          warehouse: receipt.warehouse,
          quantity: item.quantity,
          unit: item.unit,
          batchNumber: item.batchNumber,
        })
      })
    })

    // Add deliveries (decreases)
    deliveries.forEach((delivery) => {
      delivery.items.forEach((item) => {
        movements.push({
          type: 'delivery',
          date: delivery.deliveryDate,
          reference: delivery.deliveryNumber,
          item: item.batch?.item,
          sku: item.sku,
          warehouse: delivery.warehouse,
          quantity: -item.quantity, // Negative for decrease
          unit: item.unit,
          batchNumber: item.batch?.batchNumber,
        })
      })
    })

    // Add transfers (decrease from source, increase to destination)
    transfers.forEach((transfer) => {
      transfer.items.forEach((item) => {
        movements.push({
          type: 'transfer_out',
          date: transfer.transferDate,
          reference: transfer.transferNumber,
          item: item.item,
          warehouse: transfer.fromWarehouse,
          toWarehouse: transfer.toWarehouse,
          quantity: -item.quantity, // Negative for decrease
          unit: item.unit,
          batchNumber: item.batch?.batchNumber,
        })
        movements.push({
          type: 'transfer_in',
          date: transfer.transferDate,
          reference: transfer.transferNumber,
          item: item.item,
          warehouse: transfer.toWarehouse,
          fromWarehouse: transfer.fromWarehouse,
          quantity: item.quantity, // Positive for increase
          unit: item.unit,
          batchNumber: item.batch?.batchNumber,
        })
      })
    })

    // Add material issues (decreases)
    materialIssues.forEach((issue) => {
      issue.items.forEach((item) => {
        movements.push({
          type: 'material_issue',
          date: issue.issueDate,
          reference: issue.issueNumber,
          item: item.item,
          warehouse: issue.warehouse,
          quantity: -item.quantity, // Negative for decrease
          unit: item.unit,
          batchNumber: item.batch?.batchNumber,
        })
      })
    })

    // Sort by date descending
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Filter by category if provided
    let filteredMovements = movements
    if (category) {
      filteredMovements = movements.filter((movement) => {
        if (movement.item) {
          return movement.item.category === category
        }
        // For finished goods, check if SKU has a corresponding item with the category
        return false
      })
    }

    return NextResponse.json({
      movements: filteredMovements,
      summary: {
        totalMovements: filteredMovements.length,
        receipts: filteredMovements.filter((m) => m.type === 'receipt' || m.type === 'finished_goods_receipt').length,
        deliveries: filteredMovements.filter((m) => m.type === 'delivery').length,
        adjustments: filteredMovements.filter((m) => m.type === 'adjustment').length,
        transfers: filteredMovements.filter((m) => m.type === 'transfer_in' || m.type === 'transfer_out').length,
        materialIssues: filteredMovements.filter((m) => m.type === 'material_issue').length,
      },
    })
  } catch (error) {
    console.error('Inventory movement GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
