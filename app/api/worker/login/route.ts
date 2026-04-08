import { NextResponse } from 'next/server'
import {
  createSessionToken,
  normalizeWorkerUsername,
  verifyWorkerPassword,
  WORKER_SESSION_DAYS,
} from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const loginUsername = typeof body.loginUsername === 'string' ? body.loginUsername : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!loginUsername.trim() || !password) {
      return NextResponse.json({ error: 'Usuario e senha sao obrigatorios' }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const { prisma } = await import('@/lib/prisma')
    const norm = normalizeWorkerUsername(loginUsername)
    const account = await prisma.workerAccount.findUnique({
      where: { loginUsername: norm },
      include: { employee: true },
    })

    if (!account) {
      return NextResponse.json({ error: 'Usuario ou senha invalidos' }, { status: 401 })
    }

    if (!account.employee.isActive) {
      return NextResponse.json({ error: 'Cadastro inativo. Fale com o gestor.' }, { status: 403 })
    }

    const ok = await verifyWorkerPassword(password, account.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Usuario ou senha invalidos' }, { status: 401 })
    }

    const token = createSessionToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + WORKER_SESSION_DAYS)

    await prisma.workerSession.create({
      data: {
        token,
        accountId: account.id,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      token,
      employeeName: account.employee.name,
      loginUsername: account.loginUsername,
    })
  } catch (e) {
    console.error('worker login:', e)
    return NextResponse.json({ error: 'Erro ao entrar' }, { status: 500 })
  }
}
