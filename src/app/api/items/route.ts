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

    // Fan out items + their batches in parallel — was 1 + N sequential queries.
    const [items, batches] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { baseUnit: true, preferredUnit: true },
        orderBy: { code: 'asc' },
      }),
      prisma.inventoryBatch.findMany({
        where: {
          quantity: { gt: 0 },
          item: where, // mirror the same item filter so we never load batches we won't use
        },
        select: {
          itemId: true,
          quantity: true,
          unit: { select: { baseUnitId: true, conversionFactor: true } },
        },
      }),
    ])

    // Bucket batches by itemId once, then walk items.
    const batchesByItem = new Map<number, typeof batches>()
    for (const b of batches) {
      const list = batchesByItem.get(b.itemId)
      if (list) list.push(b)
      else batchesByItem.set(b.itemId, [b])
    }

    const itemsWithStock = items.map((item) => {
      const itemBatches = batchesByItem.get(item.id) ?? []
      let totalStockInBaseUnit = 0
      for (const batch of itemBatches) {
        const f = batch.unit.baseUnitId ? batch.unit.conversionFactor : 1
        totalStockInBaseUnit += batch.quantity * f
      }

      let totalStock = totalStockInBaseUnit
      let displayUnit = item.baseUnit
      if (item.preferredUnitId && item.preferredUnit) {
        if (item.preferredUnit.baseUnitId) {
          totalStock = totalStockInBaseUnit / item.preferredUnit.conversionFactor
        }
        displayUnit = item.preferredUnit
      }

      return { ...item, totalStock, displayUnit }
    })

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

