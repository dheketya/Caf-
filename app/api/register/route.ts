import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  country: z.string().min(1, 'Country is required'),
  packageId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional().default('monthly'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      )
    }

    // Always start on the Free (default) plan
    const freePlan = await prisma.package.findFirst({
      where: { isDefault: true },
    })
    if (!freePlan) {
      return NextResponse.json(
        { error: 'No default package configured' },
        { status: 500 }
      )
    }

    // Check if they requested a paid plan
    let requestedPackage = null
    if (data.packageId && data.packageId !== freePlan.id) {
      requestedPackage = await prisma.package.findUnique({
        where: { id: data.packageId },
      })
    }

    const isPaidRequest = requestedPackage && requestedPackage.monthlyPrice > 0

    const passwordHash = await hash(data.password, 12)

    // Create shop and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate shop code from business name abbreviation + random suffix
      // e.g. "The Poaster Café" -> "TPC", "HOK HOK" -> "HH", then add 2 random digits
      const words = data.businessName.trim().split(/\s+/).filter(Boolean)
      const abbr = words.length >= 2
        ? words.map((w) => w[0]).join('').toUpperCase().slice(0, 4)
        : data.businessName.slice(0, 3).toUpperCase()
      const suffix = Math.floor(10 + Math.random() * 90) // 2 random digits
      let shopCode = `${abbr}${suffix}`

      // Ensure uniqueness
      const existing = await tx.shop.findUnique({ where: { shopCode } })
      if (existing) shopCode = `${abbr}${Math.floor(100 + Math.random() * 900)}`

      const shop = await tx.shop.create({
        data: {
          name: data.businessName,
          shopCode,
          packageId: freePlan.id, // Always start on Free
          billingCycle: isPaidRequest ? data.billingCycle : 'monthly',
          // If paid plan requested, save it for approval
          ...(isPaidRequest && {
            requestedPackageId: requestedPackage!.id,
            requestedBillingCycle: data.billingCycle,
            upgradeStatus: 'pending',
          }),
        },
      })

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          passwordHash,
          role: 'SHOP_OWNER',
          shopId: shop.id,
        },
      })

      return { shop, user }
    })

    return NextResponse.json(
      {
        message: isPaidRequest
          ? 'Registration successful! Your plan upgrade is pending approval.'
          : 'Registration successful',
        shopId: result.shop.id,
        userId: result.user.id,
        pendingUpgrade: !!isPaidRequest,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
