import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

// Approve or reject a shop's plan upgrade request
export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const { shopId, action } = await request.json()

  if (!shopId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'shopId and action (approve/reject) required' }, { status: 400 })
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { package: true },
  })
  if (!shop || shop.upgradeStatus !== 'pending') {
    return NextResponse.json({ error: 'No pending upgrade for this shop' }, { status: 400 })
  }

  if (action === 'approve') {
    const newPackage = await prisma.package.findUnique({
      where: { id: shop.requestedPackageId! },
    })
    if (!newPackage) {
      return NextResponse.json({ error: 'Requested package not found' }, { status: 400 })
    }

    const cycle = shop.requestedBillingCycle || 'monthly'
    const now = new Date()
    const price = cycle === 'annual' ? newPackage.annualPrice : newPackage.monthlyPrice

    // Calculate expiration: free plan = no expiry, paid = 1 month or 1 year from now
    let planExpiresAt: Date | null = null
    if (price > 0) {
      planExpiresAt = new Date(now)
      if (cycle === 'annual') {
        planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1)
      } else {
        planExpiresAt.setMonth(planExpiresAt.getMonth() + 1)
      }
    }

    // Record old plan in history if it was a paid plan
    if (shop.package.monthlyPrice > 0 || shop.package.annualPrice > 0) {
      await prisma.planHistory.create({
        data: {
          shopId,
          packageName: shop.package.name,
          billingCycle: shop.billingCycle,
          price: shop.billingCycle === 'annual' ? shop.package.annualPrice : shop.package.monthlyPrice,
          action: 'upgraded',
          startDate: shop.planStartedAt || shop.createdAt,
          endDate: now,
        },
      })
    }

    // Update shop with new plan
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        packageId: shop.requestedPackageId!,
        billingCycle: cycle,
        upgradeStatus: 'approved',
        requestedPackageId: null,
        requestedBillingCycle: null,
        planExpiresAt,
        planStartedAt: now,
        quotaOverride: null,
        quotaOverrideNote: null,
      },
    })

    // Record new plan in history
    await prisma.planHistory.create({
      data: {
        shopId,
        packageName: newPackage.name,
        billingCycle: cycle,
        price,
        action: 'subscribed',
        startDate: now,
        endDate: planExpiresAt,
      },
    })

    return NextResponse.json({ message: 'Plan upgrade approved' })
  }

  // Reject
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      upgradeStatus: 'rejected',
      requestedPackageId: null,
      requestedBillingCycle: null,
    },
  })
  return NextResponse.json({ message: 'Plan upgrade rejected' })
}
