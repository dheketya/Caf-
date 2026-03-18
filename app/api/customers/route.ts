import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { z } from 'zod'

const customerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  note: z.string().optional(),
})

// List customers or search by phone
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  const search = searchParams.get('search')

  const where: any = { shopId: user.shopId }

  if (phone) {
    // Exact phone lookup
    const customer = await prisma.customer.findUnique({
      where: { shopId_phone: { shopId: user.shopId, phone } },
    })
    return NextResponse.json(customer || null)
  }

  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { name: { contains: search } },
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { lastVisitAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(customers)
}

// Create or update customer (upsert by phone)
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.upsert({
      where: { shopId_phone: { shopId: user.shopId, phone: data.phone } },
      update: {
        ...(data.name && { name: data.name }),
        ...(data.note !== undefined && { note: data.note }),
      },
      create: {
        phone: data.phone,
        name: data.name,
        note: data.note,
        shopId: user.shopId,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
