import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth

  if (user.role === 'PLATFORM_OWNER') {
    // Count unread messages from all shops (sent by shop users, not by admin)
    const count = await prisma.chatMessage.count({
      where: { isRead: false, senderId: { not: user.id } },
    })
    return NextResponse.json({ count })
  }

  if (!user.shopId) {
    return NextResponse.json({ count: 0 })
  }

  // Count unread messages for this shop (sent by platform owner, not by shop users)
  const count = await prisma.chatMessage.count({
    where: {
      shopId: user.shopId,
      isRead: false,
      senderId: { not: user.id },
    },
  })

  return NextResponse.json({ count })
}
