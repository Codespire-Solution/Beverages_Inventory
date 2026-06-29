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
    const skuId = searchParams.get('skuId')

    const where: any = { isActive: true }
    if (skuId) where.skuId = parseInt(skuId)

    const recipes = await prisma.recipeVersion.findMany({
      where,
      include: {
        sku: true,
        ingredients: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    })

    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Recipes GET error:', error)
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
    const { skuId, versionNumber, effectiveFrom, effectiveTo, ingredients } = body

    // Validation
    if (!skuId || !versionNumber || !effectiveFrom) {
      return NextResponse.json(
        { error: 'skuId, versionNumber, and effectiveFrom are required' },
        { status: 400 }
      )
    }

    // Validate versionNumber is a valid integer
    const versionNumberInt = parseInt(String(versionNumber).trim())
    if (isNaN(versionNumberInt) || versionNumberInt <= 0) {
      return NextResponse.json(
        { error: 'versionNumber must be a positive integer' },
        { status: 400 }
      )
    }

    // Validate ingredients array
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'At least one ingredient is required' },
        { status: 400 }
      )
    }

    // Validate each ingredient
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i]
      if (!ing.itemId || ing.itemId === '' || !ing.quantity || ing.quantity === '' || !ing.unitId || ing.unitId === '') {
        return NextResponse.json(
          { error: `Ingredient ${i + 1} is missing required fields (itemId, quantity, or unitId)` },
          { status: 400 }
        )
      }
      const quantity = parseFloat(ing.quantity)
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Ingredient ${i + 1} has invalid quantity. Must be a positive number.` },
          { status: 400 }
        )
      }
    }

    // Validate SKU exists
    const sku = await prisma.sku.findUnique({
      where: { id: parseInt(skuId) },
    })

    if (!sku) {
      return NextResponse.json(
        { error: `SKU with ID ${skuId} does not exist` },
        { status: 400 }
      )
    }

    // Validate items and units exist
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i]
      const item = await prisma.item.findUnique({ where: { id: parseInt(ing.itemId) } })
      if (!item) {
        return NextResponse.json(
          { error: `Item with ID ${ing.itemId} (ingredient ${i + 1}) does not exist` },
          { status: 400 }
        )
      }
      const unit = await prisma.unit.findUnique({ where: { id: parseInt(ing.unitId) } })
      if (!unit) {
        return NextResponse.json(
          { error: `Unit with ID ${ing.unitId} (ingredient ${i + 1}) does not exist` },
          { status: 400 }
        )
      }
    }

    // Create recipe version with ingredients
    const recipe = await prisma.recipeVersion.create({
      data: {
        skuId: parseInt(skuId),
        versionNumber: versionNumberInt,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: true,
        createdBy: decoded.userId,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            itemId: parseInt(ing.itemId),
            quantity: parseFloat(ing.quantity),
            unitId: parseInt(ing.unitId),
          })),
        },
      },
      include: {
        sku: true,
        ingredients: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    })

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error: any) {
    console.error('Recipes POST error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Recipe version already exists for this SKU. Please use a different version number.' },
        { status: 400 }
      )
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference. One or more items, units, or SKU does not exist.' },
        { status: 400 }
      )
    }

    // Return actual error message for debugging (in development)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error.message || 'Internal server error')
      : 'Internal server error'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

