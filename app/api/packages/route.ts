import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint — no auth required. Used on registration page.
export async function GET() {
  const packages = await prisma.package.findMany({
    where: { isVisible: true },
    select: {
      id: true,
      name: true,
      description: true,
      saleLimit: true,
      monthlyPrice: true,
      annualPrice: true,
      modules: true,
      sortOrder: true,
      isDefault: true,
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(packages)
}
