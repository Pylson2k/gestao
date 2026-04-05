import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Garantir que o .env seja carregado ANTES de criar o Prisma Client
if (typeof window === 'undefined') {
  try {
    require('dotenv').config()
  } catch {
    // dotenv pode não estar disponível em produção
  }
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && typeof window === 'undefined') {
  console.warn('⚠️ DATABASE_URL não encontrada. O Prisma Client pode não funcionar corretamente.')
  console.warn('   Certifique-se de que o arquivo .env existe e contém DATABASE_URL')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient(): PrismaClient {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está configurada. Verifique o arquivo .env')
  }

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  const adapter = new PrismaPg(globalForPrisma.pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Proxy com inicialização preguiçosa: o módulo pode ser importado sem DATABASE_URL;
 * o erro só ocorre na primeira operação real no banco.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})
