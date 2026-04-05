/**
 * Unidades e quantidade para materiais (listas e orçamentos).
 * Aceita vírgula decimal, frações simples e números mistos (ex.: 1 1/2).
 */

export const DEFAULT_MATERIAL_UNIT = 'unidade'

export const MATERIAL_UNITS = [
  { value: 'unidade', label: 'Unidade / peça', pdf: 'un.' },
  { value: 'metro', label: 'Metro (m)', pdf: 'm' },
  { value: 'metro_quadrado', label: 'Metro quadrado (m²)', pdf: 'm²' },
  { value: 'metro_cubico', label: 'Metro cúbico (m³)', pdf: 'm³' },
  { value: 'kg', label: 'Quilograma (kg)', pdf: 'kg' },
  { value: 'litro', label: 'Litro (L)', pdf: 'L' },
  { value: 'caixa', label: 'Caixa', pdf: 'cx.' },
  { value: 'rolo', label: 'Rolo', pdf: 'rolo' },
  { value: 'saco', label: 'Saco', pdf: 'saco' },
  { value: 'par', label: 'Par', pdf: 'par' },
  { value: 'galao', label: 'Galão', pdf: 'gal.' },
  { value: 'metro_linear', label: 'Metro linear', pdf: 'm lin.' },
] as const

export type MaterialUnitValue = (typeof MATERIAL_UNITS)[number]['value']

export function getMaterialUnitPdf(value: string | undefined | null): string {
  if (!value) return MATERIAL_UNITS[0].pdf
  const u = MATERIAL_UNITS.find((x) => x.value === value)
  return u?.pdf ?? value
}

export function getMaterialUnitLabel(value: string | undefined | null): string {
  if (!value) return MATERIAL_UNITS[0].label
  const u = MATERIAL_UNITS.find((x) => x.value === value)
  return u?.label ?? value
}

/** Exibe quantidade no padrão brasileiro (vírgula decimal). */
export function formatQuantityDisplay(q: number): string {
  if (!Number.isFinite(q)) return ''
  const s = q.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
  return s
}

/**
 * Interpreta texto digitado pelo usuário.
 * Aceita: 0,5 | 0.5 | 1/2 | 1 1/2 | 3/4
 */
export function parseQuantityInput(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (!s) return null

  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s)
  if (mixed) {
    const whole = parseInt(mixed[1], 10)
    const num = parseInt(mixed[2], 10)
    const den = parseInt(mixed[3], 10)
    if (den === 0 || !Number.isFinite(whole)) return null
    return whole + num / den
  }

  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s)
  if (frac) {
    const num = parseInt(frac[1], 10)
    const den = parseInt(frac[2], 10)
    if (den === 0) return null
    return num / den
  }

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized: string
  if (lastComma > lastDot) {
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    normalized = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.')
  } else {
    normalized = s
  }
  const n = parseFloat(normalized.trim())
  if (!Number.isFinite(n)) return null
  return n
}

/** Quantidade válida para salvar (mínimo pequeno para evitar zero indevido). */
export function normalizeStoredQuantity(parsed: number | null, fallback = 1): number {
  if (parsed === null || !Number.isFinite(parsed)) return fallback
  if (parsed <= 0) return fallback
  return Math.round(parsed * 10000) / 10000
}

/** Valida chave de unidade vinda da API ou do backup. */
export function resolveMaterialUnit(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_MATERIAL_UNIT
  const t = raw.trim()
  return MATERIAL_UNITS.some((u) => u.value === t) ? t : DEFAULT_MATERIAL_UNIT
}

/** Normaliza quantidade vinda de número JSON ou texto (backup antigo). */
export function resolveMaterialQuantity(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return normalizeStoredQuantity(raw, 1)
  }
  if (typeof raw === 'string') {
    return normalizeStoredQuantity(parseQuantityInput(raw), 1)
  }
  return 1
}

/** Uso em PDF: quantidade formatada + abreviação da unidade. */
export function formatQuantityWithUnitPdf(q: number, unit?: string | null): string {
  const qStr = formatQuantityDisplay(q)
  const u = getMaterialUnitPdf(unit)
  return `${qStr} ${u}`.trim()
}

/** Texto para uma linha de ajuda no formulário. */
export const QUANTITY_HELP_TEXT =
  'Enter na descrição leva à quantidade; na quantidade confirma e vai ao valor unitário (orçamento) ou cria linha nova no fim da lista. Atalhos: 1 un., 1 m, números e frações. Decimais com vírgula (0,5) ou fração (1/2).'
