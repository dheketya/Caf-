import { NextResponse } from 'next/server'
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

  return NextResponse.json(shop)
}
