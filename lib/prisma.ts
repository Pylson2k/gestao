import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { ensureSanitizedDatabaseUrl, isPostgresUrl } from '@/lib/database-url'

if (typeof window === 'undefined') {
  try {
    require('dotenv').config()
  } catch {
    // dotenv pode não estar disponível em produção
  }
}

ensureSanitizedDatabaseUrl()

const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl && typeof window === 'undefined') {
  console.warn('DATABASE_URL nao encontrada.')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient(): PrismaClient {
  const url = ensureSanitizedDatabaseUrl()
  if (!url) {
    throw new Error('DATABASE_URL_MISSING')
  }
  if (!isPostgresUrl(url)) {
    throw new Error(
      'DATABASE_URL_INVALID: deve comecar com postgresql:// (sem aspas). Copie a URI no botao Connect do Neon.'
    )
  }

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX) || 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 15000,
      ssl: url.includes('sslmode=require') || url.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
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
