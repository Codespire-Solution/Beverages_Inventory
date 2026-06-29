import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateTransferNumber } from '@/lib/utils'
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
    const fromWarehouseId = searchParams.get('fromWarehouseId')
    const toWarehouseId = searchParams.get('toWarehouseId')
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    if (fromWarehouseId) where.fromWarehouseId = parseInt(fromWarehouseId)
    if (toWarehouseId) where.toWarehouseId = parseInt(toWarehouseId)
    if (startDate || endDate) {
      where.transferDate = {}
      if (startDate) where.transferDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.transferDate.lte = end
      }
    }
    if (search) {
      where.transferNumber = { contains: search, mode: 'insensitive' }
    }
    if (itemId) {
      where.items = {
        some: {
          itemId: parseInt(itemId),
        },
      }
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
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
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        transferDate: 'desc',
      },
    })

    return NextResponse.json({ transfers })
  } catch (error) {
    console.error('Stock transfers GET error:', error)
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
    const { fromWarehouseId, toWarehouseId, transferDate, notes, items } = body

    if (!fromWarehouseId || !toWarehouseId || !transferDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'fromWarehouseId, toWarehouseId, transferDate, and items are required' },
        { status: 400 }
      )
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: 'Source and destination warehouses must be different' },
        { status: 400 }
      )
    }

    // Generate transfer number
    const count = await prisma.stockTransfer.count()
    const transferNumber = generateTransferNumber(count + 1)

    // Create transfer and update batches
    const transfer = await prisma.$transaction(async (tx) => {
      // Validate source batches have enough stock
      for (const item of items) {
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: item.batchId },
        })

        if (!batch) {
          throw new Error(`Batch ${item.batchId} not found`)
        }

        if (batch.warehouseId !== fromWarehouseId) {
          throw new Error(`Batch ${item.batchId} is not in source warehouse`)
        }

        if (batch.quantity < item.quantity) {
          throw new Error(`Insufficient stock in batch ${item.batchId}. Available: ${batch.quantity}, Required: ${item.quantity}`)
        }
      }

      // Create transfer
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromWarehouseId,
          toWarehouseId,
          transferDate: new Date(transferDate),
          notes,
          status: 'pending',
          createdBy: decoded.userId,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              batchId: item.batchId,
              quantity: item.quantity,
              unitId: item.unitId,
            })),
          },
        },
        include: {
          items: {
            include: {
              item: true,
              batch: true,
              unit: true,
            },
          },
        },
      })

      // Update source batches (decrease)
      for (const item of items) {
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Create or update destination batches (increase)
      for (const item of items) {
        const sourceBatch = await tx.inventoryBatch.findUnique({
          where: { id: item.batchId },
        })

        if (!sourceBatch) continue

        // Try to find existing batch in destination warehouse with same batch number
        const existingBatch = await tx.inventoryBatch.findUnique({
          where: {
            itemId_warehouseId_batchNumber: {
              itemId: item.itemId,
              warehouseId: toWarehouseId,
              batchNumber: sourceBatch.batchNumber,
            },
          },
        })

        if (existingBatch) {
          // Update existing batch
          await tx.inventoryBatch.update({
            where: { id: existingBatch.id },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          })
        } else {
          // Create new batch in destination warehouse
          await tx.inventoryBatch.create({
            data: {
              itemId: item.itemId,
              warehouseId: toWarehouseId,
              batchNumber: sourceBatch.batchNumber,
              quantity: item.quantity,
              unitId: item.unitId,
              expiryDate: sourceBatch.expiryDate,
              receivedDate: new Date(transferDate),
              unitCost: sourceBatch.unitCost,
            },
          })
        }
      }

      // Mark transfer as completed
      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: 'completed' },
      })

      return transfer
    })

    return NextResponse.json({ transfer }, { status: 201 })
  } catch (error: any) {
    console.error('Stock transfer POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

