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

    // Handle shop code change — rename all staff emails
    if (body.shopCode) {
      const newCode = body.shopCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (newCode.length < 2) {
        return NextResponse.json({ error: 'Shop code must be at least 2 characters' }, { status: 400 })
      }

      // Check uniqueness
      const existingShop = await prisma.shop.findUnique({ where: { shopCode: newCode } })
      if (existingShop && existingShop.id !== user.shopId) {
        return NextResponse.json({ error: 'Shop code already taken' }, { status: 400 })
      }

      const currentShop = await prisma.shop.findUnique({ where: { id: user.shopId } })
      const oldCode = currentShop?.shopCode

      // Rename all staff emails to username.NEWCODE
      const staffUsers = await prisma.user.findMany({
        where: { shopId: user.shopId, role: { not: 'SHOP_OWNER' } },
      })
      for (const staff of staffUsers) {
        // Extract username from any format: username.OLDCODE, username@shop.xxx, etc.
        let username = staff.email
        if (oldCode && staff.email.endsWith(`.${oldCode}`)) {
          username = staff.email.slice(0, -(oldCode.length + 1))
        } else if (staff.email.includes('@shop.')) {
          username = staff.email.split('@')[0]
        } else if (staff.email.includes('@')) {
          continue // skip real email users (shop owners)
        }
        const newEmail = `${username}.${newCode}`
        if (newEmail !== staff.email) {
          await prisma.user.update({
            where: { id: staff.id },
            data: { email: newEmail },
          })
        }
      }
    }

    // Build update data — only include fields that are present
    const data: any = {}
    if (body.shopCode) data.shopCode = body.shopCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
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
