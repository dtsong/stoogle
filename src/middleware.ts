import { NextRequest, NextResponse } from 'next/server'
import { BETA_COOKIE_NAME } from '@/lib/beta'

const BYPASS_PREFIXES = ['/beta', '/api/', '/admin', '/auth/', '/_next/', '/favicon.ico']

export function middleware(request: NextRequest) {
  const code = process.env.BETA_ACCESS_CODE ?? ''
  if (!code) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(BETA_COOKIE_NAME)?.value
  if (cookie === code) {
    return NextResponse.next()
  }

  const betaUrl = new URL('/beta', request.url)
  return NextResponse.redirect(betaUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
