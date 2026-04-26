import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { apiError, apiOk } from '@/lib/api-response'

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (userId !== OWNER_SESSION_USER_ID) {
      return apiError('Nao autorizado', 403)
    }

    if (!process.env.DATABASE_URL) {
      return apiError('Banco nao configurado', 503)
    }

    const body = await request.json()
    const email = String(body.email ?? '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return apiError('Email invalido', 400)
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const updated = await prisma.user.update({
      where: { id: dbUserId },
      data: { email },
      select: { email: true },
    })

    return apiOk({ success: true, email: updated.email })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      return apiError('Este email ja esta em uso', 400)
    }
    console.error('profile PATCH:', e)
    return apiError('Erro ao atualizar email', 500)
  }
}
