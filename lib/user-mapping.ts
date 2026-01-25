/**
 * Mapeia IDs de usuários da autenticação para IDs do banco de dados
 */

// Mapeamento: userId da autenticação -> username -> busca no banco
export const USER_MAPPING = {
  '1': 'gustavo',
  '2': 'giovanni',
} as const

/**
 * Busca o ID do banco de dados para um userId da autenticação
 */
export async function getDbUserId(authUserId: string): Promise<string> {
  if (!process.env.DATABASE_URL) {
    // Sem banco, retorna o próprio ID
    return authUserId
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const username = USER_MAPPING[authUserId as keyof typeof USER_MAPPING]
    
    if (!username) {
      console.warn(`No mapping found for userId: ${authUserId}`)
      return authUserId
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (!user) {
      console.error(`User not found in database for username: ${username}`)
      throw new Error(`Usuario ${username} nao encontrado no banco de dados`)
    }

    return user.id
  } catch (error: any) {
    console.error('Error mapping user ID:', error)
    // Se for erro de conexão, relançar
    if (error.message?.includes('nao encontrado')) {
      throw error
    }
    // Para outros erros, retornar o authUserId como fallback
    return authUserId
  }
}
