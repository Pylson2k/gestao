import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

function isPublicApi(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/login')) return true
  if (pathname.startsWith('/api/audit/login')) return true
  if (pathname.startsWith('/api/audit/logout')) return true
  if (pathname.startsWith('/api/company/logo')) return true
  if (pathname.startsWith('/api/company/favicon')) return true
  if (pathname.startsWith('/api/company/pwa-icon')) return true
  if (pathname.startsWith('/api/manifest')) return true
  if (pathname.startsWith('/api/admin/')) return true
  if (pathname === '/api/health') return true
  return false
}

function isWorkerApi(pathname: string): boolean {
  return pathname.startsWith('/api/worker/')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  if (request.method === 'OPTIONS' || isPublicApi(pathname) || isWorkerApi(pathname)) {
    return NextResponse.next()
  }

  const userId = request.headers.get('x-user-id')
  if (userId && userId !== OWNER_SESSION_USER_ID) {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas o usuario autorizado pode usar esta API.' },
      { status: 403 }
    )
  }

  if (!userId) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', OWNER_SESSION_USER_ID)
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

