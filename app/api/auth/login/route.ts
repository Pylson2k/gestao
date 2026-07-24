import { NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from '@/lib/owner-user'
import { logger } from '@/lib/logger'
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/session'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'
import { ensureSanitizedDatabaseUrl, isPostgresUrl } from '@/lib/database-url'

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

    const databaseUrl = ensureSanitizedDatabaseUrl()
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados nao configurado (DATABASE_URL).' },
        { status: 503 }
      )
    }
    if (!isPostgresUrl(databaseUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'DATABASE_URL invalida. Cole a URI do Neon comecando com postgresql:// (sem aspas) e faca redeploy.',
        },
        { status: 503 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    let user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
    })

    // Bootstrap: se o banco nao tem nenhum usuario, cria o dono no primeiro login
    if (!user && username === OWNER_USERNAME && password.length >= 8) {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        const hashedPassword = await hash(password, 10)
        user = await prisma.user.create({
          data: {
            username: OWNER_USERNAME,
            name: 'Gustavo',
            email: 'gustavo@sinaiengenharia.com',
            password: hashedPassword,
            mustChangePassword: true,
          },
        })
        logger.info({
          scope: 'api.auth.login',
          message: 'Usuario dono criado no primeiro login (banco vazio)',
        })
      }
    }

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
            'Sessao nao configurada. Defina SESSION_SECRET na Vercel (min. 16 caracteres) e faca redeploy.',
        },
        { status: 503 }
      )
    }
    if (
      message.includes('DATABASE_URL_INVALID') ||
      message.includes('DATABASE_URL_MISSING') ||
      message.includes('P1013') ||
      message.includes('scheme is not recognized')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'DATABASE_URL invalida no servidor. Edite na Vercel: URI postgresql:// do Neon, sem aspas.',
        },
        { status: 503 }
      )
    }
    if (
      message.includes('P1001') ||
      message.includes('ECONNREFUSED') ||
      message.includes('timeout') ||
      message.includes('Connection terminated') ||
      message.includes('ENOTFOUND') ||
      message.includes('password authentication failed') ||
      message.includes('FATAL') ||
      message.includes('SSL') ||
      message.includes('P2021') ||
      message.includes('does not exist')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Falha de banco: ' +
            message.slice(0, 180) +
            ' — confira DATABASE_URL no Vercel (Neon Connect) e use /reset depois.',
        },
        { status: 503 }
      )
    }
    // Nunca esconder o erro real — precisa aparecer na tela de login
    return NextResponse.json(
      {
        success: false,
        error: `Erro no servidor: ${message.slice(0, 220)}`,
      },
      { status: 500 }
    )
  }
}
