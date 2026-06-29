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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const skuId = searchParams.get('skuId')
    const status = searchParams.get('status')
    const warehouseId = searchParams.get('warehouseId')

    const where: any = {}
    if (status) {
      where.status = status
    } else {
      // Default to completed batches for reports
      where.status = 'completed'
    }
    if (skuId) where.skuId = parseInt(skuId)
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (startDate || endDate) {
      where.productionDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.productionDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.productionDate.lte = end
      }
    }

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        sku: {
          include: {
            unit: true,
          },
        },
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
        materialIssues: {
          include: {
            items: {
              include: {
                item: true,
                batch: true,
                unit: true,
              },
            },
          },
        },
        finishedGoods: {
          include: {
            items: {
              include: {
                sku: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        productionDate: 'desc',
      },
    })

    // Calculate yield analysis
    const yieldAnalysis = batches.map((batch) => {
      const yieldPercentage = batch.targetQuantity > 0
        ? ((batch.actualQuantity || 0) / batch.targetQuantity) * 100
        : 0
      const wastePercentage = batch.targetQuantity > 0
        ? ((batch.wasteQuantity || 0) / batch.targetQuantity) * 100
        : 0

      return {
        batch,
        yieldPercentage: yieldPercentage.toFixed(2),
        wastePercentage: wastePercentage.toFixed(2),
      }
    })

    // Calculate averages
    const avgYield = yieldAnalysis.length > 0
      ? yieldAnalysis.reduce((sum, item) => sum + parseFloat(item.yieldPercentage), 0) / yieldAnalysis.length
      : 0

    const totalWaste = batches.reduce((sum, batch) => sum + (batch.wasteQuantity || 0), 0)
    const totalTarget = batches.reduce((sum, batch) => sum + batch.targetQuantity, 0)
    const totalActual = batches.reduce((sum, batch) => sum + (batch.actualQuantity || 0), 0)

    // Group by SKU
    const bySKU = batches.reduce((acc: any, batch) => {
      const key = batch.skuId
      if (!acc[key]) {
        acc[key] = {
          sku: batch.sku,
          batches: 0,
          targetQuantity: 0,
          actualQuantity: 0,
          wasteQuantity: 0,
        }
      }
      acc[key].batches += 1
      acc[key].targetQuantity += batch.targetQuantity
      acc[key].actualQuantity += batch.actualQuantity || 0
      acc[key].wasteQuantity += batch.wasteQuantity || 0
      return acc
    }, {})

    // Calculate material costs for efficiency metrics
    const efficiencyMetrics = batches.map((batch) => {
      // Calculate material cost from material issues
      const materialCost = batch.materialIssues?.reduce((total: number, issue: any) => {
        return total + (issue.items?.reduce((issueTotal: number, item: any) => {
          const unitCost = item.batch?.unitCost || item.item?.standardCost || 0
          return issueTotal + (item.quantity * unitCost)
        }, 0) || 0)
      }, 0) || 0

      const yieldPercentage = batch.targetQuantity > 0
        ? ((batch.actualQuantity || 0) / batch.targetQuantity) * 100
        : 0

      const costPerUnit = (batch.actualQuantity || 0) > 0
        ? materialCost / (batch.actualQuantity || 1)
        : 0

      return {
        batch,
        materialCost,
        yieldPercentage: yieldPercentage.toFixed(2),
        costPerUnit: costPerUnit.toFixed(2),
        efficiency: yieldPercentage >= 95 ? 'High' : yieldPercentage >= 90 ? 'Medium' : 'Low',
      }
    })

    // Waste analysis - group by SKU and calculate waste patterns
    const wasteAnalysis = Object.values(bySKU).map((item: any) => {
      const wastePercentage = item.targetQuantity > 0
        ? ((item.wasteQuantity / item.targetQuantity) * 100)
        : 0
      return {
        sku: item.sku,
        batches: item.batches,
        totalWaste: item.wasteQuantity,
        wastePercentage: wastePercentage.toFixed(2),
        averageWastePerBatch: (item.wasteQuantity / item.batches).toFixed(2),
      }
    }).sort((a: any, b: any) => b.totalWaste - a.totalWaste)

    return NextResponse.json({
      yieldAnalysis,
      wasteAnalysis,
      efficiencyMetrics,
      averages: {
        yieldPercentage: avgYield.toFixed(2),
        totalWaste,
        totalTarget,
        totalActual,
        wastePercentage: totalTarget > 0 ? ((totalWaste / totalTarget) * 100).toFixed(2) : '0',
        averageMaterialCost: efficiencyMetrics.length > 0
          ? (efficiencyMetrics.reduce((sum, m) => sum + m.materialCost, 0) / efficiencyMetrics.length).toFixed(2)
          : '0',
        averageCostPerUnit: efficiencyMetrics.length > 0
          ? (efficiencyMetrics.reduce((sum, m) => sum + parseFloat(m.costPerUnit), 0) / efficiencyMetrics.length).toFixed(2)
          : '0',
      },
      bySKU: Object.values(bySKU).map((item: any) => ({
        ...item,
        yieldPercentage: item.targetQuantity > 0
          ? ((item.actualQuantity / item.targetQuantity) * 100).toFixed(2)
          : '0',
      })),
      totalBatches: batches.length,
    })
  } catch (error) {
    console.error('Production report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
