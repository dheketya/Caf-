import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasModuleAccess } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { z } from 'zod'

const entrySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive(),
  category: z.string().optional(),
  expenseCategory: z.enum(['INGREDIENTS', 'RENT', 'UTILITIES', 'SALARIES', 'OTHER']).optional(),
  vendorName: z.string().optional(),
  note: z.string().optional(),
  date: z.string(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'income')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = { shopId: user.shopId }
  if (type) where.type = type
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  const entries = await prisma.financeEntry.findMany({
    where,
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 200,
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId || !hasModuleAccess(user.role as Role, 'income')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = entrySchema.parse(body)

    // Expenses created by manager need approval
    const needsApproval = data.type === 'EXPENSE' && user.role === 'MANAGER'

    const entry = await prisma.financeEntry.create({
      data: {
        ...data,
        date: new Date(data.date),
        shopId: user.shopId,
        createdById: user.id,
        approvalStatus: needsApproval ? 'PENDING' : 'APPROVED',
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
