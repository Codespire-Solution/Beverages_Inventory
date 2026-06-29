import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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
      return NextResponse.json({ error: 'Invalid Recipe ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const targetQuantity = searchParams.get('targetQuantity')

    if (!warehouseId || !targetQuantity) {
      return NextResponse.json(
        { error: 'warehouseId and targetQuantity are required' },
        { status: 400 }
      )
    }

    const recipe = await prisma.recipeVersion.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const warehouseIdNum = parseInt(warehouseId)
    const targetQuantityNum = parseFloat(targetQuantity)

    // Was N aggregate queries. Now: 1 groupBy, regardless of ingredient count.
    const itemIds = recipe.ingredients.map(i => i.itemId)
    const stockTotals = itemIds.length
      ? await prisma.inventoryBatch.groupBy({
          by: ['itemId'],
          where: { itemId: { in: itemIds }, warehouseId: warehouseIdNum, quantity: { gt: 0 } },
          _sum: { quantity: true },
        })
      : []
    const stockByItemId = new Map(stockTotals.map(s => [s.itemId, s._sum.quantity || 0]))

    const materialAvailability = recipe.ingredients.map((ingredient) => {
      const requiredQuantity = ingredient.quantity * targetQuantityNum
      const availableStock = stockByItemId.get(ingredient.itemId) ?? 0
      const isSufficient = availableStock >= requiredQuantity
      const shortfall = Math.max(0, requiredQuantity - availableStock)

      return {
        ingredientId: ingredient.id,
        item: { id: ingredient.item.id, code: ingredient.item.code, name: ingredient.item.name },
        unit: { id: ingredient.unit.id, code: ingredient.unit.code, name: ingredient.unit.name },
        requiredQuantity,
        availableStock,
        isSufficient,
        shortfall,
      }
    })

    const allSufficient = materialAvailability.every((m) => m.isSufficient)

    return NextResponse.json({
      recipeId: id,
      targetQuantity: targetQuantityNum,
      warehouseId: warehouseIdNum,
      allSufficient,
      materials: materialAvailability,
    })
  } catch (error) {
    console.error('Material availability GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


