import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidIsoDate, parseBrDate } from '@/modules/getao/lib/date'
import { parseNonNegativeMoney } from '@/modules/getao/lib/money'

test('validates real ISO calendar dates, including leap years', () => {
  assert.equal(isValidIsoDate('2024-02-29'), true)
  assert.equal(isValidIsoDate('2026-02-28'), true)
  assert.equal(isValidIsoDate('2026-02-31'), false)
  assert.equal(isValidIsoDate('2026-13-01'), false)
  assert.equal(isValidIsoDate('2026-00-10'), false)
  assert.equal(isValidIsoDate('2026-2-10'), false)
})

test('parses Brazilian dates only when the calendar date exists', () => {
  assert.equal(parseBrDate('29/02/2024'), '2024-02-29')
  assert.equal(parseBrDate('31/02/2026'), null)
  assert.equal(parseBrDate('01/13/2026'), null)
})

test('money input rejects empty and invalid values while preserving zero', () => {
  assert.equal(parseNonNegativeMoney(''), null)
  assert.equal(parseNonNegativeMoney('  '), null)
  assert.equal(parseNonNegativeMoney('abc'), null)
  assert.equal(parseNonNegativeMoney('-1'), null)
  assert.equal(parseNonNegativeMoney('0'), 0)
  assert.equal(parseNonNegativeMoney('12,50'), 12.5)
})
