import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { normalizeWorkerUsername } from '@/lib/worker-auth'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const dbUserId = await getDbUserId(userId)
    const { prisma } = await import('@/lib/prisma')

    const accounts = await prisma.workerAccount.findMany({
      where: { ownerUserId: dbUserId },
      select: {
        id: true,
        employeeId: true,
        loginUsername: true,
        createdAt: true,
      },
    })

    return NextResponse.json(accounts)
  } catch (e) {
    console.error('worker-accounts GET:', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const dbUserId = await getDbUserId(userId)
    const body = await request.json()
    const employeeId = typeof body.employeeId === 'string' ? body.employeeId : ''
    const loginUsernameRaw = typeof body.loginUsername === 'string' ? body.loginUsername : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!employeeId || !loginUsernameRaw.trim() || password.length < 4) {
      return NextResponse.json(
        { error: 'employeeId, loginUsername e senha (min. 4 caracteres) sao obrigatorios' },
        { status: 400 }
      )
    }

    const norm = normalizeWorkerUsername(loginUsernameRaw)
    if (norm.length < 2) {
      return NextResponse.json({ error: 'Login muito curto' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, userId: { in: ownerIds } },
    })
    if (!emp) {
      return NextResponse.json({ error: 'Funcionario nao encontrado' }, { status: 404 })
    }

    const existing = await prisma.workerAccount.findUnique({ where: { employeeId } })
    if (existing) {
      return NextResponse.json({ error: 'Este funcionario ja possui conta de trabalhador' }, { status: 409 })
    }

    const taken = await prisma.workerAccount.findUnique({ where: { loginUsername: norm } })
    if (taken) {
      return NextResponse.json({ error: 'Este login ja esta em uso' }, { status: 409 })
    }

    const passwordHash = await hash(password, 10)
    const created = await prisma.workerAccount.create({
      data: {
        employeeId,
        loginUsername: norm,
        passwordHash,
        ownerUserId: dbUserId,
      },
      select: {
        id: true,
        employeeId: true,
        loginUsername: true,
        createdAt: true,
      },
    })

    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_worker_account',
      entityType: 'worker_account',
      entityId: created.id,
      description: `Criou conta trabalhador para ${emp.name} (login: ${created.loginUsername})`,
      ...meta,
    })

    return NextResponse.json(created)
  } catch (e) {
    console.error('worker-accounts POST:', e)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
