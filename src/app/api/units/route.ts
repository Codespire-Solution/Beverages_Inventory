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

    const units = await prisma.unit.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    return NextResponse.json({ units })
  } catch (error) {
    console.error('Units GET error:', error)
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

    // Only admin can create units
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, baseUnitId, conversionFactor } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.create({
      data: {
        code,
        name,
        baseUnitId: baseUnitId || null,
        conversionFactor: conversionFactor || 1,
        isActive: true,
      },
    })

    return NextResponse.json({ unit }, { status: 201 })
  } catch (error: any) {
    console.error('Units POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Unit code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

