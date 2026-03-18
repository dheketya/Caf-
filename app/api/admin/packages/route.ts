import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'
import { z } from 'zod'

const packageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  saleLimit: z.number().int().positive().nullable(),
  monthlyPrice: z.number().min(0),
  annualPrice: z.number().min(0),
  modules: z.array(z.string()),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  isVisible: z.boolean().optional(),
})

export async function GET() {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const packages = await prisma.package.findMany({
    include: { _count: { select: { shops: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(packages)
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const data = packageSchema.parse(body)

    const pkg = await prisma.package.create({ data })
    return NextResponse.json(pkg, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
    }

    const pkg = await prisma.package.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json(pkg)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
  }

  // Check if any active shops are on this package
  const shopCount = await prisma.shop.count({ where: { packageId: id } })
  if (shopCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${shopCount} active shop(s) are on this plan` },
      { status: 400 }
    )
  }

  await prisma.package.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
