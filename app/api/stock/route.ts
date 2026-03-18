import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { canEditStock } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { z } from 'zod'

const stockItemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  currentQuantity: z.number().optional(),
  reorderThreshold: z.number().optional(),
  costPerUnit: z.number().optional(),
})

const adjustmentSchema = z.object({
  stockItemId: z.string(),
  type: z.enum(['RECEIVE', 'WASTAGE', 'CORRECTION']),
  quantity: z.number(),
  supplierName: z.string().optional(),
  purchasePrice: z.number().optional(),
  reason: z.string().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) return NextResponse.json([])

  const items = await prisma.stockItem.findMany({
    where: { shopId: user.shopId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !canEditStock(user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Check if it's an adjustment or new item
    if (body.stockItemId) {
      const data = adjustmentSchema.parse(body)
      const adjustment = await prisma.$transaction(async (tx) => {
        const adj = await tx.stockAdjustment.create({
          data: { ...data, userId: user.id },
        })
        await tx.stockItem.update({
          where: { id: data.stockItemId },
          data: {
            currentQuantity: {
              increment: data.type === 'RECEIVE' ? Math.abs(data.quantity) : -Math.abs(data.quantity),
            },
          },
        })
        return adj
      })
      return NextResponse.json(adjustment, { status: 201 })
    }

    const data = stockItemSchema.parse(body)
    const item = await prisma.stockItem.create({
      data: { ...data, shopId: user.shopId },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
