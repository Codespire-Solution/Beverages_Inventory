import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateIssueNumber } from '@/lib/utils'
import { getFIFOBatches } from '@/lib/fifo'
import { convertToBaseUnit } from '@/lib/unit-conversion'
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

    const [issues, total] = await Promise.all([
      prisma.materialIssue.findMany({
        include: {
          productionBatch: { include: { sku: true } },
          warehouse: true,
          items: { include: { item: true, batch: true, unit: true } },
          creator: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { issueDate: 'desc' },
        ...(limit ? { take: limit, skip } : {}),
      }),
      limit ? prisma.materialIssue.count() : Promise.resolve(undefined),
    ])

    return NextResponse.json(
      limit
        ? { issues, pagination: { page, limit, total, totalPages: Math.ceil((total ?? 0) / limit) } }
        : { issues }
    )
  } catch (error) {
    console.error('Material issues GET error:', error)
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
    const { productionBatchId, warehouseId, issueDate, notes, items } = body

    if (!productionBatchId || !warehouseId || !issueDate) {
      return NextResponse.json(
        { error: 'productionBatchId, warehouseId, and issueDate are required' },
        { status: 400 }
      )
    }

    // Get production batch and recipe
    const productionBatch = await prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
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

    // If items not provided, calculate from recipe
    let itemsToIssue = items
    if (!itemsToIssue || itemsToIssue.length === 0) {
      itemsToIssue = await Promise.all(
        productionBatch.recipeVersion.ingredients.map(async (ingredient) => {
          // Calculate required quantity based on target production quantity
          const requiredQuantity = ingredient.quantity * productionBatch.targetQuantity
          
          // Use FIFO to select batches
          const selectedBatches = await getFIFOBatches(
            ingredient.itemId,
            warehouseId,
            requiredQuantity
          )

          return {
            itemId: ingredient.itemId,
            batches: selectedBatches,
            requiredQuantity,
            unitId: ingredient.unitId,
          }
        })
      )
    }

    // Generate issue number
    const count = await prisma.materialIssue.count()
    const issueNumber = generateIssueNumber(count + 1)

    // Create issue and update batches
    const issue = await prisma.$transaction(async (tx) => {
      // Create issue items
      const issueItems = []
      for (const item of itemsToIssue) {
        if (item.batches) {
          // Auto-calculated from recipe
          for (const batch of item.batches) {
            issueItems.push({
              itemId: item.itemId,
              batchId: batch.batchId,
              quantity: batch.quantity,
              unitId: item.unitId,
            })

            // Decrease batch quantity
            await tx.inventoryBatch.update({
              where: { id: batch.batchId },
              data: {
                quantity: {
                  decrement: batch.quantity,
                },
              },
            })
          }
        } else {
          // Manual selection
          issueItems.push({
            itemId: item.itemId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitId: item.unitId,
          })

          // Decrease batch quantity
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          })
        }
      }

      // Create issue
      const issue = await tx.materialIssue.create({
        data: {
          issueNumber,
          productionBatchId,
          warehouseId,
          issueDate: new Date(issueDate),
          notes,
          createdBy: decoded.userId,
          items: {
            create: issueItems,
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

      return issue
    })

    return NextResponse.json({ issue }, { status: 201 })
  } catch (error: any) {
    console.error('Material issue POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

