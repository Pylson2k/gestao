import { NextRequest } from 'next/server'
import { DomainKey, isRustDomainEnabled } from '@/lib/migration-flags'

const DOMAIN_BY_PATH: Array<{ startsWith: string; domain: DomainKey }> = [
  { startsWith: '/api/v2/auth', domain: 'auth' },
  { startsWith: '/api/v2/clients', domain: 'clients' },
  { startsWith: '/api/v2/services', domain: 'services' },
  { startsWith: '/api/v2/quotes', domain: 'quotes' },
  { startsWith: '/api/v2/payments', domain: 'payments' },
  { startsWith: '/api/v2/expenses', domain: 'expenses' },
  { startsWith: '/api/v2/cash-closings', domain: 'cash-closings' },
  { startsWith: '/api/v2/material-lists', domain: 'materials' },
]

export function resolveDomain(pathname: string): DomainKey | null {
  const found = DOMAIN_BY_PATH.find((entry) => pathname.startsWith(entry.startsWith))
  return found?.domain ?? null
}

export function buildRustTarget(req: NextRequest): URL | null {
  const baseUrl = process.env.RUST_API_BASE_URL
  if (!baseUrl) return null
  const rustBase = new URL(baseUrl)
  const url = new URL(req.url)
  return new URL(url.pathname.replace('/api', '') + url.search, rustBase)
}

export function shouldUseRust(req: NextRequest): boolean {
  const domain = resolveDomain(req.nextUrl.pathname)
  if (!domain) return false
  const userSeed = req.headers.get('x-user-id') ?? req.nextUrl.searchParams.get('userId') ?? undefined
  return isRustDomainEnabled(domain, userSeed)
}
