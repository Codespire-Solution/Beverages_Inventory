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

    // Check availability for each ingredient
    const materialAvailability = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        // Calculate required quantity based on target production quantity
        const requiredQuantity = ingredient.quantity * targetQuantityNum

        // Get available stock in the warehouse
        const stockResult = await prisma.inventoryBatch.aggregate({
          where: {
            itemId: ingredient.itemId,
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
        const isSufficient = availableStock >= requiredQuantity
        const shortfall = Math.max(0, requiredQuantity - availableStock)

        return {
          ingredientId: ingredient.id,
          item: {
            id: ingredient.item.id,
            code: ingredient.item.code,
            name: ingredient.item.name,
          },
          unit: {
            id: ingredient.unit.id,
            code: ingredient.unit.code,
            name: ingredient.unit.name,
          },
          requiredQuantity,
          availableStock,
          isSufficient,
          shortfall,
        }
      })
    )

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


