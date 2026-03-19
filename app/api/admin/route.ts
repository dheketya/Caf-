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

  // Recent plan changes (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentPlanChanges = await prisma.planHistory.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: { shop: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Shops with plans expiring within 14 days (near due date)
  const fourteenDaysFromNow = new Date()
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)

  const nearDueShops = await prisma.shop.findMany({
    where: {
      planExpiresAt: { lte: fourteenDaysFromNow, gte: new Date() },
      status: 'ACTIVE',
    },
    include: { package: true },
    orderBy: { planExpiresAt: 'asc' },
  })

  // Expired shops (in 7-day grace period)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const expiredShops = await prisma.shop.findMany({
    where: {
      planExpiresAt: { lt: new Date(), gte: sevenDaysAgo },
      status: 'ACTIVE',
      package: { monthlyPrice: { gt: 0 } },
    },
    include: { package: true },
    orderBy: { planExpiresAt: 'asc' },
  })

  // All shops with last active date for the shops list
  const allShops = await prisma.shop.findMany({
    include: {
      package: true,
      users: { where: { role: 'SHOP_OWNER' }, select: { name: true, email: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    shopCount,
    activeShopCount,
    totalSales,
    totalRevenue: totalRevenue._sum.total || 0,
    packages,
    unreadChats: unreadChats.length,
    recentPlanChanges: recentPlanChanges.map((h) => ({
      id: h.id,
      shopName: h.shop.name,
      packageName: h.packageName,
      billingCycle: h.billingCycle,
      price: h.price,
      action: h.action,
      startDate: h.startDate,
      endDate: h.endDate,
      createdAt: h.createdAt,
    })),
    nearDueShops: nearDueShops.map((s) => ({
      id: s.id,
      name: s.name,
      packageName: s.package.name,
      planExpiresAt: s.planExpiresAt,
      daysLeft: Math.ceil((new Date(s.planExpiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    })),
    expiredShops: expiredShops.map((s) => ({
      id: s.id,
      name: s.name,
      packageName: s.package.name,
      planExpiresAt: s.planExpiresAt,
      daysOverdue: Math.ceil((Date.now() - new Date(s.planExpiresAt!).getTime()) / (1000 * 60 * 60 * 24)),
      graceDaysLeft: 7 - Math.ceil((Date.now() - new Date(s.planExpiresAt!).getTime()) / (1000 * 60 * 60 * 24)),
    })),
    shopsWithActivity: allShops.map((s) => ({
      id: s.id,
      name: s.name,
      lastActiveAt: s.lastActiveAt,
      packageName: s.package.name,
      ownerName: s.users[0]?.name || '-',
    })),
  })
}
