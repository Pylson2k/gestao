import { CATALOG, getPerda } from '../../catalog/technical-catalog'
import { aplicarPerda, arredondarParaCima, calcularArea } from '../../engine/core'
import type { CalculationResult, ConstructionStandard } from '../../engine/types'

export interface DrywallInput {
  largura: number
  altura: number
  tipo: 'parede_simples' | 'parede_dupla' | 'forro'
  espacamentoMontante: 0.4 | 0.6
  faces: 1 | 2
  tipoChapa: 'ST' | 'RU' | 'RF'
  standard: ConstructionStandard
}

export function calcularDrywallCompleto(input: DrywallInput): CalculationResult {
  const area = calcularArea(input.largura, input.altura)
  const faces = input.tipo === 'forro' ? 1 : input.faces
  const areaFaces = area * faces
  const chapasBase = areaFaces / CATALOG.drywall.areaChapaM2
  const chapas = arredondarParaCima(aplicarPerda(chapasBase, getPerda('drywall', input.standard)))
  const montantes = arredondarParaCima((input.largura / input.espacamentoMontante) + 2)
  const guiasML = Number((input.largura * 2).toFixed(2))
  const parafusos = arredondarParaCima(areaFaces * CATALOG.drywall.parafusosPorM2)
  const fitaML = Number((areaFaces * CATALOG.drywall.fitaMLPorM2).toFixed(2))
  const massaKg = Number((areaFaces * CATALOG.drywall.massaKgPorM2).toFixed(2))
  return {
    module: 'drywall',
    summary: { area, areaFaces, chapas, montantes, guiasML, parafusos, fitaML, massaKg },
    materials: [
      { code: 'DRY-CHAPA', description: `Chapa drywall ${input.tipoChapa}`, unit: 'un', quantity: chapas },
      { code: 'DRY-MONT', description: 'Montantes metálicos', unit: 'un', quantity: montantes },
      { code: 'DRY-GUIA', description: 'Guias metálicas', unit: 'm', quantity: guiasML },
      { code: 'DRY-PARAF', description: 'Parafusos drywall', unit: 'un', quantity: parafusos },
      { code: 'DRY-FITA', description: 'Fita para junta', unit: 'm', quantity: fitaML },
      { code: 'DRY-MASSA', description: 'Massa para junta', unit: 'kg', quantity: massaKg },
    ],
    alerts:
      input.espacamentoMontante === 0.6 && input.standard === 'reforcado'
        ? ['Para nível reforçado, avalie espaçamento de 0,40 m para maior rigidez.']
        : undefined,
  }
}

export function calcularForroDrywall(areaTeto: number): CalculationResult {
  const chapas = arredondarParaCima(aplicarPerda(areaTeto / CATALOG.drywall.areaChapaM2, 0.1))
  const perfisF530 = Number((areaTeto * 1.8).toFixed(2))
  const tirantes = arredondarParaCima(areaTeto * 0.8)
  const arames = Number((areaTeto * 1.4).toFixed(2))
  return {
    module: 'forro_drywall',
    summary: { areaTeto, chapas, perfisF530, tirantes, arames },
    materials: [
      { code: 'FDR-CHAPA', description: 'Chapas drywall forro', unit: 'un', quantity: chapas },
      { code: 'FDR-F530', description: 'Perfil F530', unit: 'm', quantity: perfisF530 },
      { code: 'FDR-TIR', description: 'Tirantes', unit: 'un', quantity: tirantes },
      { code: 'FDR-ARAME', description: 'Arame galvanizado', unit: 'm', quantity: arames },
    ],
  }
}

export interface PortaoInput {
  largura: number
  altura: number
  tipo: 'correr' | 'basculante' | 'abrir'
  standard: ConstructionStandard
}

export function calcularPortaoMetalico(input: PortaoInput): CalculationResult {
  const area = calcularArea(input.largura, input.altura)
  const estruturaML = aplicarPerda(area * CATALOG.serralheria.tuboMLinearPorM2, getPerda('serralheria', input.standard))
  const pesoKg = area * CATALOG.serralheria.pesoKgPorM2Portao
  const ferragens = input.tipo === 'correr' ? 4 : input.tipo === 'basculante' ? 3 : 2
  return {
    module: 'serralheria_portao',
    summary: { area, estruturaML: Number(estruturaML.toFixed(2)), pesoKg: Number(pesoKg.toFixed(2)), ferragens },
    materials: [
      { code: 'SER-TUBO', description: 'Tubo estrutural metálico', unit: 'm', quantity: Number(estruturaML.toFixed(2)) },
      { code: 'SER-FERR', description: 'Ferragens (dobradiças/roldanas)', unit: 'kit', quantity: ferragens },
    ],
  }
}

export function calcularGradesGuardaCorpo(comprimento: number, altura: number, espacamentoBarras: number): CalculationResult {
  const barras = arredondarParaCima(comprimento / espacamentoBarras) + 1
  const ferroML = Number((barras * altura + comprimento * 2).toFixed(2))
  return {
    module: 'serralheria_grades',
    summary: { barras, ferroML, comprimento, altura },
    materials: [
      { code: 'SER-BARRA', description: 'Barras metálicas', unit: 'un', quantity: barras },
      { code: 'SER-FERRO-ML', description: 'Ferro total', unit: 'm', quantity: ferroML },
    ],
  }
}

export function calcularEstruturaMetalicaBasica(area: number): CalculationResult {
  const perfis = Number((area * 5.8).toFixed(2))
  const pesoKg = Number((area * 28).toFixed(2))
  const fixacoes = arredondarParaCima(area * 6)
  const eletrodoKg = Number((area * CATALOG.serralheria.eletrodoKgPorM2).toFixed(2))
  const discoCorte = arredondarParaCima(area * CATALOG.serralheria.discoCorteUnPorM2)
  const tintaL = Number((area * CATALOG.serralheria.tintaAnticorrosivaLPorM2).toFixed(2))
  const primerL = Number((area * CATALOG.serralheria.primerLPorM2).toFixed(2))
  return {
    module: 'serralheria_estrutura',
    summary: { area, perfis, pesoKg, fixacoes },
    materials: [
      { code: 'SER-PERFIL', description: 'Perfis metálicos', unit: 'm', quantity: perfis },
      { code: 'SER-FIX', description: 'Parafusos/fixações', unit: 'un', quantity: fixacoes },
      { code: 'SER-ELET', description: 'Eletrodo', unit: 'kg', quantity: eletrodoKg },
      { code: 'SER-DISCO', description: 'Disco de corte', unit: 'un', quantity: discoCorte },
      { code: 'SER-TINTA', description: 'Tinta anticorrosiva', unit: 'L', quantity: tintaL },
      { code: 'SER-PRIMER', description: 'Primer', unit: 'L', quantity: primerL },
    ],
  }
}

