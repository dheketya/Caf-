import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getQuotaStatus } from '@/lib/quota'
import { ShopLayoutClient } from './shop-layout-client'

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Platform owner visiting shop pages — redirect to admin
  if (session.user.role === 'PLATFORM_OWNER' && !session.user.shopId) {
    redirect('/admin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { shop: { include: { package: true } } },
  })

  if (!user?.shop) {
    redirect('/login')
  }

  const quota = await getQuotaStatus(user.shop.id)

  return (
    <ShopLayoutClient
      role={user.role}
      shopName={user.shop.name}
      shopLogo={user.shop.logo}
      brandColor={user.shop.brandColor}
      packageName={user.shop.package.name}
      quota={{
        used: quota.used,
        limit: quota.limit,
        resetDate: quota.resetDate,
        isBlocked: quota.isBlocked,
      }}
    >
      {children}
    </ShopLayoutClient>
  )
}
