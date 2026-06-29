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
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true'
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { code: 'asc' },
    })

    return NextResponse.json({ warehouses })
  } catch (error) {
    console.error('Warehouses GET error:', error)
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
    const { code, name, address } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name,
        address,
        isActive: true,
      },
    })

    return NextResponse.json({ warehouse }, { status: 201 })
  } catch (error: any) {
    console.error('Warehouses POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Warehouse code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

