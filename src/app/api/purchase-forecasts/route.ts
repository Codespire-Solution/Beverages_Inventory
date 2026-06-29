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

    // Get sales forecasts for next 3 months
    const today = new Date()
    const threeMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 3, 1)

    const forecasts = await prisma.salesForecast.findMany({
      where: {
        forecastMonth: {
          gte: today,
          lte: threeMonthsFromNow,
        },
      },
      include: {
        sku: {
          include: {
            recipeVersions: {
              where: {
                isActive: true,
                OR: [
                  { effectiveTo: null },
                  { effectiveTo: { gte: today } },
                ],
                effectiveFrom: { lte: today },
              },
              include: {
                ingredients: {
                  include: {
                    item: true,
                    unit: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    })

    // Calculate raw material needs
    const purchaseSuggestions: any[] = []

    for (const forecast of forecasts) {
      const recipe = forecast.sku.recipeVersions[0]
      if (!recipe) continue

      // Calculate required quantities for each ingredient
      for (const ingredient of recipe.ingredients) {
        // Calculate quantity needed based on forecast
        const quantityNeeded = ingredient.quantity * forecast.forecastedQuantity

        // Get current stock
        const currentStock = await prisma.inventoryBatch.aggregate({
          where: {
            itemId: ingredient.itemId,
          },
          _sum: {
            quantity: true,
          },
        })

        const availableStock = currentStock._sum.quantity || 0
        const requiredQuantity = Math.max(0, quantityNeeded - availableStock)

        if (requiredQuantity > 0) {
          // Check if this item already exists in suggestions
          const existingIndex = purchaseSuggestions.findIndex(
            (s) => s.itemId === ingredient.itemId
          )

          if (existingIndex >= 0) {
            purchaseSuggestions[existingIndex].requiredQuantity += requiredQuantity
          } else {
            purchaseSuggestions.push({
              item: ingredient.item,
              itemId: ingredient.itemId,
              currentStock: availableStock,
              requiredQuantity,
              moq: ingredient.item.moq,
              suggestedQuantity: Math.max(requiredQuantity, ingredient.item.moq || 0),
              unit: ingredient.unit,
            })
          }
        }
      }
    }

    return NextResponse.json({ purchaseSuggestions })
  } catch (error) {
    console.error('Purchase forecast GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

