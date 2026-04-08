import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

function isPublicApi(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/login')) return true
  if (pathname.startsWith('/api/audit/login')) return true
  if (pathname.startsWith('/api/audit/logout')) return true
  if (pathname.startsWith('/api/company/logo')) return true
  // Navegador/PWA pedem favicon e ícones sem headers customizados — não podem passar por auth
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  // Preflight CORS (raro neste app same-origin, mas evita 403 em ferramentas/proxies)
  if (request.method === 'OPTIONS') {
    return NextResponse.next()
  }
  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  // Trabalhador: auth por token dentro de cada rota (não usa x-user-id do gestor).
  if (isWorkerApi(pathname)) {
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
