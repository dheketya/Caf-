import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasModuleAccess } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const categories = await prisma.category.findMany({
    where: { shopId: user.shopId },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(categories)
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
    const data = categorySchema.parse(body)

    const category = await prisma.category.create({
      data: { ...data, shopId: user.shopId },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
