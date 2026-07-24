import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from '@/lib/owner-user'

export const SESSION_COOKIE_NAME = 'sinai_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type SessionPayload = {
  sub: typeof OWNER_SESSION_USER_ID
  username: typeof OWNER_USERNAME
  exp: number
  mustChangePassword: boolean
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_OPERATIONS_SECRET
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET (ou ADMIN_OPERATIONS_SECRET) deve ter pelo menos 16 caracteres')
  }
  return 'dev-only-insecure-session-secret'
}

export function createSessionToken(input: {
  mustChangePassword: boolean
}): string {
  const payload: SessionPayload = {
    sub: OWNER_SESSION_USER_ID,
    username: OWNER_USERNAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    mustChangePassword: Boolean(input.mustChangePassword),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  if (!body || !sig) return null

  const expected = createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (payload.sub !== OWNER_SESSION_USER_ID) return null
    if (payload.username !== OWNER_USERNAME) return null
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return {
      sub: OWNER_SESSION_USER_ID,
      username: OWNER_USERNAME,
      exp: payload.exp,
      mustChangePassword: Boolean(payload.mustChangePassword),
    }
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function generateTemporaryPassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    // Still compare to reduce timing leak on length
    timingSafeEqual(aBuf, aBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}
