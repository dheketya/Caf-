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

  // Admin routes require PLATFORM_OWNER
  if (pathname.startsWith('/admin') && token.role !== 'PLATFORM_OWNER') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Kitchen role can only access /kitchen and /api
  if (
    token.role === 'KITCHEN' &&
    !pathname.startsWith('/kitchen') &&
    !pathname.startsWith('/api')
  ) {
    return NextResponse.redirect(new URL('/kitchen', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
