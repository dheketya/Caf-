import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'monthly' // daily | weekly | monthly | yearly

  // Calculate date range
  const now = new Date()
  let startDate: Date
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
      break
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  // Get all stats in parallel
  const [
    totalShops,
    activeShops,
    totalSales,
    totalRevenueAgg,
    periodSales,
    periodRevenueAgg,
    periodNewShops,
    packages,
    allShopsWithPackage,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { total: true } }),
    prisma.order.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate } } }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: startDate } },
      _sum: { total: true },
    }),
    prisma.shop.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        package: true,
        users: { where: { role: 'SHOP_OWNER' }, select: { name: true, email: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.package.findMany({
      include: { _count: { select: { shops: true } } },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.shop.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        billingCycle: true,
        package: { select: { name: true, monthlyPrice: true, annualPrice: true } },
      },
    }),
  ])

  // Plan distribution with billing cycle breakdown
  const planDistribution = packages.map((pkg) => {
    const monthlyShops = allShopsWithPackage.filter(
      (s) => s.package.name === pkg.name && s.billingCycle === 'monthly'
    )
    const annualShops = allShopsWithPackage.filter(
      (s) => s.package.name === pkg.name && s.billingCycle === 'annual'
    )
    const monthlyRevenue = monthlyShops.length * pkg.monthlyPrice
    const annualRevenue = annualShops.length * (pkg.annualPrice / 12) // monthly equivalent

    return {
      name: pkg.name,
      total: pkg._count.shops,
      monthly: monthlyShops.length,
      annual: annualShops.length,
      monthlyPrice: pkg.monthlyPrice,
      annualPrice: pkg.annualPrice,
      estimatedMonthlyRevenue: monthlyRevenue + annualRevenue,
    }
  })

  // Total estimated subscription revenue
  const totalSubscriptionRevenue = planDistribution.reduce(
    (sum, p) => sum + p.estimatedMonthlyRevenue,
    0
  )

  // New shops in period with their plan info
  const newShops = periodNewShops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    packageName: shop.package.name,
    billingCycle: shop.billingCycle,
    price:
      shop.billingCycle === 'annual'
        ? shop.package.annualPrice
        : shop.package.monthlyPrice,
    ownerName: shop.users[0]?.name || '-',
    ownerEmail: shop.users[0]?.email || '-',
    createdAt: shop.createdAt,
  }))

  return NextResponse.json({
    totalShops,
    activeShops,
    totalSales,
    totalRevenue: totalRevenueAgg._sum.total || 0,
    periodSales,
    periodRevenue: periodRevenueAgg._sum.total || 0,
    periodNewShops: newShops,
    planDistribution,
    totalSubscriptionRevenue,
    period,
  })
}
