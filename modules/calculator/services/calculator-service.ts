import type { CalculationResult, ConstructionStandard, MaterialLine } from '../engine/types'
import { calcularConcreto } from '../modules/mvp/concrete'
import { calcularPiso } from '../modules/mvp/flooring'
import { calcularPintura } from '../modules/mvp/painting'
import { calcularAlvenariaCompleta, calcularContrapiso, calcularEstrutura, calcularFundacaoCompleta, calcularTerraplanagem } from '../modules/advanced/structural'
import { calcularFachada, calcularForro, calcularImpermeabilizacao, calcularPinturaAvancada, calcularRebocoEmboco, calcularRevestimentosCompletos } from '../modules/advanced/finishes'
import { calcularCoberturaAvancada, calcularDrenagem, calcularEletricaCompleta, calcularEsquadrias, calcularGas, calcularHidraulicaCompleta, calcularUrbanizacao } from '../modules/advanced/systems'
import { calcularCronograma, calcularDemolicao, calcularInsumosIndiretos, calcularLimpezaObra, calcularMaoDeObra } from '../modules/advanced/management'
import { calcularDrywallCompleto, calcularEstruturaMetalicaBasica, calcularForroDrywall, calcularGradesGuardaCorpo, calcularPortaoMetalico } from '../modules/advanced/drywall-serralheria'

export interface FullProjectInput {
  areaBase: number
  alturaMedia: number
  standard: ConstructionStandard
}

export function calcularPacoteMvp(area: number, standard: ConstructionStandard): CalculationResult[] {
  return [
    calcularPintura({ largura: area, altura: 1, quantidadeParedes: 1, demaos: 2, standard, usarSelador: true }),
    calcularPiso({ largura: area, comprimento: 1, pecaLargura: 0.6, pecaComprimento: 0.6, standard }),
    calcularConcreto({ largura: area, comprimento: 1, altura: 0.12, standard }),
  ]
}

export function calcularProjetoCompleto(input: FullProjectInput): CalculationResult[] {
  const area = input.areaBase
  const h = input.alturaMedia
  return [
    calcularTerraplanagem(area * 0.15, area * 0.08),
    calcularFundacaoCompleta(area, 0.35, 'radier'),
    calcularEstrutura(area, h),
    calcularAlvenariaCompleta(area * 1.3, h, '8'),
    calcularImpermeabilizacao(area * 0.3, 'liquida'),
    calcularRebocoEmboco(area * 1.6, 0.02),
    calcularContrapiso(area, 0.05),
    calcularRevestimentosCompletos(area, area * 1.1),
    calcularForro(area, 'drywall'),
    calcularCoberturaAvancada(area, 30, 'ceramica'),
    calcularEsquadrias(8, 10, 0.9, 2.1),
    calcularEletricaCompleta(area, 26, 18),
    calcularHidraulicaCompleta(14, 12),
    calcularGas(4),
    calcularPinturaAvancada(area * 1.8, 2),
    calcularFachada(area * 0.7, 'textura'),
    calcularUrbanizacao(area * 0.45),
    calcularDrenagem(area * 0.4),
    calcularDemolicao(area * 0.1, 0.08),
    calcularLimpezaObra(area),
    calcularInsumosIndiretos(area),
    calcularMaoDeObra(area, input.standard),
    calcularCronograma({
      terraplanagem: 4,
      fundacao: 9,
      estrutura: 14,
      alvenaria: 12,
      acabamentos: 20,
      instalacoes: 12,
      finalizacao: 8,
    }),
    calcularDrywallCompleto({
      largura: area * 0.24,
      altura: h,
      tipo: 'parede_simples',
      espacamentoMontante: input.standard === 'reforcado' ? 0.4 : 0.6,
      faces: 2,
      tipoChapa: 'ST',
      standard: input.standard,
    }),
    calcularForroDrywall(area * 0.3),
    calcularPortaoMetalico({ largura: 3, altura: 2.2, tipo: 'correr', standard: input.standard }),
    calcularGradesGuardaCorpo(12, 1.1, 0.12),
    calcularEstruturaMetalicaBasica(area * 0.2),
  ]
}

export function flattenMaterials(results: CalculationResult[]): MaterialLine[] {
  return results.flatMap((r) => r.materials)
}

