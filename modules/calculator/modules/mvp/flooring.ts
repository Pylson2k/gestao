import { CATALOG, getPerda } from '../../catalog/technical-catalog'
import {
  aplicarPerda,
  arredondarEmbalagem,
  arredondarParaCima,
  calcularArea,
  calcularPecas,
} from '../../engine/core'
import type { CalculationResult, ConstructionStandard } from '../../engine/types'

export interface FlooringInput {
  largura: number
  comprimento: number
  pecaLargura: number
  pecaComprimento: number
  pecasPorCaixa?: number
  standard: ConstructionStandard
}

export function calcularPiso(input: FlooringInput): CalculationResult {
  const areaAmbiente = calcularArea(input.largura, input.comprimento)
  const areaPeca = calcularArea(input.pecaLargura, input.pecaComprimento)
  const pecas = aplicarPerda(calcularPecas(areaAmbiente, areaPeca), getPerda('piso', input.standard))
  const pecasArredondadas = arredondarParaCima(pecas)
  const caixas = arredondarEmbalagem(
    pecasArredondadas / (input.pecasPorCaixa ?? CATALOG.piso.pecasPorCaixaPadrao),
    1
  )
  const argamassaKg = aplicarPerda(
    areaAmbiente * CATALOG.piso.argamassaKgPorM2,
    getPerda('piso', input.standard)
  )
  const rejunteKg = aplicarPerda(
    areaAmbiente * CATALOG.piso.rejunteKgPorM2,
    getPerda('piso', input.standard)
  )
  return {
    module: 'piso',
    summary: {
      areaAmbiente,
      areaPeca,
      pecasArredondadas,
      caixas,
      argamassaKg: Number(argamassaKg.toFixed(2)),
      rejunteKg: Number(rejunteKg.toFixed(2)),
    },
    materials: [
      { code: 'PISO-PECA', description: 'Peça de piso/revestimento', unit: 'un', quantity: pecasArredondadas },
      { code: 'PISO-CAIXA', description: 'Caixa de piso', unit: 'cx', quantity: caixas },
      { code: 'ARGAMASSA', description: 'Argamassa colante', unit: 'kg', quantity: Number(argamassaKg.toFixed(2)) },
      { code: 'REJUNTE', description: 'Rejunte', unit: 'kg', quantity: Number(rejunteKg.toFixed(2)) },
    ],
  }
}

