import type { PrismaClient } from '@prisma/client'

/**
 * Este projeto originalmente consolidava dados multi-owner para um único usuário.
 * Com a remoção do módulo legado de funcionários/obras, mantemos a API pública
 * para não quebrar scripts/admin endpoints, mas ela vira um no-op.
 */
export async function consolidateDataToSingleOwner(_prisma: PrismaClient): Promise<void> {
  return
}

