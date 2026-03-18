import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json({ error: 'No shop' }, { status: 400 })

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
  })

  if (!customer || customer.shopId !== user.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch purchase history
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id, status: 'COMPLETED' },
    include: {
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ ...customer, orders })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json({ error: 'No shop' }, { status: 400 })

  const body = await request.json()
  const { name, note, phone } = body

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(note !== undefined && { note }),
      ...(phone !== undefined && { phone }),
    },
  })

  return NextResponse.json(customer)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json({ error: 'No shop' }, { status: 400 })

  const customer = await prisma.customer.findUnique({ where: { id: params.id } })
  if (!customer || customer.shopId !== user.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Unlink orders from this customer
  await prisma.order.updateMany({
    where: { customerId: params.id },
    data: { customerId: null },
  })

  await prisma.customer.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
