import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from '@/lib/owner-user'
import { logger } from '@/lib/logger'
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/session'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request)
    const limited = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: `Muitas tentativas. Aguarde ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const username = String(body.username ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')

    // Sempre percorre bcrypt quando possível para reduzir timing oracle
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados nao configurado' },
        { status: 503 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
    })

    const dummyHash =
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    const hashToCompare = user?.password ?? dummyHash
    const valid = await compare(password, hashToCompare)

    if (!user || username !== OWNER_USERNAME || !valid) {
      try {
        await createAuditLog({
          userId: OWNER_SESSION_USER_ID,
          action: 'failed_login',
          entityType: 'user',
          entityId: 'auth',
          description: `Falha de login para usuario: ${username || '(vazio)'}`,
          ...getRequestMetadata(request),
        })
      } catch {
        // ignore audit failures
      }
      return NextResponse.json(
        { success: false, error: 'Usuario ou senha invalidos' },
        { status: 401 }
      )
    }

    const token = createSessionToken({ mustChangePassword: user.mustChangePassword })
    const response = NextResponse.json({
      success: true,
      user: {
        id: OWNER_SESSION_USER_ID,
        username: user.username,
        name: user.name,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
      },
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions())

    try {
      await createAuditLog({
        userId: OWNER_SESSION_USER_ID,
        action: 'user_login',
        entityType: 'user',
        entityId: user.id,
        description: `Login bem-sucedido: ${user.username}`,
        ...getRequestMetadata(request),
      })
    } catch {
      // ignore
    }

    return response
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    logger.error({
      scope: 'api.auth.login',
      message: 'Login API error',
      error: message,
    })
    if (message.includes('SESSION_SECRET_MISSING')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Sessao nao configurada no servidor. Defina SESSION_SECRET na Vercel (min. 16 caracteres) e faca redeploy.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao entrar. Tente novamente.' },
      { status: 500 }
    )
  }
}
