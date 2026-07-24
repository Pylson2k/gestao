import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import {
  generateTemporaryPassword,
  timingSafeStringEqual,
} from '@/lib/session'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'
import { OWNER_USERNAME } from '@/lib/owner-user'
import {
  ensureSanitizedDatabaseUrl,
  isPostgresUrl,
} from '@/lib/database-url'

function cuidLike() {
  return `c${randomBytes(12).toString('hex')}`
}

async function ensureUsersTable(prisma: {
  $executeRawUnsafe: (query: string) => Promise<unknown>
}) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "phone" TEXT,
      "company" TEXT,
      "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`
  )
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`
  )
}

function classifyDbError(message: string): string {
  if (
    message.includes('DATABASE_URL_INVALID') ||
    message.includes('DATABASE_URL_MISSING') ||
    message.includes('P1013') ||
    message.includes('scheme is not recognized')
  ) {
    return 'DATABASE_URL invalida. No Vercel, edite DATABASE_URL e cole a URI do Neon comecando com postgresql:// (sem aspas). Depois faca Redeploy.'
  }
  if (
    message.includes('P1001') ||
    message.includes('ECONNREFUSED') ||
    message.includes('timeout') ||
    message.includes('Connection terminated') ||
    message.includes('ENOTFOUND')
  ) {
    return 'Nao foi possivel conectar ao Neon. Confira se a DATABASE_URL esta correta e se o projeto Neon esta ativo.'
  }
  if (message.includes('P2021') || message.includes('does not exist')) {
    return 'Tabela de usuarios nao existe no banco. O reset tenta criar automaticamente — tente de novo apos Redeploy com DATABASE_URL valida.'
  }
  return `Falha ao resetar: ${message.slice(0, 240)}`
}

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request)
    const limited = rateLimit(`admin-reset:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 })
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Muitas tentativas. Aguarde ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      body = {}
    }

    const provided =
      request.headers.get('x-admin-secret') ||
      (typeof body.secret === 'string' ? body.secret : null) ||
      new URL(request.url).searchParams.get('key')

    const expected = process.env.ADMIN_OPERATIONS_SECRET
    if (!expected) {
      return NextResponse.json(
        {
          error:
            'ADMIN_OPERATIONS_SECRET nao configurado na Vercel. Crie essa variavel (texto longo) e faca Redeploy.',
        },
        { status: 503 }
      )
    }
    if (!provided || !timingSafeStringEqual(provided.trim(), expected)) {
      return NextResponse.json(
        {
          error:
            'Acesso negado. A chave digitada nao confere com ADMIN_OPERATIONS_SECRET da Vercel.',
        },
        { status: 401 }
      )
    }

    const databaseUrl = ensureSanitizedDatabaseUrl()
    if (!databaseUrl) {
      return NextResponse.json(
        {
          error:
            'DATABASE_URL nao configurada na Vercel. Cole a connection string do Neon e faca Redeploy.',
        },
        { status: 503 }
      )
    }
    if (!isPostgresUrl(databaseUrl)) {
      return NextResponse.json(
        {
          error:
            'DATABASE_URL invalida. Deve comecar com postgresql:// e sem aspas. Copie no botao Connect do Neon.',
        },
        { status: 503 }
      )
    }

    const wantKnownPassword = body.useDefaultPassword === true
    const temporaryPassword = wantKnownPassword
      ? 'gustavo123'
      : generateTemporaryPassword(16)
    const hashedPassword = await hash(temporaryPassword, 10)

    const { prisma } = await import('@/lib/prisma')

    try {
      await ensureUsersTable(prisma)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: classifyDbError(msg) }, { status: 503 })
    }

    const now = new Date()
    const existing = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
    })

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          mustChangePassword: true,
        },
      })
    } else {
      await prisma.user.create({
        data: {
          id: cuidLike(),
          username: OWNER_USERNAME,
          name: 'Gustavo',
          email: 'gustavo@sinaiengenharia.com',
          password: hashedPassword,
          mustChangePassword: true,
          createdAt: now,
          updatedAt: now,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: wantKnownPassword
        ? 'Senha redefinida para gustavo123. Troque no primeiro login.'
        : 'Senha redefinida. Guarde a senha temporaria abaixo e altere no primeiro login.',
      username: OWNER_USERNAME,
      temporaryPassword,
      mustChangePassword: true,
    })
  } catch (error: unknown) {
    console.error('Reset error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: classifyDbError(message) }, { status: 500 })
  }
}
