import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session'
import { getSessionFromRequest } from '@/lib/require-auth'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

export async function POST(request: Request) {
  const session = getSessionFromRequest(request)
  if (session) {
    try {
      await createAuditLog({
        userId: OWNER_SESSION_USER_ID,
        action: 'user_logout',
        entityType: 'user',
        entityId: 'auth',
        description: `Logout: ${session.username}`,
        ...getRequestMetadata(request),
      })
    } catch {
      // ignore
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(0),
    maxAge: 0,
  })
  return response
}
