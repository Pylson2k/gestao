import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicarPerda,
  arredondarParaCima,
  calcularArea,
  calcularConsumo,
  calcularPecas,
  calcularVolume,
} from '@/modules/calculator/engine/core'

test('engine core calculations are consistent', () => {
  assert.equal(calcularArea(3, 4), 12)
  assert.equal(calcularVolume(3, 4, 2), 24)
  assert.equal(calcularConsumo(20, 10), 2)
  assert.equal(calcularPecas(12, 0.6), 20)
  assert.ok(Math.abs(aplicarPerda(100, 0.1) - 110) < 1e-9)
  assert.equal(arredondarParaCima(10.1), 11)
  assert.equal(arredondarParaCima(11, 5), 15)
})

