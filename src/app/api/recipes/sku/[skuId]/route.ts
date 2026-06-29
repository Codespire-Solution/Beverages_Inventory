import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { skuId: string } }
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

    const skuId = parseInt(params.skuId)
    if (isNaN(skuId)) {
      return NextResponse.json({ error: 'Invalid SKU ID' }, { status: 400 })
    }

    // Get active recipe for SKU (most recent active version)
    const recipe = await prisma.recipeVersion.findFirst({
      where: {
        skuId,
        isActive: true,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
        effectiveFrom: { lte: new Date() },
      },
      include: {
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

    if (!recipe) {
      return NextResponse.json({ error: 'No active recipe found for this SKU' }, { status: 404 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Active recipe GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

