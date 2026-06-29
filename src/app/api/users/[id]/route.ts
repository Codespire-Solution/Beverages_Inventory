import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, hashPassword } from '@/lib/auth'
import { validatePassword } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
}

export async function GET(
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

    // Only admin can view users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Only admin can update users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const { fullName, role, isActive, password } = body

    // Guard: cannot deactivate own account
    if (id === decoded.userId && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 }
      )
    }

    // Guard: cannot strip your own admin role (avoid locking yourself out of admin)
    if (id === decoded.userId && role === 'user') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin role.' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (role !== undefined) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json(
          { error: 'Role must be either admin or user' },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    if (isActive !== undefined) updateData.isActive = isActive

    if (password !== undefined && password !== '') {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
      }
      updateData.passwordHash = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('User PUT error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only admin can delete users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Guard: cannot delete own account
    if (id === decoded.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('User DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
