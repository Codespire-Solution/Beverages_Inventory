import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, hashPassword } from '@/lib/auth'
import { validateEmail, validateRequired, validatePassword } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
}

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

    // Only admin can list users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const isActiveParam = searchParams.get('isActive')

    const where: any = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true'
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users GET error:', error)
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

    // Only admin can create users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, fullName, password, role } = body

    const emailValidation = validateEmail(email || '')
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 })
    }

    const fullNameValidation = validateRequired(fullName, 'Full name')
    if (!fullNameValidation.isValid) {
      return NextResponse.json({ error: fullNameValidation.error }, { status: 400 })
    }

    const passwordValidation = validatePassword(password || '')
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
    }

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Role must be either admin or user' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role,
        isActive: true,
      },
      select: userSelect,
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    console.error('Users POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
