import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/auth',
  '/api/register',
  '/api/packages',
  '/api/platform-settings/khqr',
]

// Map page routes to required modules (mirrors lib/permissions.ts)
const routeModuleMap: Record<string, string> = {
  '/pos': 'pos',
  '/products': 'products',
  '/stock': 'stock',
  '/income': 'income',
  '/reports': 'reports',
  '/users': 'users',
  '/billing': 'billing',
  '/settings': 'settings',
  '/chat': 'chat',
  '/kitchen': 'kitchen',
  '/customers': 'pos', // customers page needs at least POS access
}

const roleModuleAccess: Record<string, string[]> = {
  PLATFORM_OWNER: ['pos', 'products', 'stock', 'income', 'reports', 'users', 'billing', 'settings', 'chat', 'kitchen'],
  SHOP_OWNER: ['pos', 'products', 'stock', 'income', 'reports', 'users', 'billing', 'settings', 'chat'],
  MANAGER: ['pos', 'products', 'stock', 'income', 'reports', 'chat'],
  CASHIER: ['pos', 'stock'],
  KITCHEN: ['kitchen'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string

  // Admin routes require PLATFORM_OWNER
  if (pathname.startsWith('/admin') && role !== 'PLATFORM_OWNER') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Kitchen role can only access /kitchen and /api
  if (
    role === 'KITCHEN' &&
    !pathname.startsWith('/kitchen') &&
    !pathname.startsWith('/api')
  ) {
    return NextResponse.redirect(new URL('/kitchen', req.url))
  }

  // Check route-level module access for shop pages
  if (!pathname.startsWith('/api') && !pathname.startsWith('/admin')) {
    const allowedModules = roleModuleAccess[role] || []

    for (const [route, module] of Object.entries(routeModuleMap)) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        if (!allowedModules.includes(module)) {
          // Redirect to dashboard (or POS for cashier)
          const fallback = role === 'CASHIER' ? '/pos' : '/dashboard'
          return NextResponse.redirect(new URL(fallback, req.url))
        }
        break
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
