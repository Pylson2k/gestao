import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { normalizeWorkerUsername } from '@/lib/worker-auth'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ employeeId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    const { employeeId } = await ctx.params
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const dbUserId = await getDbUserId(userId)
    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''
    const loginUsernameRaw =
      typeof body.loginUsername === 'string' ? body.loginUsername.trim() : undefined

    if (password && password.length < 4) {
      return NextResponse.json({ error: 'Senha deve ter ao menos 4 caracteres' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, userId: { in: ownerIds } },
    })
    if (!emp) {
      return NextResponse.json({ error: 'Funcionario nao encontrado' }, { status: 404 })
    }

    const account = await prisma.workerAccount.findFirst({
      where: { employeeId, ownerUserId: dbUserId },
    })
    if (!account) {
      return NextResponse.json({ error: 'Conta trabalhador nao existe' }, { status: 404 })
    }

    const data: { passwordHash?: string; loginUsername?: string } = {}
    if (password) {
      data.passwordHash = await hash(password, 10)
    }
    if (loginUsernameRaw) {
      const norm = normalizeWorkerUsername(loginUsernameRaw)
      if (norm.length < 2) {
        return NextResponse.json({ error: 'Login muito curto' }, { status: 400 })
      }
      const taken = await prisma.workerAccount.findFirst({
        where: { loginUsername: norm, NOT: { id: account.id } },
      })
      if (taken) {
        return NextResponse.json({ error: 'Este login ja esta em uso' }, { status: 409 })
      }
      data.loginUsername = norm
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Informe nova senha ou novo login' }, { status: 400 })
    }

    const updated = await prisma.workerAccount.update({
      where: { id: account.id },
      data,
      select: { id: true, employeeId: true, loginUsername: true, updatedAt: true },
    })

    await prisma.workerSession.deleteMany({ where: { accountId: account.id } })

    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'update_worker_account',
      entityType: 'worker_account',
      entityId: account.id,
      description: `Atualizou conta trabalhador de ${emp.name}`,
      ...meta,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('worker-accounts PATCH:', e)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}
