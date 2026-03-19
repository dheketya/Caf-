import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  const shop = await prisma.shop.findUnique({
    where: { id: user.shopId },
    include: { package: true },
  })

  if (!shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  // Auto-downgrade check: if paid plan expired + 7 day grace period, switch to free
  const gracePeriodMs = 7 * 24 * 60 * 60 * 1000 // 7 days
  if (shop.planExpiresAt && (new Date(shop.planExpiresAt).getTime() + gracePeriodMs) < Date.now() && shop.package.monthlyPrice > 0) {
    const freePackage = await prisma.package.findFirst({
      where: { isDefault: true },
    })
    if (freePackage) {
      // Record expiration in history
      await prisma.planHistory.create({
        data: {
          shopId: shop.id,
          packageName: shop.package.name,
          billingCycle: shop.billingCycle,
          price: shop.billingCycle === 'annual' ? shop.package.annualPrice : shop.package.monthlyPrice,
          action: 'expired',
          startDate: shop.planStartedAt || shop.createdAt,
          endDate: new Date(),
        },
      })

      // Downgrade to free
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          packageId: freePackage.id,
          billingCycle: 'monthly',
          planExpiresAt: null,
          planStartedAt: new Date(),
        },
      })

      // Record free plan start
      await prisma.planHistory.create({
        data: {
          shopId: shop.id,
          packageName: freePackage.name,
          billingCycle: 'monthly',
          price: 0,
          action: 'downgraded',
          startDate: new Date(),
        },
      })

      // Re-fetch updated shop
      const updatedShop = await prisma.shop.findUnique({
        where: { id: user.shopId },
        include: { package: true },
      })
      if (updatedShop) {
        return buildBillingResponse(updatedShop, user.shopId)
      }
    }
  }

  return buildBillingResponse(shop, user.shopId)
}

async function buildBillingResponse(shop: any, shopId: string) {
  const [packages, requestedPackage, settings, planHistory] = await Promise.all([
    prisma.package.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
    }),
    shop.requestedPackageId
      ? prisma.package.findUnique({ where: { id: shop.requestedPackageId } })
      : null,
    prisma.platformSettings.findFirst(),
    prisma.planHistory.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  // Calculate days until expiry (plan expires, then 7 day grace before auto-downgrade)
  let daysUntilExpiry: number | null = null
  let daysUntilDowngrade: number | null = null
  if (shop.planExpiresAt) {
    const diff = new Date(shop.planExpiresAt).getTime() - Date.now()
    daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24))
    // Grace period: 7 days after expiry before auto-downgrade
    daysUntilDowngrade = daysUntilExpiry + 7
  }

  return NextResponse.json({
    plan: shop.package.name,
    packageId: shop.package.id,
    saleLimit: shop.quotaOverride ?? shop.package.saleLimit,
    saleCount: shop.saleCount,
    billingCycle: shop.billingCycle,
    monthlyPrice: shop.package.monthlyPrice,
    annualPrice: shop.package.annualPrice,
    modules: shop.package.modules as string[],
    upgradeStatus: shop.upgradeStatus,
    planExpiresAt: shop.planExpiresAt,
    planStartedAt: shop.planStartedAt,
    daysUntilExpiry,
    daysUntilDowngrade,
    requestedPackage: requestedPackage ? {
      id: requestedPackage.id,
      name: requestedPackage.name,
      monthlyPrice: requestedPackage.monthlyPrice,
      annualPrice: requestedPackage.annualPrice,
    } : null,
    requestedBillingCycle: shop.requestedBillingCycle,
    packages,
    khqrImage: settings?.khqrImage || null,
    planHistory,
  })
}

// Submit upgrade/renew request
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  if (user.role !== 'SHOP_OWNER' && user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { packageId, billingCycle } = await request.json()

  if (!packageId) {
    return NextResponse.json({ error: 'packageId required' }, { status: 400 })
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } })
  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  const shop = await prisma.shop.findUnique({ where: { id: user.shopId } })
  if (!shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  // If it's a free plan (renew = same plan), just reset status
  if (pkg.monthlyPrice === 0 && shop.packageId === packageId) {
    return NextResponse.json({ message: 'You are already on the Free plan' })
  }

  await prisma.shop.update({
    where: { id: user.shopId },
    data: {
      requestedPackageId: packageId,
      requestedBillingCycle: billingCycle || 'monthly',
      upgradeStatus: 'pending',
    },
  })

  return NextResponse.json({ message: 'Upgrade request submitted. Awaiting approval.' })
}
