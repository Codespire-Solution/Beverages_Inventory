import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateFGReceiptNumber, generateBatchNumber } from '@/lib/utils'
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
      prisma.finishedGoodsReceipt.findMany({
        include: {
          productionBatch: { include: { sku: true } },
          warehouse: true,
          items: { include: { sku: true, unit: true } },
          creator: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { receiptDate: 'desc' },
        ...(limit ? { take: limit, skip } : {}),
      }),
      limit ? prisma.finishedGoodsReceipt.count() : Promise.resolve(undefined),
    ])

    return NextResponse.json(
      limit
        ? { receipts, pagination: { page, limit, total, totalPages: Math.ceil((total ?? 0) / limit) } }
        : { receipts }
    )
  } catch (error) {
    console.error('Finished goods receipts GET error:', error)
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
    const { productionBatchId, warehouseId, receiptDate, notes, items } = body

    if (!productionBatchId || !warehouseId || !receiptDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'productionBatchId, warehouseId, receiptDate, and items are required' },
        { status: 400 }
      )
    }

    // Get production batch
    const productionBatch = await prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        sku: true,
      },
    })

    if (!productionBatch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }

    // Generate receipt number
    const count = await prisma.finishedGoodsReceipt.count()
    const receiptNumber = generateFGReceiptNumber(count + 1)

    // Create receipt and inventory batches
    const receipt = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.finishedGoodsReceipt.create({
        data: {
          receiptNumber,
          productionBatchId,
          warehouseId,
          receiptDate: new Date(receiptDate),
          notes,
          createdBy: decoded.userId,
          items: {
            create: items.map((item: any) => ({
              skuId: item.skuId,
              batchNumber: item.batchNumber || generateBatchNumber(Date.now()),
              quantity: item.quantity,
              unitId: item.unitId,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              productionDate: new Date(item.productionDate || receiptDate),
            })),
          },
        },
        include: {
          items: {
            include: {
              sku: true,
              unit: true,
            },
          },
        },
      })

      // Create inventory batches for finished goods
      for (const item of items) {
        const batchNumber = item.batchNumber || generateBatchNumber(Date.now())
        
        // Get SKU to find item ID (finished goods are stored as items in inventory)
        const sku = await tx.sku.findUnique({
          where: { id: item.skuId },
        })

        if (!sku) continue

        // Check if finished goods item exists
        const finishedGoodsItem = await tx.item.findFirst({
          where: {
            code: sku.code,
            category: 'finished_good',
          },
        })

        if (finishedGoodsItem) {
          // Create inventory batch
          await tx.inventoryBatch.create({
            data: {
              itemId: finishedGoodsItem.id,
              warehouseId,
              batchNumber,
              quantity: item.quantity,
              unitId: item.unitId,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              receivedDate: new Date(receiptDate),
              unitCost: sku.standardCost,
            },
          })
        }
      }

      return receipt
    })

    return NextResponse.json({ receipt }, { status: 201 })
  } catch (error: any) {
    console.error('Finished goods receipt POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

