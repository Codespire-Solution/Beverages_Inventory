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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const issue = await prisma.materialIssue.findUnique({
      where: { id },
      include: {
        productionBatch: {
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
          },
        },
        warehouse: true,
        items: {
          include: {
            item: true,
            batch: true,
            unit: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Material issue not found' }, { status: 404 })
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error('Material issue GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

