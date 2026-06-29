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
      return NextResponse.json({ error: 'Invalid Production Batch ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'warehouseId is required' },
        { status: 400 }
      )
    }

    const warehouseIdNum = parseInt(warehouseId)

    // Get production batch and recipe
    const productionBatch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        recipeVersion: {
          include: {
            ingredients: {
              include: {
                item: true,
                unit: true,
              },
            },
          },
        },
      },
    })

    if (!productionBatch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 })
    }

    if (!productionBatch.recipeVersion) {
      return NextResponse.json({ error: 'Recipe not found for this production batch' }, { status: 404 })
    }

    // Pre-fetch all stock totals in ONE groupBy instead of N aggregates.
    const ingredients = productionBatch.recipeVersion.ingredients
    const itemIds = ingredients.map(i => i.itemId)
    const stockTotals = itemIds.length
      ? await prisma.inventoryBatch.groupBy({
          by: ['itemId'],
          where: { itemId: { in: itemIds }, warehouseId: warehouseIdNum, quantity: { gt: 0 } },
          _sum: { quantity: true },
        })
      : []
    const stockByItemId = new Map(stockTotals.map(s => [s.itemId, s._sum.quantity || 0]))

    // FIFO picks must be sequential per item; run them in parallel across items.
    const materialPreview = await Promise.all(
      ingredients.map(async (ingredient) => {
        const requiredQuantity = ingredient.quantity * productionBatch.targetQuantity
        const availableStock = stockByItemId.get(ingredient.itemId) ?? 0
        const isSufficient = availableStock >= requiredQuantity

        let fifoBatches: any[] = []
        let fifoError: string | null = null
        try {
          const picked = await getFIFOBatches(ingredient.itemId, warehouseIdNum, requiredQuantity)
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
          ingredientId: ingredient.id,
          item: {
            id: ingredient.item.id, code: ingredient.item.code,
            name: ingredient.item.name, hasExpiry: ingredient.item.hasExpiry,
          },
          unit: { id: ingredient.unit.id, code: ingredient.unit.code, name: ingredient.unit.name },
          recipeQuantity: ingredient.quantity,
          requiredQuantity,
          availableStock,
          isSufficient,
          fifoBatches,
          fifoError,
        }
      })
    )

    const allSufficient = materialPreview.every((m) => m.isSufficient)

    return NextResponse.json({
      productionBatchId: id,
      targetQuantity: productionBatch.targetQuantity,
      warehouseId: warehouseIdNum,
      allSufficient,
      materials: materialPreview,
    })
  } catch (error) {
    console.error('Material issue preview GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


