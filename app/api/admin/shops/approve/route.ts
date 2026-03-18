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

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop || shop.upgradeStatus !== 'pending') {
    return NextResponse.json({ error: 'No pending upgrade for this shop' }, { status: 400 })
  }

  if (action === 'approve') {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        packageId: shop.requestedPackageId!,
        billingCycle: shop.requestedBillingCycle || 'monthly',
        upgradeStatus: 'approved',
        requestedPackageId: null,
        requestedBillingCycle: null,
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
