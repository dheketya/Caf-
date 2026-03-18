import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/tenant'
import { hasModuleAccess, canApplyDiscount } from '@/lib/permissions'
import { incrementSaleCounter } from '@/lib/quota'
import { Role } from '@prisma/client'
import { z } from 'zod'

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().optional(),
      originalPrice: z.number().optional(),
      sizeName: z.string().optional(),
      sugarLevel: z.string().optional(),
      notes: z.string().optional(),
      modifierIds: z.array(z.string()).optional(),
    })
  ),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().optional(),
  discountReason: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'QR_EWALLET', 'SPLIT']),
  amountTendered: z.number().optional(),
  notes: z.string().optional(),
  customerId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  if (!hasModuleAccess(user.role as Role, 'pos')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createOrderSchema.parse(body)

    // Check discount permission
    if (data.discountValue && !canApplyDiscount(user.role as Role)) {
      return NextResponse.json({ error: 'No permission to apply discounts' }, { status: 403 })
    }

    // Check quota
    const canSell = await incrementSaleCounter(user.shopId)
    if (!canSell) {
      return NextResponse.json(
        { error: 'Sale quota reached. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    // Calculate order totals
    const products = await prisma.product.findMany({
      where: {
        id: { in: data.items.map((i) => i.productId) },
        shopId: user.shopId,
      },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { modifiers: true },
            },
          },
        },
      },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    let subtotal = 0
    const orderItems = data.items.map((item) => {
      const product = productMap.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)

      // Use provided unitPrice (from size selection) or fall back to product price
      const unitPrice = item.unitPrice ?? product.price
      let itemTotal = unitPrice * item.quantity

      // Calculate modifier prices
      const modifierDetails: { modifierId: string; priceAdjustment: number }[] = []
      if (item.modifierIds) {
        for (const modId of item.modifierIds) {
          for (const pmg of product.modifierGroups) {
            const mod = pmg.modifierGroup.modifiers.find((m) => m.id === modId)
            if (mod) {
              itemTotal += mod.priceAdjustment * item.quantity
              modifierDetails.push({
                modifierId: mod.id,
                priceAdjustment: mod.priceAdjustment,
              })
            }
          }
        }
      }

      subtotal += itemTotal

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        originalPrice: item.originalPrice,
        total: itemTotal,
        notes: item.notes,
        sizeName: item.sizeName,
        sugarLevel: item.sugarLevel,
        modifiers: modifierDetails,
      }
    })

    // Apply discount
    let discountAmount = 0
    if (data.discountValue) {
      if (data.discountType === 'percentage') {
        discountAmount = subtotal * (data.discountValue / 100)
      } else {
        discountAmount = data.discountValue
      }
    }

    const total = Math.max(0, subtotal - discountAmount)
    const changeAmount =
      data.paymentMethod === 'CASH' && data.amountTendered
        ? data.amountTendered - total
        : undefined

    // Get next order number
    const lastOrder = await prisma.order.findFirst({
      where: { shopId: user.shopId },
      orderBy: { orderNumber: 'desc' },
    })
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'COMPLETED',
        subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountReason: data.discountReason,
        taxAmount: 0,
        total,
        paymentMethod: data.paymentMethod,
        amountTendered: data.amountTendered,
        changeAmount,
        notes: data.notes,
        shopId: user.shopId,
        userId: user.id,
        customerId: data.customerId,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice,
            total: item.total,
            notes: item.notes,
            sizeName: item.sizeName,
            sugarLevel: item.sugarLevel,
            modifiers: {
              create: item.modifiers.map((m) => ({
                modifierId: m.modifierId,
                priceAdjustment: m.priceAdjustment,
              })),
            },
          })),
        },
      },
      include: { items: { include: { product: true } } },
    })

    // Deduct stock
    for (const item of data.items) {
      const ingredients = await prisma.productIngredient.findMany({
        where: { productId: item.productId },
      })
      for (const ing of ingredients) {
        await prisma.stockItem.update({
          where: { id: ing.stockItemId },
          data: {
            currentQuantity: { decrement: ing.quantity * item.quantity },
          },
        })
        await prisma.stockAdjustment.create({
          data: {
            type: 'SALE_DEDUCTION',
            quantity: -(ing.quantity * item.quantity),
            stockItemId: ing.stockItemId,
            userId: user.id,
            reason: `Order #${orderNumber}`,
          },
        })
      }
    }

    // Auto-create income entry
    await prisma.financeEntry.create({
      data: {
        type: 'INCOME',
        amount: total,
        category: 'Sales',
        paymentMethod: data.paymentMethod,
        date: new Date(),
        shopId: user.shopId,
        createdById: user.id,
        orderId: order.id,
      },
    })

    // Update customer stats
    if (data.customerId) {
      await prisma.customer.update({
        where: { id: data.customerId },
        data: {
          totalVisits: { increment: 1 },
          totalSpent: { increment: total },
          lastVisitAt: new Date(),
        },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { user } = auth
  if (!user.shopId) {
    return NextResponse.json({ error: 'No shop context' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const today = searchParams.get('today')
  const month = searchParams.get('month') // format: "2026-03"
  const payment = searchParams.get('payment')

  const where: any = { shopId: user.shopId }
  if (status) where.status = status
  if (today === 'true') {
    where.createdAt = { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.createdAt = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  }
  if (payment) {
    where.paymentMethod = payment
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(orders)
}
