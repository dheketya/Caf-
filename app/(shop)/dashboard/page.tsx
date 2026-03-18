import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getQuotaStatus } from '@/lib/quota'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back to {shop.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Sales</p>
              <p className="text-2xl font-bold text-gray-900">{todayOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(todayRevenue, shop.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Products</p>
              <p className="text-2xl font-bold text-gray-900">{productCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Quota</p>
              <p className="text-2xl font-bold text-gray-900">
                {quota.used}{quota.limit ? ` / ${quota.limit}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Checklist */}
      {!onboardingComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem
              done={productCount > 0}
              label="Add your first product"
              href="/products"
            />
            <ChecklistItem
              done={hasFirstSale}
              label="Make a test sale"
              href="/pos"
            />
            <ChecklistItem
              done={staffCount > 0}
              label="Invite a staff member"
              href="/users"
            />
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <Link href="/stock" className="text-sm text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {item.currentQuantity} {item.unit}
                    </span>
                    <Badge variant="warning">Low</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <CheckCircle2
        className={`h-5 w-5 ${done ? 'text-green-500' : 'text-gray-300'}`}
      />
      <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {label}
      </span>
    </Link>
  )
}
