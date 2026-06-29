import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateReceiptNumber, generateBatchNumber } from '@/lib/utils'
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
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : undefined
    const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1
    const skip = limit ? (page - 1) * limit : undefined

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        include: {
          po: true,
          warehouse: true,
          items: { include: { item: true, unit: true } },
          creator: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { receiptDate: 'desc' },
        ...(limit ? { take: limit, skip } : {}),
      }),
      limit ? prisma.goodsReceipt.count() : Promise.resolve(undefined),
    ])

    return NextResponse.json(
      limit
        ? { receipts, pagination: { page, limit, total, totalPages: Math.ceil((total ?? 0) / limit) } }
        : { receipts }
    )
  } catch (error) {
    console.error('Goods receipts GET error:', error)
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
    const { poId, warehouseId, receiptDate, notes, items } = body

    if (!warehouseId || !receiptDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'warehouseId, receiptDate, and items are required' },
        { status: 400 }
      )
    }

    // Generate receipt number
    const count = await prisma.goodsReceipt.count()
    const receiptNumber = generateReceiptNumber(count + 1)

    // Create receipt and update inventory
    const receipt = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          poId: poId || null,
          warehouseId,
          receiptDate: new Date(receiptDate),
          notes,
          createdBy: decoded.userId,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              batchNumber: item.batchNumber || generateBatchNumber(Date.now()),
              quantity: item.quantity,
              unitId: item.unitId,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              unitCost: item.unitCost,
            })),
          },
        },
        include: {
          items: {
            include: {
              item: true,
              unit: true,
            },
          },
        },
      })

      // Create or update inventory batches
      for (const item of items) {
        const batchNumber = item.batchNumber || generateBatchNumber(Date.now())
        
        // Check if batch exists
        const existingBatch = await tx.inventoryBatch.findUnique({
          where: {
            itemId_warehouseId_batchNumber: {
              itemId: item.itemId,
              warehouseId,
              batchNumber,
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
              unitCost: item.unitCost || existingBatch.unitCost,
            },
          })
        } else {
          // Create new batch
          await tx.inventoryBatch.create({
            data: {
              itemId: item.itemId,
              warehouseId,
              batchNumber,
              quantity: item.quantity,
              unitId: item.unitId,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              receivedDate: new Date(receiptDate),
              unitCost: item.unitCost,
            },
          })
        }
      }

      // Update PO received quantities and status if PO is linked
      if (poId) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: poId },
          include: {
            items: true,
          },
        })

        if (po) {
          // Update received quantities
          for (const receiptItem of items) {
            const poItem = po.items.find((pi: any) => pi.itemId === receiptItem.itemId)
            if (poItem) {
              await tx.purchaseOrderItem.update({
                where: { id: poItem.id },
                data: {
                  receivedQuantity: {
                    increment: receiptItem.quantity,
                  },
                },
              })
            }
          }

          // Re-fetch the PO items AFTER the increments above — the in-memory `po.items`
          // is the pre-increment snapshot, so evaluating completion on it would always
          // read receivedQuantity as 0 and never advance the status.
          const refreshedPo = await tx.purchaseOrder.findUnique({
            where: { id: poId },
            include: { items: true },
          })

          const allItemsReceived = !!refreshedPo && refreshedPo.items.every((item) => {
            return item.receivedQuantity >= item.quantity
          })

          const someItemsReceived = !!refreshedPo && refreshedPo.items.some((item) => {
            return item.receivedQuantity > 0
          })

          // Update PO status
          if (allItemsReceived) {
            await tx.purchaseOrder.update({
              where: { id: poId },
              data: { status: 'fully_received' },
            })
          } else if (someItemsReceived) {
            await tx.purchaseOrder.update({
              where: { id: poId },
              data: { status: 'partially_received' },
            })
          }
        }
      }

      return receipt
    })

    return NextResponse.json({ receipt }, { status: 201 })
  } catch (error: any) {
    console.error('Goods receipt POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

