import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId') || user.shopId

  if (!shopId) {
    return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
  }

  // Only platform owner can view other shops' chats
  if (shopId !== user.shopId && user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const messages = await prisma.chatMessage.findMany({
    where: { shopId },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  // Mark messages as read
  if (user.role === 'PLATFORM_OWNER') {
    await prisma.chatMessage.updateMany({
      where: { shopId, isRead: false, senderId: { not: user.id } },
      data: { isRead: true },
    })
  }

  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  const body = await request.json()
  const { content, imageUrl, shopId: targetShopId } = body

  const shopId = targetShopId || user.shopId
  if (!shopId) {
    return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
  }

  if (shopId !== user.shopId && user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const message = await prisma.chatMessage.create({
    data: {
      content,
      imageUrl,
      shopId,
      senderId: user.id,
    },
    include: { sender: { select: { name: true, role: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
