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

  // Fetch all visible packages for upgrade options
  const packages = await prisma.package.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
  })

  // Fetch requested package name if pending
  let requestedPackage = null
  if (shop.requestedPackageId) {
    requestedPackage = await prisma.package.findUnique({
      where: { id: shop.requestedPackageId },
    })
  }

  // Fetch KHQR
  const settings = await prisma.platformSettings.findFirst()

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
    requestedPackage: requestedPackage ? {
      id: requestedPackage.id,
      name: requestedPackage.name,
      monthlyPrice: requestedPackage.monthlyPrice,
      annualPrice: requestedPackage.annualPrice,
    } : null,
    requestedBillingCycle: shop.requestedBillingCycle,
    packages,
    khqrImage: settings?.khqrImage || null,
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
