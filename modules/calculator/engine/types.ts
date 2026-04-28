export type ConstructionStandard = 'economico' | 'padrao' | 'reforcado'

export interface MaterialLine {
  code: string
  description: string
  unit: string
  quantity: number
  unitCost?: number
}

export interface CalculationResult {
  module: string
  summary: Record<string, number | string>
  materials: MaterialLine[]
  alerts?: string[]
}

export interface BudgetLine extends MaterialLine {
  totalCost: number
}

export interface BudgetResult {
  lines: BudgetLine[]
  directCost: number
  indirectCost: number
  profitMarginPercent: number
  profitValue: number
  totalPrice: number
}

