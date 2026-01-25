import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Garantir que o .env seja carregado ANTES de criar o Prisma Client
if (typeof window === 'undefined') {
  // Apenas no servidor
  try {
    require('dotenv').config()
  } catch {
    // dotenv pode não estar disponível em produção
  }
}

// Verificar se DATABASE_URL está disponível
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && typeof window === 'undefined') {
  console.warn('⚠️ DATABASE_URL não encontrada. O Prisma Client pode não funcionar corretamente.')
  console.warn('   Certifique-se de que o arquivo .env existe e contém DATABASE_URL')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// No Prisma 7, é necessário fornecer um adapter ou accelerateUrl
// Como estamos usando PostgreSQL diretamente, usamos o adapter pg
function createPrismaClient() {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não está configurada. Verifique o arquivo .env'
    )
  }

  // Reutilizar pool se já existir (importante para Next.js hot reload)
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
  }

  // Criar adapter do Prisma para PostgreSQL
  const adapter = new PrismaPg(pool)

  // Criar Prisma Client com o adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
