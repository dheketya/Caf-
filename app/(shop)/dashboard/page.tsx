import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getQuotaStatus } from '@/lib/quota'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.shopId) return null

  const shopId = session.user.shopId

  const [shop, todayOrders, lowStockItems, quota] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      include: { package: true },
    }),
    prisma.order.findMany({
      where: {
        shopId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.stockItem.findMany({
      where: {
        shopId,
        currentQuantity: { lte: prisma.stockItem.fields.reorderThreshold },
      },
      take: 10,
    }),
    getQuotaStatus(shopId),
  ])

  if (!shop) return null

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)

  // Onboarding checklist
  const productCount = await prisma.product.count({ where: { shopId } })
  const staffCount = await prisma.user.count({ where: { shopId, role: { not: 'SHOP_OWNER' } } })
  const hasFirstSale = todayOrders.length > 0 || shop.saleCount > 0

  const onboardingComplete = productCount > 0 && hasFirstSale && staffCount > 0

  return (
    <DashboardClient
      shopName={shop.name}
      shopCurrency={shop.currency}
      todayOrdersCount={todayOrders.length}
      todayRevenue={todayRevenue}
      productCount={productCount}
      quotaUsed={quota.used}
      quotaLimit={quota.limit}
      onboardingComplete={onboardingComplete}
      hasFirstSale={hasFirstSale}
      staffCount={staffCount}
      lowStockItems={lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        currentQuantity: item.currentQuantity,
        unit: item.unit,
      }))}
    />
  )
}
