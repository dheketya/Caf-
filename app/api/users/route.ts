import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { canManageUsers } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { hash } from 'bcryptjs'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const users = await prisma.user.findMany({
    where: { shopId: user.shopId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ users })
}

// Create user directly
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !canManageUsers(user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { username, name, password, role } = body

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password, and role are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Use username.shopCode as email for uniqueness
    const shop = await prisma.shop.findUnique({ where: { id: user.shopId }, select: { shopCode: true } })
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 400 })

    const email = username.includes('@') ? username : `${username}.${shop.shopCode}`

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        name: name || username,
        email,
        passwordHash,
        role,
        shopId: user.shopId,
      },
    })

    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Toggle active status or reset password
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !canManageUsers(user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, action, newPassword } = body

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser || targetUser.shopId !== user.shopId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Cannot modify shop owner' }, { status: 403 })
    }

    if (action === 'toggle') {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive: !targetUser.isActive },
      })
      return NextResponse.json(updated)
    }

    if (action === 'reset-password' && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      const passwordHash = await hash(newPassword, 12)
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      })
      return NextResponse.json({ message: 'Password reset' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
