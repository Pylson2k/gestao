export function parseNonNegativeMoney(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null

  const amount = typeof value === 'number' ? value : Number(value.trim().replace(',', '.'))
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}
