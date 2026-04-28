import { comporOrcamentoCompleto } from '../modules/advanced/management'
import type { BudgetResult, MaterialLine } from '../engine/types'

const DEFAULT_PRICE_TABLE: Record<string, number> = {
  'TINTA-18L': 430,
  SELADOR: 22,
  'PISO-PECA': 18,
  'PISO-CAIXA': 150,
  ARGAMASSA: 1.8,
  REJUNTE: 9,
  'CONCRETO-CIMENTO': 0.92,
  'CONCRETO-AREIA': 175,
  'CONCRETO-BRITA': 210,
  'CONCRETO-ACO': 7.6,
}

export function calcularOrcamento(
  materials: MaterialLine[],
  opts?: { indirectPercent?: number; profitMarginPercent?: number; customPriceTable?: Record<string, number> }
): BudgetResult {
  return comporOrcamentoCompleto(
    materials,
    { ...DEFAULT_PRICE_TABLE, ...(opts?.customPriceTable ?? {}) },
    opts?.indirectPercent ?? 0.12,
    opts?.profitMarginPercent ?? 0.2
  )
}

