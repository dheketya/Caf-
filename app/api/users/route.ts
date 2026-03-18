import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { canManageUsers } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MANAGER', 'CASHIER', 'KITCHEN']),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.invitation.findMany({
      where: { shopId: user.shopId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ users, invitations })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !canManageUsers(user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = inviteSchema.parse(body)

    // Check if already a member
    const existing = await prisma.user.findFirst({
      where: { email: data.email, shopId: user.shopId },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    const token = randomBytes(32).toString('hex')

    const invitation = await prisma.invitation.create({
      data: {
        email: data.email,
        role: data.role,
        token,
        shopId: user.shopId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // TODO: Send invitation email

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
