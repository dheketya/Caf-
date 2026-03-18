import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { kitchenReady: true },
  })

  return NextResponse.json(order)
}
