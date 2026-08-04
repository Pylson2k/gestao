/**
 * Teste de paridade (shadow traffic) entre o backend legado (Next.js `/api/*`)
 * e o backend Rust (`/v2/*`).
 *
 * Pré-requisitos:
 *   1. Next rodando em http://localhost:3000 (npm run dev)
 *   2. Rust rodando em http://localhost:4000 (cargo run, com DATABASE_URL)
 *
 * Uso:
 *   npm run db:parity
 *   NEXT_BASE_URL=http://localhost:3000 RUST_BASE_URL=http://localhost:4000 npm run db:parity
 *
 * Compara apenas leituras (GET). Para comparar com os mesmos dados, a tabela
 * é a mesma (PostgreSQL compartilhado).
 */

import 'dotenv/config'
import { createSessionToken } from '@/lib/session'

const NEXT_BASE = process.env.NEXT_BASE_URL ?? 'http://localhost:3000'
const RUST_BASE = process.env.RUST_BASE_URL ?? 'http://localhost:4000'

type Check = {
  name: string
  legacyPath: string
  rustPath: string
  normalize: (body: unknown) => unknown
}

function sortById(items: unknown): unknown {
  if (!Array.isArray(items)) return items
  return items
    .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : {}))
    .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')))
}

/** Remove/ignora campos que podem divergir entre legado e Rust sem ser bug. */
function stripVolatile(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map(stripVolatile)
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
      if (key === 'createdAt' || key === 'updatedAt') {
        out[key] = normalizeDate(value)
        continue
      }
      if (typeof value === 'number') {
        out[key] = Math.round(value * 100) / 100
        continue
      }
      out[key] = stripVolatile(value)
    }
    return out
  }
  return body
}

function normalizeDate(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  // Milissegundos truncados para ignorar diferenças de precisão do formato.
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

const CHECKS: Check[] = [
  {
    name: 'clients (list)',
    legacyPath: '/api/clients',
    rustPath: '/v2/clients',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'clients (search "a")',
    legacyPath: '/api/clients?search=a',
    rustPath: '/v2/clients?search=a',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'services (list)',
    legacyPath: '/api/services',
    rustPath: '/v2/services',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'services (ativos)',
    legacyPath: '/api/services?isActive=true',
    rustPath: '/v2/services?isActive=true',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'services (search "tomada")',
    legacyPath: '/api/services?search=tomada',
    rustPath: '/v2/services?search=tomada',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'quotes (list)',
    legacyPath: '/api/quotes',
    rustPath: '/v2/quotes',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'quotes (status draft)',
    legacyPath: '/api/quotes?status=draft',
    rustPath: '/v2/quotes?status=draft',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'quotes (single first)',
    legacyPath: '/api/quotes/cmsemj34q0001egv0qwiflbgu',
    rustPath: '/v2/quotes/cmsemj34q0001egv0qwiflbgu',
    normalize: (body) => stripVolatile(body),
  },
  {
    name: 'payments (list)',
    legacyPath: '/api/payments',
    rustPath: '/v2/payments',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'expenses (list)',
    legacyPath: '/api/expenses',
    rustPath: '/v2/expenses',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'expenses (category pagamento_funcionario)',
    legacyPath: '/api/expenses?category=pagamento_funcionario',
    rustPath: '/v2/expenses?category=pagamento_funcionario',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'cash-closings (list)',
    legacyPath: '/api/cash-closings',
    rustPath: '/v2/cash-closings',
    normalize: (body) => sortById(stripVolatile(body)),
  },
  {
    name: 'material-lists (list)',
    legacyPath: '/api/material-lists',
    rustPath: '/v2/material-lists',
    normalize: (body) => sortById(stripVolatile(body)),
  },
]

let failures = 0
let passed = 0

function diffDetail(legacy: unknown, rust: unknown): string {
  const legacyJson = JSON.stringify(legacy, null, 2)
  const rustJson = JSON.stringify(rust, null, 2)
  return `--- legado ---\n${legacyJson}\n--- rust ---\n${rustJson}`
}

async function runCheck(check: Check, sessionToken: string) {
  const cookie = `sinai_session=${sessionToken}`
  const [legacyRes, rustRes] = await Promise.all([
    fetch(`${NEXT_BASE}${check.legacyPath}`, { headers: { cookie } }),
    fetch(`${RUST_BASE}${check.rustPath}`, {
      headers: { 'x-user-id': '1', 'x-auth-verified': '1' },
    }),
  ])

  const legacyBody = await legacyRes.json().catch(() => null)
  const rustBody = await rustRes.json().catch(() => null)

  const legacyNorm = check.normalize(legacyBody)
  const rustNorm = check.normalize(rustBody)

  const statusOk = legacyRes.status === rustRes.status
  const bodyOk = JSON.stringify(legacyNorm) === JSON.stringify(rustNorm)

  if (statusOk && bodyOk) {
    passed += 1
    console.log(`PASS  ${check.name} (status ${legacyRes.status})`)
  } else {
    failures += 1
    console.log(`FAIL  ${check.name}`)
    if (!statusOk) {
      console.log(`  status: legado=${legacyRes.status} rust=${rustRes.status}`)
    }
    if (!bodyOk) {
      console.log(diffDetail(legacyNorm, rustNorm))
    }
  }
}

async function main() {
  console.log('== Paridade legado (Next) x Rust ==')
  console.log(`Next: ${NEXT_BASE}`)
  console.log(`Rust: ${RUST_BASE}`)
  console.log('')

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL nao configurada. Abortando.')
    process.exit(1)
  }

  const sessionToken = createSessionToken({ mustChangePassword: false })

  for (const check of CHECKS) {
    await runCheck(check, sessionToken)
  }

  console.log('')
  console.log(`Resultado: ${passed} passaram, ${failures} falharam.`)
  process.exit(failures > 0 ? 1 : 0)
}

main()
