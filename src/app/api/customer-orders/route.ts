import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateOrderNumber } from '@/lib/utils'
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
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    if (customerId) where.customerId = parseInt(customerId)
    if (status) where.status = status
    if (startDate || endDate) {
      where.orderDate = {}
      if (startDate) where.orderDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.orderDate.lte = end
      }
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : undefined
    const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1
    const skip = limit ? (page - 1) * limit : undefined

    const [orders, total] = await Promise.all([
      prisma.customerOrder.findMany({
        where,
        include: {
          customer: true,
          items: { include: { sku: true, unit: true } },
          creator: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { orderDate: 'desc' },
        ...(limit ? { take: limit, skip } : {}),
      }),
      limit ? prisma.customerOrder.count({ where }) : Promise.resolve(undefined),
    ])

    return NextResponse.json(
      limit
        ? { orders, pagination: { page, limit, total, totalPages: Math.ceil((total ?? 0) / limit) } }
        : { orders }
    )
  } catch (error) {
    console.error('Customer orders GET error:', error)
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
    const { customerId, orderDate, expectedDeliveryDate, notes, items, status } = body

    if (!customerId || !orderDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'customerId, orderDate, and items are required' },
        { status: 400 }
      )
    }

    // Generate order number
    const count = await prisma.customerOrder.count()
    const orderNumber = generateOrderNumber(count + 1)

    // Calculate totals
    let totalAmount = 0
    let taxAmount = 0

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate || 0) / 100
      totalAmount += lineTotal
      taxAmount += lineTax
    }

    const grandTotal = totalAmount + taxAmount

    // Create order
    const order = await prisma.customerOrder.create({
      data: {
        orderNumber,
        customerId,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        status: status || 'pending',
        totalAmount,
        taxAmount,
        grandTotal,
        notes,
        createdBy: decoded.userId,
        items: {
          create: items.map((item: any) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            unitId: item.unitId,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 0,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            sku: true,
            unit: true,
          },
        },
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error: any) {
    console.error('Customer order POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

