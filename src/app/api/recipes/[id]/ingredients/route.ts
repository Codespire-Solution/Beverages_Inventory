import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function POST(
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

    const body = await request.json()
    const { itemId, quantity, unitId } = body

    if (!itemId || !quantity || !unitId) {
      return NextResponse.json(
        { error: 'itemId, quantity, and unitId are required' },
        { status: 400 }
      )
    }

    const ingredient = await prisma.recipeIngredient.create({
      data: {
        recipeVersionId: id,
        itemId,
        quantity,
        unitId,
      },
      include: {
        item: true,
        unit: true,
      },
    })

    return NextResponse.json({ ingredient }, { status: 201 })
  } catch (error) {
    console.error('Ingredient POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

