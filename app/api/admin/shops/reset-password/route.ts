import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const { userId, newPassword } = await request.json()

  if (!userId || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'userId and newPassword (min 8 chars) required' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const passwordHash = await hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  return NextResponse.json({ message: 'Password reset successfully' })
}
