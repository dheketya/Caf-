import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

export async function GET() {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const [shopCount, activeShopCount, totalSales, packages] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.package.findMany({
      include: { _count: { select: { shops: true } } },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  const totalRevenue = await prisma.order.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { total: true },
  })

  // Unread chat messages
  const unreadChats = await prisma.chatMessage.groupBy({
    by: ['shopId'],
    where: { isRead: false },
    _count: true,
  })

  return NextResponse.json({
    shopCount,
    activeShopCount,
    totalSales,
    totalRevenue: totalRevenue._sum.total || 0,
    packages,
    unreadChats: unreadChats.length,
  })
}
