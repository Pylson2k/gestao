import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session'

function isPublicApi(pathname: string): boolean {
  if (pathname === '/api/auth/login') return true
  if (pathname === '/api/auth/logout') return true
  if (pathname.startsWith('/api/company/logo')) return true
  if (pathname.startsWith('/api/company/favicon')) return true
  if (pathname.startsWith('/api/company/pwa-icon')) return true
  if (pathname.startsWith('/api/manifest')) return true
  if (pathname === '/api/health') return true
  // Admin usa segredo próprio no body/header — não exige sessão do dono
  if (pathname.startsWith('/api/admin/')) return true
  // Portal trabalhador (ainda stub 501) — auth própria futura
  if (pathname.startsWith('/api/worker')) return true
  return false
}

function isPublicPage(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login' || pathname === '/reset') return true
  if (pathname.startsWith('/trabalhador')) return true
  return false
}

/**
 * Gate de rede (Next.js 16 proxy):
 * - APIs protegidas exigem cookie de sessão válido
 * - Nunca confia em x-user-id do cliente; injeta id do dono só após verificar a sessão
 * - Páginas do app: redirect otimista se não houver cookie (validação completa nas APIs)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'OPTIONS') {
    return NextResponse.next()
  }

  // Strip client-supplied identity headers always
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-auth-verified')

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = verifySessionToken(token)

  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    if (session.mustChangePassword) {
      const allowedWhileForced =
        pathname === '/api/auth/change-password' ||
        pathname === '/api/auth/me' ||
        pathname === '/api/auth/logout' ||
        pathname === '/api/auth/profile'
      if (!allowedWhileForced) {
        return NextResponse.json(
          { error: 'Altere a senha antes de continuar' },
          { status: 403 }
        )
      }
    }

    requestHeaders.set('x-user-id', OWNER_SESSION_USER_ID)
    requestHeaders.set('x-auth-verified', '1')
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Page routes: redirect unauthenticated users away from app shells
  if (!isPublicPage(pathname) && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    if (!session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Force password change except on perfil
    if (
      session.mustChangePassword &&
      pathname !== '/dashboard/perfil' &&
      !pathname.startsWith('/api/')
    ) {
      const perfilUrl = request.nextUrl.clone()
      perfilUrl.pathname = '/dashboard/perfil'
      perfilUrl.searchParams.set('force', '1')
      return NextResponse.redirect(perfilUrl)
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
