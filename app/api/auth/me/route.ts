import { NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/require-auth'
import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from '@/lib/owner-user'
import { apiError } from '@/lib/api-response'

export async function GET(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return apiError('Nao autorizado', 401)
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      id: OWNER_SESSION_USER_ID,
      username: OWNER_USERNAME,
      name: 'Gustavo',
      email: '',
      mustChangePassword: session.mustChangePassword,
    })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
      select: {
        username: true,
        name: true,
        email: true,
        mustChangePassword: true,
      },
    })

    if (!user) {
      return apiError('Usuario nao encontrado', 404)
    }

    return NextResponse.json({
      id: OWNER_SESSION_USER_ID,
      username: user.username,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    })
  } catch {
    return apiError('Erro ao carregar sessao', 500)
  }
}
