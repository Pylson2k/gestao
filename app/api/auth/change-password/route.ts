import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { getDbUserId } from '@/lib/user-mapping'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { apiError, apiOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (userId !== OWNER_SESSION_USER_ID) {
      return apiError('Nao autorizado', 403)
    }

    if (!process.env.DATABASE_URL) {
      return apiError('Banco nao configurado', 503)
    }

    const body = await request.json()
    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return apiError('Preencha os campos', 400)
    }

    if (newPassword.length < 6) {
      return apiError('A nova senha deve ter pelo menos 6 caracteres', 400)
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)
    const user = await prisma.user.findUnique({ where: { id: dbUserId } })
    if (!user) {
      return apiError('Usuario nao encontrado', 404)
    }

    const ok = await compare(currentPassword, user.password)
    if (!ok) {
      return apiError('Senha atual incorreta', 400)
    }

    const hashed = await hash(newPassword, 10)
    await prisma.user.update({
      where: { id: dbUserId },
      data: { password: hashed, mustChangePassword: false },
    })

    return apiOk({ success: true })
  } catch (e) {
    console.error('change-password:', e)
    return apiError('Erro ao alterar senha', 500)
  }
}
