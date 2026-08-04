import test from 'node:test'
import assert from 'node:assert/strict'
import { getDomainRolloutPercent, isRustDomainEnabled } from '@/lib/migration-flags'
import { resolveDomain } from '@/lib/rust-gateway'

function withEnv(
  entries: Record<string, string | undefined>,
  fn: () => void
): void {
  const previous: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(entries)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('rollout defaults to disabled without env var', () => {
  withEnv({ MIGRATION_PAYMENTS_ROLLOUT: undefined }, () => {
    assert.equal(getDomainRolloutPercent('payments'), 0)
    assert.equal(isRustDomainEnabled('payments'), false)
    assert.equal(isRustDomainEnabled('payments', 'some-user'), false)
  })
})

test('rollout at 100 enables every request', () => {
  withEnv({ MIGRATION_PAYMENTS_ROLLOUT: '100' }, () => {
    assert.equal(isRustDomainEnabled('payments'), true)
    assert.equal(isRustDomainEnabled('payments', 'seed-a'), true)
  })
})

test('rollout at 50 buckets seeds deterministically and partially', () => {
  withEnv({ MIGRATION_PAYMENTS_ROLLOUT: '50' }, () => {
    assert.equal(
      isRustDomainEnabled('payments', 'seed-x'),
      isRustDomainEnabled('payments', 'seed-x')
    )
    const seeds = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const enabled = seeds.filter((s) => isRustDomainEnabled('payments', s))
    assert.ok(
      enabled.length > 0 && enabled.length < seeds.length,
      `expected partial rollout, got ${enabled.length}/${seeds.length}`
    )
  })
})

test('invalid rollout values fall back to safe defaults', () => {
  withEnv({ MIGRATION_CLIENTS_ROLLOUT: 'abc' }, () => {
    assert.equal(getDomainRolloutPercent('clients'), 0)
  })
  withEnv({ MIGRATION_CLIENTS_ROLLOUT: '-5' }, () => {
    assert.equal(getDomainRolloutPercent('clients'), 0)
  })
  withEnv({ MIGRATION_CLIENTS_ROLLOUT: '150' }, () => {
    assert.equal(getDomainRolloutPercent('clients'), 100)
  })
})

test('resolveDomain maps gateway paths to domains', () => {
  assert.equal(resolveDomain('/api/v2/payments'), 'payments')
  assert.equal(resolveDomain('/api/v2/payments/abc'), 'payments')
  assert.equal(resolveDomain('/api/v2/expenses'), 'expenses')
  assert.equal(resolveDomain('/api/v2/cash-closings'), 'cash-closings')
  assert.equal(resolveDomain('/api/v2/material-lists'), 'materials')
  assert.equal(resolveDomain('/api/v2/clients'), 'clients')
  assert.equal(resolveDomain('/api/legacy/whatever'), null)
  assert.equal(resolveDomain('/api/v2/unknown'), null)
})
