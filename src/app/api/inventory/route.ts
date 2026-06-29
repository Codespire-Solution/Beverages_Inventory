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
    const itemId = searchParams.get('itemId')
    const lowStock = searchParams.get('lowStock') === 'true'
    const expiringSoon = searchParams.get('expiringSoon') === 'true'
    const search = searchParams.get('search')
    const receivedDateFrom = searchParams.get('receivedDateFrom')
    const receivedDateTo = searchParams.get('receivedDateTo')
    const expiryDateFrom = searchParams.get('expiryDateFrom')
    const expiryDateTo = searchParams.get('expiryDateTo')
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')

    const where: any = {}
    if (warehouseId) where.warehouseId = parseInt(warehouseId)
    if (itemId) where.itemId = parseInt(itemId)
    if (lowStock) where.quantity = { lt: 100 }
    if (expiringSoon) {
      const daysFromNow = new Date()
      daysFromNow.setDate(daysFromNow.getDate() + 30) // 30 days from now
      where.expiryDate = {
        lte: daysFromNow,
        gte: new Date(),
      }
    }

    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { item: { code: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (receivedDateFrom || receivedDateTo) {
      where.receivedDate = {}
      if (receivedDateFrom) where.receivedDate.gte = new Date(receivedDateFrom)
      if (receivedDateTo) {
        const endDate = new Date(receivedDateTo)
        endDate.setHours(23, 59, 59, 999)
        where.receivedDate.lte = endDate
      }
    }

    if (expiryDateFrom || expiryDateTo) {
      where.expiryDate = where.expiryDate || {}
      if (expiryDateFrom) where.expiryDate.gte = new Date(expiryDateFrom)
      if (expiryDateTo) {
        const endDate = new Date(expiryDateTo)
        endDate.setHours(23, 59, 59, 999)
        where.expiryDate.lte = endDate
      }
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : undefined
    const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1
    const skip = limit ? (page - 1) * limit : undefined

    const [batches, total] = await Promise.all([
      prisma.inventoryBatch.findMany({
        where,
        include: {
          item: true,
          warehouse: true,
          unit: true,
        },
        orderBy: [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { receivedDate: 'asc' },
        ],
        ...(limit ? { take: limit, skip } : {}),
      }),
      limit ? prisma.inventoryBatch.count({ where }) : Promise.resolve(undefined),
    ])

    return NextResponse.json(
      limit
        ? { batches, pagination: { page, limit, total, totalPages: Math.ceil((total ?? 0) / limit) } }
        : { batches }
    )
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

