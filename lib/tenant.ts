import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './db'
import { NextResponse } from 'next/server'

/**
 * Get the current authenticated user's session with shop context.
 * Returns null if not authenticated.
 */
export async function getSessionWithShop() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      shop: {
        include: { package: true },
      },
    },
  })

  if (!user || !user.isActive) return null
  if (user.shop && user.shop.status === 'SUSPENDED') return null

  return { session, user }
}

/**
 * Require authentication and return session, or respond with 401.
 */
export async function requireAuth() {
  const result = await getSessionWithShop()
  if (!result) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session: result.session, user: result.user }
}

/**
 * Require that the user belongs to a specific shop.
 */
export async function requireShopAccess(shopId: string) {
  const auth = await requireAuth()
  if ('error' in auth) return auth

  const { user } = auth
  // Platform owner can access any shop
  if (user.role === 'PLATFORM_OWNER') return auth

  if (user.shopId !== shopId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return auth
}

/**
 * Require platform owner role.
 */
export async function requirePlatformOwner() {
  const auth = await requireAuth()
  if ('error' in auth) return auth

  if (auth.user.role !== 'PLATFORM_OWNER') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return auth
}
