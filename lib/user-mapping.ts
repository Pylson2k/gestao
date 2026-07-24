/**
 * Mapeia o id de sessão do cliente para o usuário no banco (único proprietário).
 */

import { OWNER_SESSION_USER_ID, OWNER_USERNAME } from './owner-user'

export const USER_MAPPING = {
  [OWNER_SESSION_USER_ID]: OWNER_USERNAME,
} as const

/**
 * Retorna o id no banco do único usuário autorizado (para filtros de dados).
 */
export async function getOwnerDbUserIds(): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return [OWNER_SESSION_USER_ID]
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
      select: { id: true },
    })
    return user ? [user.id] : []
  } catch (error: unknown) {
    console.error('Error getting owner user id:', error)
    return []
  }
}

/**
 * Converte o id da sessão (sempre "1") para o id real no PostgreSQL.
 */
export async function getDbUserId(authUserId: string): Promise<string> {
  if (!process.env.DATABASE_URL) {
    return authUserId
  }

  if (authUserId !== OWNER_SESSION_USER_ID) {
    throw new Error('UNAUTHORIZED_USER')
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { username: OWNER_USERNAME },
      select: { id: true },
    })

    if (!user) {
      throw new Error(`Usuario ${OWNER_USERNAME} nao encontrado no banco de dados`)
    }

    return user.id
  } catch (error: unknown) {
    const err = error as Error
    if (err.message?.includes('nao encontrado') || err.message === 'UNAUTHORIZED_USER') {
      throw err
    }
    console.error('Error mapping user ID:', error)
    throw new Error('Falha ao mapear usuario autenticado')
  }
}
