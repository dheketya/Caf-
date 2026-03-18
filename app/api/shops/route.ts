import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { z } from 'zod'

const updateShopSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  logo: z.string().optional(),
  brandColor: z.string().optional(),
  sugarLevels: z.array(z.string()).optional(),
  exchangeRate: z.number().positive().optional(),
})

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  // Only shop owner can edit settings
  if (user.role !== 'SHOP_OWNER' && user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateShopSchema.parse(body)

    const shop = await prisma.shop.update({
      where: { id: user.shopId },
      data,
    })

    return NextResponse.json(shop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
