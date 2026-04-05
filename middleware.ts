import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

function isPublicApi(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/login')) return true
  if (pathname.startsWith('/api/audit/login')) return true
  if (pathname.startsWith('/api/audit/logout')) return true
  if (pathname.startsWith('/api/company/logo')) return true
  if (pathname.startsWith('/api/manifest')) return true
  if (pathname.startsWith('/api/admin/')) return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  const userId = request.headers.get('x-user-id')
  if (userId !== OWNER_SESSION_USER_ID) {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas o usuario autorizado pode usar esta API.' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
