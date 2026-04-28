import { CATALOG, getPerda } from '../../catalog/technical-catalog'
import { aplicarPerda, arredondarParaCima, calcularArea, calcularConsumo } from '../../engine/core'
import type { CalculationResult, ConstructionStandard } from '../../engine/types'

export interface PaintingInput {
  largura: number
  altura: number
  quantidadeParedes: number
  demaos: number
  standard: ConstructionStandard
  usarSelador?: boolean
}

export function calcularPintura(input: PaintingInput): CalculationResult {
  const areaParede = calcularArea(input.largura, input.altura)
  const areaTotal = areaParede * input.quantidadeParedes
  const areaComDemaos = areaTotal * input.demaos
  const tintaLitrosBase = calcularConsumo(areaComDemaos, CATALOG.pintura.rendimentoTintaM2Demao)
  const tintaLitros = aplicarPerda(tintaLitrosBase, getPerda('pintura', input.standard))
  const latas = arredondarParaCima(tintaLitros / CATALOG.pintura.lataLitros)
  const materiais = [
    { code: 'TINTA-18L', description: 'Tinta acrílica 18L', unit: 'lata', quantity: latas },
  ]
  if (input.usarSelador) {
    const seladorLitros = aplicarPerda(
      calcularConsumo(areaTotal, CATALOG.pintura.rendimentoSeladorM2),
      getPerda('pintura', input.standard)
    )
    materiais.push({
      code: 'SELADOR',
      description: 'Selador para parede',
      unit: 'L',
      quantity: Number(seladorLitros.toFixed(2)),
    })
  }
  return {
    module: 'pintura',
    summary: {
      areaTotal,
      areaComDemaos,
      tintaLitros: Number(tintaLitros.toFixed(2)),
      latas,
    },
    materials: materiais,
  }
}

