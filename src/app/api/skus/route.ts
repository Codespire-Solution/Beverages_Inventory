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
    const search = searchParams.get('search')
    const isActiveParam = searchParams.get('isActive')

    const where: any = {}

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true'
    }

    const skus = await prisma.sku.findMany({
      where,
      include: {
        unit: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    return NextResponse.json({ skus })
  } catch (error) {
    console.error('SKUs GET error:', error)
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
    const { code, name, description, unitId, standardCost, taxRate, hasExpiry } = body

    if (!code || !name || !unitId) {
      return NextResponse.json(
        { error: 'Code, name, and unitId are required' },
        { status: 400 }
      )
    }

    const sku = await prisma.sku.create({
      data: {
        code,
        name,
        description,
        unitId,
        standardCost: standardCost || 0,
        taxRate: taxRate || 0,
        hasExpiry: hasExpiry || false,
        isActive: true,
      },
      include: {
        unit: true,
      },
    })

    return NextResponse.json({ sku }, { status: 201 })
  } catch (error: any) {
    console.error('SKUs POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

