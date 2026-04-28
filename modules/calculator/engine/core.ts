import { ensurePositive, ensureRange } from './errors'

export function calcularArea(largura: number, comprimento: number): number {
  ensurePositive(largura, 'Largura')
  ensurePositive(comprimento, 'Comprimento')
  return largura * comprimento
}

export function calcularVolume(largura: number, comprimento: number, altura: number): number {
  ensurePositive(altura, 'Altura')
  return calcularArea(largura, comprimento) * altura
}

export function calcularConsumo(base: number, rendimento: number): number {
  ensurePositive(base, 'Base de cálculo')
  ensurePositive(rendimento, 'Rendimento')
  return base / rendimento
}

export function calcularPecas(areaTotal: number, areaPeca: number): number {
  ensurePositive(areaTotal, 'Área total')
  ensurePositive(areaPeca, 'Área da peça')
  return areaTotal / areaPeca
}

export function aplicarPerda(valor: number, percentual = 0.1): number {
  ensurePositive(valor, 'Valor')
  ensureRange(percentual, 0, 0.5, 'Percentual de perda')
  return valor * (1 + percentual)
}

export function arredondarParaCima(valor: number, multiplo = 1): number {
  ensurePositive(valor, 'Valor')
  ensurePositive(multiplo, 'Múltiplo')
  return Math.ceil(valor / multiplo) * multiplo
}

export function arredondarEmbalagem(valor: number, embalagem: number): number {
  return arredondarParaCima(valor, embalagem)
}

