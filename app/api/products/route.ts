import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasModuleAccess } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  sku: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const products = await prisma.product.findMany({
    where: { shopId: user.shopId, isActive: true },
    include: {
      category: true,
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { modifiers: { orderBy: { createdAt: 'asc' } } },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'products')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = productSchema.parse(body)

    const product = await prisma.product.create({
      data: { ...data, shopId: user.shopId },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
