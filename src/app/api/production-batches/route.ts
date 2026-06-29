import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateProductionBatchNumber } from '@/lib/utils'
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
    const status = searchParams.get('status')
    const skuId = searchParams.get('skuId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    if (status) where.status = status
    if (skuId) where.skuId = parseInt(skuId)
    if (startDate || endDate) {
      where.productionDate = {}
      if (startDate) where.productionDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.productionDate.lte = end
      }
    }
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { sku: { name: { contains: search, mode: 'insensitive' } } },
        { sku: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        sku: true,
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
        warehouse: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        productionDate: 'desc',
      },
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Production batches GET error:', error)
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
    const { skuId, recipeVersionId, warehouseId, targetQuantity, productionDate, notes } = body

    if (!skuId || !recipeVersionId || !warehouseId || !targetQuantity || !productionDate) {
      return NextResponse.json(
        { error: 'skuId, recipeVersionId, warehouseId, targetQuantity, and productionDate are required' },
        { status: 400 }
      )
    }

    // Generate batch number
    const count = await prisma.productionBatch.count()
    const batchNumber = generateProductionBatchNumber(count + 1)

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        skuId,
        recipeVersionId,
        warehouseId,
        targetQuantity,
        productionDate: new Date(productionDate),
        status: 'in_progress',
        notes,
        createdBy: decoded.userId,
      },
      include: {
        sku: true,
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
        warehouse: true,
      },
    })

    return NextResponse.json({ batch }, { status: 201 })
  } catch (error: any) {
    console.error('Production batch POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

