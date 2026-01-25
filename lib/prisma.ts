import { PrismaClient } from '@prisma/client'

// Garantir que o .env seja carregado
if (typeof window === 'undefined') {
  // Apenas no servidor
  try {
    require('dotenv').config()
  } catch {
    // dotenv pode não estar disponível em produção
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
