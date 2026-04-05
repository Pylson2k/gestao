import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { getDbUserId } from '@/lib/user-mapping'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (userId !== OWNER_SESSION_USER_ID) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const body = await request.json()
    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Preencha os campos' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)
    const user = await prisma.user.findUnique({ where: { id: dbUserId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    const ok = await compare(currentPassword, user.password)
    if (!ok) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    const hashed = await hash(newPassword, 10)
    await prisma.user.update({
      where: { id: dbUserId },
      data: { password: hashed, mustChangePassword: false },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('change-password:', e)
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 })
  }
}
