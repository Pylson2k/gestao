import { CATALOG, getPerda } from '../../catalog/technical-catalog'
import { aplicarPerda, calcularVolume } from '../../engine/core'
import type { CalculationResult, ConstructionStandard } from '../../engine/types'

export interface ConcreteInput {
  largura: number
  comprimento: number
  altura: number
  standard: ConstructionStandard
  traco?: [number, number, number]
}

export function calcularConcreto(input: ConcreteInput): CalculationResult {
  const volumeBase = calcularVolume(input.largura, input.comprimento, input.altura)
  const volume = aplicarPerda(volumeBase, getPerda('concreto', input.standard))
  const traco = input.traco ?? [1, 2, 3]
  const fator = traco[0] + traco[1] + traco[2]
  const cimentoKg = volume * CATALOG.concreto.cimentoKgPorM3 * (traco[0] / fator) * 6
  const areiaM3 = volume * CATALOG.concreto.areiaM3PorM3 * (traco[1] / fator) * 2
  const britaM3 = volume * CATALOG.concreto.britaM3PorM3 * (traco[2] / fator) * 1.4
  const acoKg = volume * CATALOG.concreto.acoKgPorM3
  return {
    module: 'concreto',
    summary: {
      volume: Number(volume.toFixed(3)),
      traco: `${traco[0]}:${traco[1]}:${traco[2]}`,
      cimentoKg: Number(cimentoKg.toFixed(2)),
      areiaM3: Number(areiaM3.toFixed(3)),
      britaM3: Number(britaM3.toFixed(3)),
      acoKg: Number(acoKg.toFixed(2)),
    },
    materials: [
      { code: 'CONCRETO-CIMENTO', description: 'Cimento', unit: 'kg', quantity: Number(cimentoKg.toFixed(2)) },
      { code: 'CONCRETO-AREIA', description: 'Areia média', unit: 'm3', quantity: Number(areiaM3.toFixed(3)) },
      { code: 'CONCRETO-BRITA', description: 'Brita 1', unit: 'm3', quantity: Number(britaM3.toFixed(3)) },
      { code: 'CONCRETO-ACO', description: 'Aço CA50 (estimado)', unit: 'kg', quantity: Number(acoKg.toFixed(2)) },
    ],
  }
}

