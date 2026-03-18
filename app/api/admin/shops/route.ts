import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

export async function GET() {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const shops = await prisma.shop.findMany({
    include: {
      package: true,
      users: {
        where: { role: 'SHOP_OWNER' },
        select: { id: true, name: true, email: true },
        take: 1,
      },
      _count: { select: { users: true, orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch requested package names for pending upgrades
  const pendingShops = shops.filter((s) => s.upgradeStatus === 'pending' && s.requestedPackageId)
  const requestedPackageIds = [...new Set(pendingShops.map((s) => s.requestedPackageId!))]

  const requestedPackages = requestedPackageIds.length > 0
    ? await prisma.package.findMany({ where: { id: { in: requestedPackageIds } } })
    : []

  const packageMap = Object.fromEntries(requestedPackages.map((p) => [p.id, p]))

  const result = shops.map((shop) => ({
    ...shop,
    owner: shop.users[0] || null,
    users: undefined,
    requestedPackage: shop.requestedPackageId ? packageMap[shop.requestedPackageId] || null : null,
  }))

  return NextResponse.json(result)
}

// Update shop (quota override, status change, plan change)
export async function PATCH(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { shopId, ...updates } = body

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 })
    }

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: updates,
      include: { package: true },
    })

    return NextResponse.json(shop)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
