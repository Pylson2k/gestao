import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import {
  generateTemporaryPassword,
  timingSafeStringEqual,
} from '@/lib/session'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'
import { OWNER_USERNAME } from '@/lib/owner-user'

function readAdminSecret(request: Request): string | null {
  const header = request.headers.get('x-admin-secret')
  if (header) return header
  // Compat legado: query ?key= (desencorajado)
  try {
    const { searchParams } = new URL(request.url)
    return searchParams.get('key')
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request)
    const limited = rateLimit(`admin-reset:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Muitas tentativas. Aguarde ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const expected = process.env.ADMIN_OPERATIONS_SECRET
    const provided = readAdminSecret(request)
    if (!expected || !provided || !timingSafeStringEqual(provided, expected)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            'DATABASE_URL não configurada. Configure a variável com a URL do PostgreSQL.',
        },
        { status: 500 }
      )
    }

    const temporaryPassword = generateTemporaryPassword(16)
    const hashedPassword = await hash(temporaryPassword, 10)

    const { prisma } = await import('@/lib/prisma')

    await prisma.user.upsert({
      where: { username: OWNER_USERNAME },
      update: {
        password: hashedPassword,
        mustChangePassword: true,
      },
      create: {
        username: OWNER_USERNAME,
        name: 'Gustavo',
        email: 'gustavo@sinaiengenharia.com',
        password: hashedPassword,
        mustChangePassword: true,
      },
    })

    // Senha temporária retornada UMA vez — nunca use senha fixa conhecida.
    return NextResponse.json({
      success: true,
      message:
        'Senha redefinida. Guarde a senha temporária e altere-a no primeiro login. Ela não será mostrada novamente.',
      username: OWNER_USERNAME,
      temporaryPassword,
      mustChangePassword: true,
    })
  } catch (error: unknown) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Erro ao resetar senhas' }, { status: 500 })
  }
}
