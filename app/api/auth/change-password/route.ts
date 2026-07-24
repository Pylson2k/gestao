import { NextRequest } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { getDbUserId } from '@/lib/user-mapping'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { apiError, apiOk } from '@/lib/api-response'
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/session'
import { requireOwnerOr401 } from '@/lib/require-auth'

export async function POST(request: NextRequest) {
  try {
    const denied = requireOwnerOr401(request)
    if (denied) return denied

    const userId = request.headers.get('x-user-id') || OWNER_SESSION_USER_ID

    if (!process.env.DATABASE_URL) {
      return apiError('Banco nao configurado', 503)
    }

    const body = await request.json()
    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return apiError('Preencha os campos', 400)
    }

    if (newPassword.length < 8) {
      return apiError('A nova senha deve ter pelo menos 8 caracteres', 400)
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

    const response = apiOk({ success: true })
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ mustChangePassword: false }),
      sessionCookieOptions()
    )
    return response
  } catch (e) {
    console.error('change-password:', e)
    return apiError('Erro ao alterar senha', 500)
  }
}
