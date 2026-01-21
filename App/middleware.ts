import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const privyToken = request.cookies.get('privy-token')
  const isAuthPage = request.nextUrl.pathname === '/auth'
  const isPublicPage = [
    '/',
    '/api/health',
    '/api/x402/challenge',
    '/api/x402/webhook',
    '/api/x402/settle',
    '/api/treasury',
    '/api/contracts/events'
  ].some(path => request.nextUrl.pathname.startsWith(path))

  // If not authenticated and trying to access protected page
  if (!privyToken && !isPublicPage && !isAuthPage) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated and trying to access root (should go to dashboard)
  if (privyToken && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|api/x402/challenge|api/x402/webhook).*)',
  ],
}