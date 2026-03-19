import { prisma } from './db'
import { startOfMonth } from 'date-fns'

interface QuotaStatus {
  used: number
  limit: number | null // null = unlimited
  remaining: number | null
  percentage: number
  isBlocked: boolean
  resetDate: Date
}

/**
 * Get the current sale quota status for a shop.
 * Resets the counter if a new month has started.
 */
export async function getQuotaStatus(shopId: string): Promise<QuotaStatus> {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    include: { package: true },
  })

  // Check if we need to reset (new month)
  const now = new Date()
  const monthStart = startOfMonth(now)
  if (shop.saleCountResetAt < monthStart) {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        saleCount: 0,
        saleCountResetAt: monthStart,
        quotaOverride: null,
        quotaOverrideNote: null,
      },
    })
    shop.saleCount = 0
  }

  const limit = shop.quotaOverride ?? shop.package.saleLimit // null = unlimited
  const used = shop.saleCount

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    used,
    limit,
    remaining: limit !== null ? Math.max(0, limit - used) : null,
    percentage: limit !== null ? Math.round((used / limit) * 100) : 0,
    isBlocked: limit !== null && used >= limit,
    resetDate: nextMonth,
  }
}

/**
 * Atomically increment the sale counter.
 * Returns false if blocked by quota.
 */
export async function incrementSaleCounter(shopId: string): Promise<boolean> {
  const status = await getQuotaStatus(shopId)
  if (status.isBlocked) return false

  // Atomic increment + update last active
  await prisma.$executeRaw`
    UPDATE shops
    SET sale_count = sale_count + 1, last_active_at = NOW()
    WHERE id = ${shopId}
  `

  return true
}

/**
 * Get the colour coding for the quota percentage.
 */
export function getQuotaColor(percentage: number): 'green' | 'amber' | 'red' {
  if (percentage >= 90) return 'red'
  if (percentage >= 70) return 'amber'
  return 'green'
}
