import { aplicarPerda, calcularArea, calcularVolume } from '../../engine/core'
import type { CalculationResult } from '../../engine/types'

export function calcularTerraplanagem(corteM3: number, aterroM3: number, fatorEmpolamento = 1.25): CalculationResult {
  const volumeTransporte = (corteM3 + aterroM3) * fatorEmpolamento
  return {
    module: 'terraplanagem',
    summary: { corteM3, aterroM3, volumeTransporte: Number(volumeTransporte.toFixed(2)) },
    materials: [{ code: 'TERRA-TRANSP', description: 'Transporte de terra', unit: 'm3', quantity: Number(volumeTransporte.toFixed(2)) }],
  }
}

export function calcularFundacaoCompleta(areaBase: number, espessura: number, tipo: 'sapata_isolada' | 'sapata_corrida' | 'radier' | 'estaca'): CalculationResult {
  const volume = calcularVolume(areaBase, 1, espessura)
  const fatorTipo = tipo === 'estaca' ? 1.2 : tipo === 'radier' ? 1.1 : 1
  const volumeFinal = aplicarPerda(volume * fatorTipo, 0.08)
  const acoKg = volumeFinal * 95
  return {
    module: 'fundacoes',
    summary: { tipo, volumeFinal: Number(volumeFinal.toFixed(3)), acoKg: Number(acoKg.toFixed(2)) },
    materials: [
      { code: 'FUND-CONC', description: 'Concreto para fundação', unit: 'm3', quantity: Number(volumeFinal.toFixed(3)) },
      { code: 'FUND-ACO', description: 'Aço estimado', unit: 'kg', quantity: Number(acoKg.toFixed(2)) },
    ],
  }
}

export function calcularEstrutura(areaPavimento: number, alturaPilar: number): CalculationResult {
  const volumePilares = calcularVolume(0.2, 0.2, alturaPilar) * (areaPavimento / 12)
  const volumeVigas = areaPavimento * 0.05
  const volumeLaje = areaPavimento * 0.12
  const volumeTotal = aplicarPerda(volumePilares + volumeVigas + volumeLaje, 0.1)
  const acoKg = volumeTotal * 110
  return {
    module: 'estrutura',
    summary: {
      volumePilares: Number(volumePilares.toFixed(3)),
      volumeVigas: Number(volumeVigas.toFixed(3)),
      volumeLaje: Number(volumeLaje.toFixed(3)),
      volumeTotal: Number(volumeTotal.toFixed(3)),
    },
    materials: [
      { code: 'EST-CONC', description: 'Concreto estrutural', unit: 'm3', quantity: Number(volumeTotal.toFixed(3)) },
      { code: 'EST-ACO', description: 'Aço estrutural', unit: 'kg', quantity: Number(acoKg.toFixed(2)) },
    ],
  }
}

export function calcularAlvenariaCompleta(comprimentoParedes: number, altura: number, tipoBloco: '6' | '8' | '12'): CalculationResult {
  const areaParedes = calcularArea(comprimentoParedes, altura)
  const blocosPorM2 = tipoBloco === '6' ? 17 : tipoBloco === '8' ? 16 : 13
  const blocos = aplicarPerda(areaParedes * blocosPorM2, 0.1)
  const argamassaM3 = areaParedes * 0.02
  const vergasM = comprimentoParedes * 0.12
  return {
    module: 'alvenaria',
    summary: { areaParedes, blocos: Math.ceil(blocos), argamassaM3: Number(argamassaM3.toFixed(3)), vergasM: Number(vergasM.toFixed(2)) },
    materials: [
      { code: 'ALV-BLOCO', description: `Bloco ${tipoBloco} furos`, unit: 'un', quantity: Math.ceil(blocos) },
      { code: 'ALV-ARG', description: 'Argamassa assentamento', unit: 'm3', quantity: Number(argamassaM3.toFixed(3)) },
      { code: 'ALV-VERGA', description: 'Verga/contra-verga', unit: 'm', quantity: Number(vergasM.toFixed(2)) },
    ],
  }
}

export function calcularContrapiso(area: number, espessura: number): CalculationResult {
  const volume = aplicarPerda(area * espessura, 0.08)
  return {
    module: 'contrapiso',
    summary: { area, espessura, volume: Number(volume.toFixed(3)) },
    materials: [{ code: 'CPISO-ARG', description: 'Argamassa de contrapiso', unit: 'm3', quantity: Number(volume.toFixed(3)) }],
  }
}

