import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateItemCode } from '@/lib/utils'

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
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    const where: any = {}
    if (category) where.category = category
    if (isActive !== null) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        baseUnit: true,
        preferredUnit: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    // Calculate total stock for each item across all warehouses
    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        // Get all batches for this item with their units
        const batches = await prisma.inventoryBatch.findMany({
          where: {
            itemId: item.id,
            quantity: {
              gt: 0, // Only count batches with available stock
            },
          },
          include: {
            unit: true,
          },
        })

        // Convert all batches to base unit and sum
        let totalStockInBaseUnit = 0
        for (const batch of batches) {
          const batchUnit = batch.unit
          if (batchUnit.baseUnitId) {
            // Convert to base unit: quantity * conversionFactor
            totalStockInBaseUnit += batch.quantity * batchUnit.conversionFactor
          } else {
            // Already in base unit
            totalStockInBaseUnit += batch.quantity
          }
        }

        // Convert from base unit to preferred unit (or keep in base unit if no preferred unit)
        let totalStock = totalStockInBaseUnit
        let displayUnit = item.baseUnit
        
        if (item.preferredUnitId && item.preferredUnit) {
          const preferredUnit = item.preferredUnit
          if (preferredUnit.baseUnitId) {
            // Convert from base to preferred: baseQuantity / conversionFactor
            totalStock = totalStockInBaseUnit / preferredUnit.conversionFactor
          }
          displayUnit = preferredUnit
        }

        return {
          ...item,
          totalStock,
          displayUnit, // Include the unit to display
        }
      })
    )

    return NextResponse.json({ items: itemsWithStock })
  } catch (error) {
    console.error('Items GET error:', error)
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
    const {
      code,
      name,
      description,
      category,
      baseUnitId,
      preferredUnitId,
      standardCost,
      moq,
      minStockQuantity,
      taxRate,
      hasExpiry,
    } = body

    if (!name || !category || !baseUnitId) {
      return NextResponse.json(
        { error: 'Name, category, and baseUnitId are required' },
        { status: 400 }
      )
    }

    // Auto-generate code if not provided
    let itemCode = code
    if (!itemCode) {
      // Get the highest existing item ID to generate next code
      const lastItem = await prisma.item.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      })
      const nextId = (lastItem?.id || 0) + 1
      itemCode = generateItemCode(nextId)
    }

    // Check if code already exists
    const existingItem = await prisma.item.findUnique({
      where: { code: itemCode },
    })

    if (existingItem) {
      // If code exists, generate a new one
      const lastItem = await prisma.item.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      })
      const nextId = (lastItem?.id || 0) + 1
      itemCode = generateItemCode(nextId)
    }

    const item = await prisma.item.create({
      data: {
        code: itemCode,
        name,
        description,
        category,
        baseUnitId,
        preferredUnitId: preferredUnitId || null,
        standardCost: standardCost || 0,
        moq: moq || null,
        minStockQuantity: minStockQuantity || null,
        taxRate: taxRate || 0,
        hasExpiry: hasExpiry || false,
        isActive: true,
        createdBy: decoded.userId,
      },
      include: {
        baseUnit: true,
        preferredUnit: true,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    console.error('Items POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Item code already exists. Please try again or leave code blank for auto-generation.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

