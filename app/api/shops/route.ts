import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  if (user.role !== 'SHOP_OWNER' && user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Build update data — only include fields that are present
    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.phone !== undefined) data.phone = body.phone
    if (body.address !== undefined) data.address = body.address
    if (body.currency !== undefined) data.currency = body.currency
    if (body.timezone !== undefined) data.timezone = body.timezone
    if (body.brandColor !== undefined) data.brandColor = body.brandColor
    if (body.logo !== undefined) data.logo = body.logo
    if (body.sugarLevels !== undefined) data.sugarLevels = body.sugarLevels
    if (body.exchangeRate !== undefined) data.exchangeRate = Number(body.exchangeRate)
    if (body.loyaltyEnabled !== undefined) data.loyaltyEnabled = Boolean(body.loyaltyEnabled)
    if (body.loyaltyTarget !== undefined) data.loyaltyTarget = Number(body.loyaltyTarget)
    if (body.loyaltyDiscountType !== undefined) data.loyaltyDiscountType = body.loyaltyDiscountType
    if (body.loyaltyDiscountValue !== undefined) data.loyaltyDiscountValue = Number(body.loyaltyDiscountValue)

    const shop = await prisma.shop.update({
      where: { id: user.shopId },
      data,
    })

    return NextResponse.json(shop)
  } catch (error) {
    console.error('Shop update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
