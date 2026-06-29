import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateItemCode } from '@/lib/utils'

export const dynamic = 'force-dynamic'

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
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      )
    }

    const results = {
      success: [] as any[],
      errors: [] as Array<{ row: number; error: string; data: any }>,
    }

    // Get the highest existing item ID to generate codes
    const lastItem = await prisma.item.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    })
    let nextId = (lastItem?.id || 0) + 1

    console.log(`Starting bulk upload of ${items.length} items. Next ID will be: ${nextId}`)

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i]
      try {
        const {
          code,
          name,
          description,
          category,
          baseUnitId,
          preferredUnitId,
          standardCost,
          moq,
          minStockQuantity,
          taxRate,
          hasExpiry,
        } = itemData

        console.log(`Processing item ${i + 1}:`, { name, category, baseUnitId })

        if (!name || !category || !baseUnitId) {
          const missingFields = []
          if (!name) missingFields.push('name')
          if (!category) missingFields.push('category')
          if (!baseUnitId) missingFields.push('baseUnitId')
          
          results.errors.push({
            row: i + 1,
            error: `Missing required fields: ${missingFields.join(', ')}`,
            data: itemData,
          })
          continue
        }

        // Check if name already exists (case-insensitive check for SQLite)
        const existingItemsByName = await prisma.item.findMany({
          where: {
            name: {
              contains: String(name).trim(),
            },
          },
        })

        // Check case-insensitively
        const duplicate = existingItemsByName.find(
          item => item.name.toLowerCase().trim() === String(name).toLowerCase().trim()
        )

        if (duplicate) {
          results.errors.push({
            row: i + 1,
            error: `Item with name "${name}" already exists in the database (existing code: ${duplicate.code}). Please use a different name.`,
            data: itemData,
          })
          continue
        }

        // Auto-generate code if not provided
        let itemCode = code
        if (!itemCode || itemCode === '') {
          itemCode = generateItemCode(nextId)
          nextId++
        }

        // Check if code already exists
        const existingItem = await prisma.item.findUnique({
          where: { code: itemCode },
        })

        if (existingItem) {
          // Generate a new code if exists
          itemCode = generateItemCode(nextId)
          nextId++
        }

        // Validate baseUnitId exists
        const baseUnit = await prisma.unit.findUnique({
          where: { id: parseInt(String(baseUnitId)) },
        })

        if (!baseUnit) {
          results.errors.push({
            row: i + 1,
            error: `Base Unit ID ${baseUnitId} does not exist. Please check available units.`,
            data: itemData,
          })
          continue
        }

        // Validate preferredUnitId if provided
        if (preferredUnitId) {
          const preferredUnit = await prisma.unit.findUnique({
            where: { id: parseInt(String(preferredUnitId)) },
          })

          if (!preferredUnit) {
            results.errors.push({
              row: i + 1,
              error: `Preferred Unit ID ${preferredUnitId} does not exist. Please check available units.`,
              data: itemData,
            })
            continue
          }
        }

        const item = await prisma.item.create({
          data: {
            code: itemCode,
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            category: String(category).trim(),
            baseUnitId: parseInt(String(baseUnitId)),
            preferredUnitId: preferredUnitId ? parseInt(String(preferredUnitId)) : null,
            standardCost: standardCost ? parseFloat(String(standardCost)) : 0,
            moq: moq ? parseFloat(String(moq)) : null,
            minStockQuantity: minStockQuantity ? parseFloat(String(minStockQuantity)) : null,
            taxRate: taxRate ? parseFloat(String(taxRate)) : 0,
            hasExpiry: hasExpiry === true || String(hasExpiry).toLowerCase() === 'true',
            isActive: true,
            createdBy: decoded.userId,
          },
          include: {
            baseUnit: true,
            preferredUnit: true,
          },
        })

        console.log(`Successfully created item ${i + 1}: ${item.code} - ${item.name}`)
        results.success.push(item)
      } catch (error: any) {
        console.error(`Error processing item ${i + 1}:`, error)
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
          data: itemData,
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${items.length} items. ${results.success.length} successful, ${results.errors.length} errors.`,
      results,
    })
  } catch (error: any) {
    console.error('Bulk items POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

