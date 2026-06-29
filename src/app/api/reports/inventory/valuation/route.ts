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
    const warehouseId = searchParams.get('warehouseId')

    const where: any = {}
    if (warehouseId) where.warehouseId = parseInt(warehouseId)

    const batches = await prisma.inventoryBatch.findMany({
      where,
      include: {
        item: true,
        warehouse: true,
        unit: true,
      },
    })

    // Calculate valuation
    const valuation = batches.reduce(
      (acc, batch) => {
        const cost = batch.unitCost || batch.item.standardCost
        const value = batch.quantity * cost
        return {
          totalQuantity: acc.totalQuantity + batch.quantity,
          totalValue: acc.totalValue + value,
        }
      },
      { totalQuantity: 0, totalValue: 0 }
    )

    // Group by category
    const byCategory = batches.reduce((acc: any, batch) => {
      const category = batch.item.category
      if (!acc[category]) {
        acc[category] = {
          category,
          quantity: 0,
          value: 0,
        }
      }
      const cost = batch.unitCost || batch.item.standardCost
      acc[category].quantity += batch.quantity
      acc[category].value += batch.quantity * cost
      return acc
    }, {})

    return NextResponse.json({
      totalQuantity: valuation.totalQuantity,
      totalValue: valuation.totalValue,
      byCategory: Object.values(byCategory),
      byWarehouse: warehouseId ? null : batches.reduce((acc: any, batch) => {
        if (!acc[batch.warehouseId]) {
          acc[batch.warehouseId] = {
            warehouse: batch.warehouse,
            quantity: 0,
            value: 0,
          }
        }
        const cost = batch.unitCost || batch.item.standardCost
        acc[batch.warehouseId].quantity += batch.quantity
        acc[batch.warehouseId].value += batch.quantity * cost
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('Inventory valuation GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

