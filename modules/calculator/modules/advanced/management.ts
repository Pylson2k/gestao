import { CATALOG } from '../../catalog/technical-catalog'
import { aplicarPerda } from '../../engine/core'
import type { BudgetResult, CalculationResult, ConstructionStandard, MaterialLine } from '../../engine/types'

export function calcularDemolicao(area: number, espessuraMedia: number): CalculationResult {
  const volumeRemovido = area * espessuraMedia
  const cacambas = Math.ceil(volumeRemovido / 5)
  return {
    module: 'demolicao',
    summary: { volumeRemovido: Number(volumeRemovido.toFixed(2)), cacambas },
    materials: [{ code: 'DEM-CACAMBA', description: 'Caçamba de entulho', unit: 'un', quantity: cacambas }],
  }
}

export function calcularLimpezaObra(area: number): CalculationResult {
  const horas = area / 18
  return {
    module: 'limpeza_obra',
    summary: { area, horas: Number(horas.toFixed(1)) },
    materials: [{ code: 'LIMP-SERV', description: 'Serviço de limpeza pós-obra', unit: 'h', quantity: Number(horas.toFixed(1)) }],
  }
}

export function calcularInsumosIndiretos(area: number): CalculationResult {
  const parafusos = Math.ceil(area * 3)
  const pregosKg = Number((area * 0.08).toFixed(2))
  const episKit = Math.max(1, Math.ceil(area / 80))
  return {
    module: 'insumos_indiretos',
    summary: { parafusos, pregosKg, episKit },
    materials: [
      { code: 'IND-PARAF', description: 'Parafusos diversos', unit: 'un', quantity: parafusos },
      { code: 'IND-PREGO', description: 'Pregos', unit: 'kg', quantity: pregosKg },
      { code: 'IND-EPI', description: 'Kit EPIs', unit: 'kit', quantity: episKit },
    ],
  }
}

export function calcularMaoDeObra(area: number, standard: ConstructionStandard): CalculationResult {
  const custoM2 = CATALOG.maoDeObra.custoM2[standard]
  const produtividade = CATALOG.maoDeObra.produtividadeM2Dia[standard]
  const custo = area * custoM2
  const dias = area / produtividade
  const equipe = Math.max(2, Math.ceil(area / 120))
  return {
    module: 'mao_de_obra',
    summary: { custo: Number(custo.toFixed(2)), dias: Number(dias.toFixed(1)), equipe, custoM2 },
    materials: [{ code: 'MO-SERV', description: 'Mão de obra direta', unit: 'R$', quantity: Number(custo.toFixed(2)) }],
  }
}

export function calcularCronograma(diasPorFase: Record<string, number>): CalculationResult {
  const duracaoTotal = Object.values(diasPorFase).reduce((sum, d) => sum + d, 0)
  return {
    module: 'cronograma',
    summary: { duracaoTotal, ...diasPorFase },
    materials: [],
  }
}

export function comporOrcamentoCompleto(
  materials: MaterialLine[],
  priceByCode: Record<string, number>,
  indirectPercent = 0.12,
  profitMarginPercent = 0.2
): BudgetResult {
  const lines = materials.map((line) => {
    const unitCost = line.unitCost ?? priceByCode[line.code] ?? 0
    const totalCost = unitCost * line.quantity
    return { ...line, unitCost, totalCost }
  })
  const directCost = lines.reduce((sum, line) => sum + line.totalCost, 0)
  const indirectCost = directCost * indirectPercent
  const subtotal = directCost + indirectCost
  const profitValue = subtotal * profitMarginPercent
  const totalPrice = subtotal + profitValue
  return {
    lines,
    directCost: Number(directCost.toFixed(2)),
    indirectCost: Number(indirectCost.toFixed(2)),
    profitMarginPercent,
    profitValue: Number(profitValue.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
  }
}

export function aplicarNivelMaterial(qtdBase: number, standard: ConstructionStandard): number {
  const factor = standard === 'economico' ? 0.95 : standard === 'reforcado' ? 1.12 : 1
  return aplicarPerda(qtdBase * factor, 0.05)
}

