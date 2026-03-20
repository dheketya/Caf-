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
  parentId: z.string().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  parentId: z.string().nullable().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const categories = await prisma.category.findMany({
    where: { shopId: user.shopId },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
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
      data: {
        name: data.name,
        color: data.color,
        sortOrder: data.sortOrder,
        parentId: data.parentId || null,
        shopId: user.shopId,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'products')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.category.findFirst({
      where: { id: data.id, shopId: user.shopId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const category = await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        color: data.color,
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'products')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const existing = await prisma.category.findFirst({
    where: { id, shopId: user.shopId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Unlink products and sub-categories, then delete
  await prisma.product.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  })
  await prisma.category.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  })
  await prisma.category.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
