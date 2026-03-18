import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasModuleAccess } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { z } from 'zod'

const modifierGroupSchema = z.object({
  name: z.string().min(1),
  isRequired: z.boolean().optional(),
  modifiers: z.array(z.object({
    name: z.string().min(1),
    priceAdjustment: z.number().default(0),
  })),
  productIds: z.array(z.string()).optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const groups = await prisma.modifierGroup.findMany({
    where: { shopId: user.shopId },
    include: {
      modifiers: { orderBy: { createdAt: 'asc' } },
      products: { select: { productId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(groups)
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
    const data = modifierGroupSchema.parse(body)

    const group = await prisma.modifierGroup.create({
      data: {
        name: data.name,
        isRequired: data.isRequired ?? false,
        shopId: user.shopId,
        modifiers: {
          create: data.modifiers.map((m) => ({
            name: m.name,
            priceAdjustment: m.priceAdjustment,
          })),
        },
        ...(data.productIds && data.productIds.length > 0 && {
          products: {
            create: data.productIds.map((pid) => ({ productId: pid })),
          },
        }),
      },
      include: { modifiers: true, products: true },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'products')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, name, isRequired, modifiers, productIds } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Update group name/required
    await prisma.modifierGroup.update({
      where: { id },
      data: { name, isRequired },
    })

    // Replace modifiers
    if (modifiers) {
      await prisma.modifier.deleteMany({ where: { groupId: id } })
      await prisma.modifier.createMany({
        data: modifiers.map((m: { name: string; priceAdjustment: number }) => ({
          name: m.name,
          priceAdjustment: m.priceAdjustment || 0,
          groupId: id,
        })),
      })
    }

    // Replace product assignments
    if (productIds !== undefined) {
      await prisma.productModifierGroup.deleteMany({ where: { modifierGroupId: id } })
      if (productIds.length > 0) {
        await prisma.productModifierGroup.createMany({
          data: productIds.map((pid: string) => ({
            productId: pid,
            modifierGroupId: id,
          })),
        })
      }
    }

    const updated = await prisma.modifierGroup.findUnique({
      where: { id },
      include: { modifiers: true, products: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
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
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.productModifierGroup.deleteMany({ where: { modifierGroupId: id } })
  await prisma.modifierGroup.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
