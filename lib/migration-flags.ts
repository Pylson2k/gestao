export type DomainKey =
  | 'auth'
  | 'clients'
  | 'services'
  | 'quotes'
  | 'payments'
  | 'expenses'
  | 'cash-closings'
  | 'materials'

function normalizePercent(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(100, Math.floor(parsed)))
}

export function getDomainRolloutPercent(domain: DomainKey): number {
  const envKey = `MIGRATION_${domain.toUpperCase()}_ROLLOUT`
  return normalizePercent(process.env[envKey], 0)
}

export function isRustDomainEnabled(domain: DomainKey, seed?: string): boolean {
  const rollout = getDomainRolloutPercent(domain)
  if (rollout <= 0) return false
  if (rollout >= 100) return true
  const stableSeed = seed ?? 'default-seed'
  let hash = 0
  for (let i = 0; i < stableSeed.length; i += 1) {
    hash = (hash * 31 + stableSeed.charCodeAt(i)) % 1000
  }
  const bucket = hash % 100
  return bucket < rollout
}
