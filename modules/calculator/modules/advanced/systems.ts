import { aplicarPerda, calcularArea } from '../../engine/core'
import type { CalculationResult } from '../../engine/types'

export function calcularCoberturaAvancada(areaBase: number, inclinacaoPercent: number, tipoTelha: 'ceramica' | 'fibrocimento' | 'metalica'): CalculationResult {
  const fatorInclinacao = Math.sqrt(1 + (inclinacaoPercent / 100) ** 2)
  const areaTelhado = aplicarPerda(areaBase * fatorInclinacao, 0.1)
  const telhasPorM2 = tipoTelha === 'ceramica' ? 16 : tipoTelha === 'fibrocimento' ? 3.2 : 2.8
  const telhas = Math.ceil(areaTelhado * telhasPorM2)
  return {
    module: 'cobertura',
    summary: { areaTelhado: Number(areaTelhado.toFixed(2)), telhas, tipoTelha },
    materials: [
      { code: 'COB-TELHA', description: `Telha ${tipoTelha}`, unit: 'un', quantity: telhas },
      { code: 'COB-RIPA', description: 'Ripas', unit: 'm', quantity: Number((areaTelhado * 1.7).toFixed(2)) },
      { code: 'COB-CAIBRO', description: 'Caibros', unit: 'm', quantity: Number((areaTelhado * 0.9).toFixed(2)) },
    ],
  }
}

export function calcularEsquadrias(portas: number, janelas: number, larguraMedia: number, alturaMedia: number): CalculationResult {
  const areaTotal = (portas + janelas) * calcularArea(larguraMedia, alturaMedia)
  const ferragens = (portas * 3) + (janelas * 2)
  return {
    module: 'esquadrias',
    summary: { areaTotal: Number(areaTotal.toFixed(2)), ferragens },
    materials: [
      { code: 'ESQ-PORTA', description: 'Portas', unit: 'un', quantity: portas },
      { code: 'ESQ-JANELA', description: 'Janelas', unit: 'un', quantity: janelas },
      { code: 'ESQ-FERR', description: 'Ferragens básicas', unit: 'kit', quantity: ferragens },
    ],
  }
}

export function calcularEletricaCompleta(area: number, pontosTomada: number, pontosLuz: number): CalculationResult {
  const cargaEstimada = area * 0.12 + pontosTomada * 0.1 + pontosLuz * 0.06
  const caboML = aplicarPerda((pontosTomada * 12) + (pontosLuz * 10), 0.12)
  const disjuntores = Math.max(4, Math.ceil(cargaEstimada / 2))
  return {
    module: 'eletrica',
    summary: { cargaEstimadaKw: Number(cargaEstimada.toFixed(2)), caboML: Number(caboML.toFixed(2)), disjuntores },
    materials: [
      { code: 'ELE-CABO', description: 'Cabos elétricos', unit: 'm', quantity: Number(caboML.toFixed(2)) },
      { code: 'ELE-DISJ', description: 'Disjuntores', unit: 'un', quantity: disjuntores },
      { code: 'ELE-QD', description: 'Quadro elétrico', unit: 'un', quantity: 1 },
    ],
  }
}

export function calcularHidraulicaCompleta(pontosAgua: number, pontosEsgoto: number): CalculationResult {
  const tubosAguaM = aplicarPerda(pontosAgua * 7.5, 0.12)
  const tubosEsgotoM = aplicarPerda(pontosEsgoto * 6.8, 0.12)
  return {
    module: 'hidraulica',
    summary: { tubosAguaM: Number(tubosAguaM.toFixed(2)), tubosEsgotoM: Number(tubosEsgotoM.toFixed(2)) },
    materials: [
      { code: 'HID-AGUA', description: 'Tubulação água fria', unit: 'm', quantity: Number(tubosAguaM.toFixed(2)) },
      { code: 'HID-ESG', description: 'Tubulação esgoto', unit: 'm', quantity: Number(tubosEsgotoM.toFixed(2)) },
      { code: 'HID-CONEX', description: 'Conexões hidráulicas', unit: 'kit', quantity: pontosAgua + pontosEsgoto },
    ],
  }
}

export function calcularGas(pontosGas: number): CalculationResult {
  const tubulacaoM = aplicarPerda(pontosGas * 5.5, 0.1)
  return {
    module: 'gas',
    summary: { pontosGas, tubulacaoM: Number(tubulacaoM.toFixed(2)) },
    materials: [
      { code: 'GAS-TUBO', description: 'Tubulação de gás', unit: 'm', quantity: Number(tubulacaoM.toFixed(2)) },
      { code: 'GAS-VAL', description: 'Válvula de segurança', unit: 'un', quantity: pontosGas },
    ],
  }
}

export function calcularDrenagem(areaExterna: number): CalculationResult {
  const tubosM = aplicarPerda(areaExterna * 0.7, 0.15)
  const britaM3 = aplicarPerda(areaExterna * 0.04, 0.12)
  return {
    module: 'drenagem',
    summary: { tubosM: Number(tubosM.toFixed(2)), britaM3: Number(britaM3.toFixed(3)) },
    materials: [
      { code: 'DREN-TUBO', description: 'Tubo drenante', unit: 'm', quantity: Number(tubosM.toFixed(2)) },
      { code: 'DREN-BRITA', description: 'Brita para drenagem', unit: 'm3', quantity: Number(britaM3.toFixed(3)) },
      { code: 'DREN-GEO', description: 'Geotêxtil', unit: 'm2', quantity: Number((areaExterna * 0.8).toFixed(2)) },
    ],
  }
}

export function calcularUrbanizacao(areaCalcada: number): CalculationResult {
  const pisoExterno = aplicarPerda(areaCalcada, 0.1)
  return {
    module: 'urbanizacao',
    summary: { areaCalcada, pisoExterno: Number(pisoExterno.toFixed(2)) },
    materials: [
      { code: 'URB-PISO', description: 'Piso externo/calçada', unit: 'm2', quantity: Number(pisoExterno.toFixed(2)) },
      { code: 'URB-DREN', description: 'Drenagem superficial', unit: 'm', quantity: Number((areaCalcada * 0.3).toFixed(2)) },
    ],
  }
}

