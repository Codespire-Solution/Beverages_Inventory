import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import * as XLSX from 'xlsx'

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

    // Create template data
    const templateData = [
      {
        'Code (Optional - leave blank for auto-generation)': '',
        'Name*': 'Example Item Name',
        'Description': 'Item description',
        'Category*': 'raw_material',
        'Base Unit ID*': '1',
        'Preferred Unit ID (Optional)': '',
        'Standard Cost': '0',
        'MOQ (Minimum Order Quantity)': '',
        'Min Stock Quantity (Reorder Level)': '100',
        'Tax Rate (%)': '0',
        'Has Expiry (true/false)': 'false',
      },
    ]

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Template')

    // Add instructions sheet
    const instructions = [
      { Instruction: 'Required fields are marked with *' },
      { Instruction: 'Leave Code blank to auto-generate (e.g., ITM-0001)' },
      { Instruction: 'Category must be one of: raw_material, packaging, finished_good' },
      { Instruction: 'Base Unit ID must be a valid unit ID from the Units page' },
      { Instruction: 'Preferred Unit ID is optional' },
      { Instruction: 'Has Expiry should be "true" or "false"' },
      { Instruction: 'Delete the example row before uploading your data' },
    ]
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions)
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="items-upload-template.xlsx"',
      },
    })
  } catch (error: any) {
    console.error('Template GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

