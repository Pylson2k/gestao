import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (userId !== OWNER_SESSION_USER_ID) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const body = await request.json()
    const email = String(body.email ?? '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const updated = await prisma.user.update({
      where: { id: dbUserId },
      data: { email },
      select: { email: true },
    })

    return NextResponse.json({ success: true, email: updated.email })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Este email ja esta em uso' }, { status: 400 })
    }
    console.error('profile PATCH:', e)
    return NextResponse.json({ error: 'Erro ao atualizar email' }, { status: 500 })
  }
}
