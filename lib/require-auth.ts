import { NextRequest, NextResponse } from 'next/server'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from '@/lib/session'
import { apiError } from '@/lib/api-response'

/**
 * Autenticação confiável: cookie HttpOnly assinado.
 * O header x-user-id só é aceito se o proxy o injetou após validar a sessão
 * (valor forçado para o dono). Nunca use x-user-id sozinho como prova de login.
 */
export function getSessionFromRequest(request: NextRequest | Request): SessionPayload | null {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`))
  const token = match?.[1] ? decodeURIComponent(match[1]) : null
  return verifySessionToken(token)
}

export function requireOwnerSession(request: NextRequest | Request): SessionPayload | NextResponse {
  const session = getSessionFromRequest(request)
  if (!session) {
    return apiError('Nao autorizado', 401)
  }
  return session
}

export function isOwnerAuthorized(request: NextRequest | Request): boolean {
  if (getSessionFromRequest(request)) return true
  // Compat: após proxy validar cookie, injeta x-user-id confiável
  const trusted = request.headers.get('x-auth-verified')
  const userId = request.headers.get('x-user-id')
  return trusted === '1' && userId === OWNER_SESSION_USER_ID
}

export function requireOwnerOr401(request: NextRequest | Request): NextResponse | null {
  if (isOwnerAuthorized(request)) return null
  return apiError('Nao autorizado', 401)
}
