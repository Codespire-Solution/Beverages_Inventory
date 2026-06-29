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
    const days = parseInt(searchParams.get('days') || '30')

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + days)

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        expiryDate: {
          lte: expiryDate,
          gte: new Date(),
        },
        quantity: {
          gt: 0,
        },
      },
      include: {
        item: true,
        warehouse: true,
        unit: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    })

    return NextResponse.json({ batches, days })
  } catch (error) {
    console.error('Expiring items GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

