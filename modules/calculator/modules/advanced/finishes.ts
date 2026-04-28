import { aplicarPerda, calcularArea } from '../../engine/core'
import type { CalculationResult } from '../../engine/types'

export function calcularImpermeabilizacao(areaMolhada: number, tipo: 'manta' | 'liquida'): CalculationResult {
  const consumo = aplicarPerda(areaMolhada * (tipo === 'manta' ? 1 : 1.2), 0.1)
  return {
    module: 'impermeabilizacao',
    summary: { areaMolhada, consumo: Number(consumo.toFixed(2)), tipo },
    materials: [{ code: 'IMPERM', description: `Impermeabilização ${tipo}`, unit: 'm2', quantity: Number(consumo.toFixed(2)) }],
  }
}

export function calcularRevestimentosCompletos(areaPiso: number, areaParede: number): CalculationResult {
  const pisoM2 = aplicarPerda(areaPiso, 0.1)
  const paredeM2 = aplicarPerda(areaParede, 0.12)
  const argamassaKg = (pisoM2 + paredeM2) * 5.2
  const rejunteKg = (pisoM2 + paredeM2) * 0.35
  return {
    module: 'revestimentos',
    summary: { pisoM2: Number(pisoM2.toFixed(2)), paredeM2: Number(paredeM2.toFixed(2)) },
    materials: [
      { code: 'REV-PISO', description: 'Revestimento de piso', unit: 'm2', quantity: Number(pisoM2.toFixed(2)) },
      { code: 'REV-PAREDE', description: 'Revestimento de parede', unit: 'm2', quantity: Number(paredeM2.toFixed(2)) },
      { code: 'REV-ARG', description: 'Argamassa colante', unit: 'kg', quantity: Number(argamassaKg.toFixed(2)) },
      { code: 'REV-REJ', description: 'Rejunte', unit: 'kg', quantity: Number(rejunteKg.toFixed(2)) },
    ],
  }
}

export function calcularForro(area: number, tipo: 'drywall' | 'pvc' | 'madeira'): CalculationResult {
  const fator = tipo === 'drywall' ? 1.08 : tipo === 'pvc' ? 1.06 : 1.12
  const areaForro = aplicarPerda(area, fator - 1)
  const estruturaML = area * 2.6
  return {
    module: 'forro',
    summary: { tipo, areaForro: Number(areaForro.toFixed(2)), estruturaML: Number(estruturaML.toFixed(2)) },
    materials: [
      { code: 'FORRO-PLACA', description: `Forro ${tipo}`, unit: 'm2', quantity: Number(areaForro.toFixed(2)) },
      { code: 'FORRO-EST', description: 'Estrutura de sustentação', unit: 'm', quantity: Number(estruturaML.toFixed(2)) },
    ],
  }
}

export function calcularFachada(areaExterna: number, acabamento: 'textura' | 'grafiato' | 'pintura_externa'): CalculationResult {
  const consumo = aplicarPerda(areaExterna, 0.12)
  return {
    module: 'fachada',
    summary: { areaExterna, acabamento, areaComPerda: Number(consumo.toFixed(2)) },
    materials: [{ code: 'FACHADA-ACAB', description: acabamento, unit: 'm2', quantity: Number(consumo.toFixed(2)) }],
  }
}

export function calcularPinturaAvancada(area: number, demaos: number): CalculationResult {
  const areaPintura = area * demaos
  const massaCorridaKg = aplicarPerda(area * 1.2, 0.1)
  const seladorL = aplicarPerda(area / 8, 0.08)
  const tintaL = aplicarPerda(areaPintura / 10, 0.1)
  return {
    module: 'pintura_avancada',
    summary: { areaPintura, massaCorridaKg: Number(massaCorridaKg.toFixed(2)), tintaL: Number(tintaL.toFixed(2)) },
    materials: [
      { code: 'PINT-MASSA', description: 'Massa corrida', unit: 'kg', quantity: Number(massaCorridaKg.toFixed(2)) },
      { code: 'PINT-SEL', description: 'Selador', unit: 'L', quantity: Number(seladorL.toFixed(2)) },
      { code: 'PINT-TINTA', description: 'Tinta', unit: 'L', quantity: Number(tintaL.toFixed(2)) },
    ],
  }
}

export function calcularRebocoEmboco(area: number, espessura: number): CalculationResult {
  const volumeArgamassa = aplicarPerda(area * espessura, 0.1)
  const cimentoKg = volumeArgamassa * 200
  const areiaM3 = volumeArgamassa * 0.75
  return {
    module: 'reboco_emboco',
    summary: { area, espessura, volumeArgamassa: Number(volumeArgamassa.toFixed(3)) },
    materials: [
      { code: 'REB-ARG', description: 'Argamassa de reboco', unit: 'm3', quantity: Number(volumeArgamassa.toFixed(3)) },
      { code: 'REB-CIM', description: 'Cimento', unit: 'kg', quantity: Number(cimentoKg.toFixed(2)) },
      { code: 'REB-AREIA', description: 'Areia', unit: 'm3', quantity: Number(areiaM3.toFixed(3)) },
    ],
  }
}

export function calcularAreaParede(largura: number, altura: number) {
  return calcularArea(largura, altura)
}

