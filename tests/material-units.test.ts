import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseQuantityInput,
  normalizeStoredQuantity,
  resolveMaterialUnit,
  formatQuantityWithUnitPdf,
} from '@/lib/material-units'

test('parseQuantityInput supports comma and fractions', () => {
  assert.equal(parseQuantityInput('0,5'), 0.5)
  assert.equal(parseQuantityInput('1/2'), 0.5)
  assert.equal(parseQuantityInput('1 1/2'), 1.5)
})

test('normalizeStoredQuantity keeps safe positive values', () => {
  assert.equal(normalizeStoredQuantity(2.345678), 2.3457)
  assert.equal(normalizeStoredQuantity(0), 1)
  assert.equal(normalizeStoredQuantity(null), 1)
})

test('resolveMaterialUnit falls back for unknown values', () => {
  assert.equal(resolveMaterialUnit('metro'), 'metro')
  assert.equal(resolveMaterialUnit('unknown-unit'), 'unidade')
})

test('formatQuantityWithUnitPdf renders compact label', () => {
  assert.equal(formatQuantityWithUnitPdf(1.5, 'metro'), '1,5 m')
})

