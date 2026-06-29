import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateAdjustmentNumber } from '@/lib/utils'
import { validateQuantityWithWarning } from '@/lib/validation'
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
    const warehouseId = searchParams.get('warehouseId')
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (startDate || endDate) {
      where.adjustmentDate = {}
      if (startDate) where.adjustmentDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.adjustmentDate.lte = end
      }
    }
    if (search) {
      where.OR = [
        { adjustmentNumber: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (itemId) {
      where.items = {
        some: {
          itemId: parseInt(itemId),
        },
      }
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: true,
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
        adjustmentDate: 'desc',
      },
    })

    return NextResponse.json({ adjustments })
  } catch (error) {
    console.error('Stock adjustments GET error:', error)
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
    const { warehouseId, adjustmentDate, reason, notes, items } = body

    if (!warehouseId || !adjustmentDate || !reason || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'warehouseId, adjustmentDate, reason, and items are required' },
        { status: 400 }
      )
    }

    // Generate adjustment number
    const count = await prisma.stockAdjustment.count()
    const adjustmentNumber = generateAdjustmentNumber(count + 1)

    // Create adjustment with items and update batches
    const adjustment = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId,
          adjustmentDate: new Date(adjustmentDate),
          reason,
          notes,
          createdBy: decoded.userId,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              batchId: item.batchId || null,
              quantityChange: item.quantityChange,
              unitId: item.unitId,
              reason: item.reason,
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

      // Update batch quantities
      for (const item of items) {
        if (item.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: item.batchId },
          })

          if (!batch) {
            throw new Error(`Batch ${item.batchId} not found`)
          }

          // Validate quantity change
          const newQuantity = batch.quantity + item.quantityChange
          const validation = validateQuantityWithWarning(newQuantity, batch.quantity)

          if (!validation.isValid) {
            throw new Error(validation.error)
          }

          // Update batch quantity
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: {
              quantity: newQuantity,
            },
          })
        }
      }

      return adjustment
    })

    return NextResponse.json({ adjustment }, { status: 201 })
  } catch (error: any) {
    console.error('Stock adjustment POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

