import type { ConstructionStandard } from '../engine/types'

type StandardMap = Record<ConstructionStandard, number>

export const CATALOG = {
  perdas: {
    pintura: { economico: 0.08, padrao: 0.1, reforcado: 0.12 } as StandardMap,
    piso: { economico: 0.07, padrao: 0.1, reforcado: 0.12 } as StandardMap,
    concreto: { economico: 0.05, padrao: 0.08, reforcado: 0.1 } as StandardMap,
    drywall: { economico: 0.1, padrao: 0.12, reforcado: 0.15 } as StandardMap,
    serralheria: { economico: 0.08, padrao: 0.1, reforcado: 0.13 } as StandardMap,
  },
  pintura: {
    rendimentoTintaM2Demao: 10,
    rendimentoSeladorM2: 8,
    lataLitros: 18,
  },
  piso: {
    argamassaKgPorM2: 5,
    rejunteKgPorM2: 0.35,
    pecasPorCaixaPadrao: 8,
  },
  concreto: {
    cimentoKgPorM3: 350,
    areiaM3PorM3: 0.56,
    britaM3PorM3: 0.84,
    acoKgPorM3: 90,
  },
  drywall: {
    areaChapaM2: 1.2 * 2.4,
    parafusosPorM2: 24,
    fitaMLPorM2: 1.4,
    massaKgPorM2: 0.7,
  },
  serralheria: {
    pesoKgPorM2Portao: 25,
    tuboMLinearPorM2: 3.8,
    eletrodoKgPorM2: 0.25,
    discoCorteUnPorM2: 0.15,
    tintaAnticorrosivaLPorM2: 0.18,
    primerLPorM2: 0.12,
  },
  maoDeObra: {
    custoM2: { economico: 110, padrao: 170, reforcado: 260 } as StandardMap,
    produtividadeM2Dia: { economico: 30, padrao: 24, reforcado: 18 } as StandardMap,
  },
}

export function getPerda(key: keyof typeof CATALOG.perdas, standard: ConstructionStandard): number {
  return CATALOG.perdas[key][standard]
}

