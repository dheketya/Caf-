import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth

  if (user.role === 'PLATFORM_OWNER') {
    // Get all shops that have chat messages, with latest message preview
    const shops = await prisma.shop.findMany({
      where: { chatMessages: { some: {} } },
      select: {
        id: true,
        name: true,
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: {
            chatMessages: {
              where: { isRead: false, senderId: { not: user.id } },
            },
          },
        },
      },
    })

    const previews = shops
      .filter((s) => s.chatMessages.length > 0)
      .map((s) => ({
        shopId: s.id,
        shopName: s.name,
        lastMessage: s.chatMessages[0].content,
        senderName: s.chatMessages[0].sender.name || 'Unknown',
        createdAt: s.chatMessages[0].createdAt.toISOString(),
        unreadCount: s._count.chatMessages,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(previews)
  }

  // Shop user: show their own chat preview
  if (!user.shopId) {
    return NextResponse.json([])
  }

  const shop = await prisma.shop.findUnique({
    where: { id: user.shopId },
    select: { id: true, name: true },
  })

  const lastMessage = await prisma.chatMessage.findFirst({
    where: { shopId: user.shopId },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { name: true } } },
  })

  const unreadCount = await prisma.chatMessage.count({
    where: {
      shopId: user.shopId,
      isRead: false,
      senderId: { not: user.id },
    },
  })

  if (!lastMessage || !shop) {
    return NextResponse.json([])
  }

  return NextResponse.json([{
    shopId: shop.id,
    shopName: shop.name,
    lastMessage: lastMessage.content,
    senderName: lastMessage.sender.name || 'Admin',
    createdAt: lastMessage.createdAt.toISOString(),
    unreadCount,
  }])
}
