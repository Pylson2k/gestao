import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularPintura } from '@/modules/calculator/modules/mvp/painting'
import { calcularPiso } from '@/modules/calculator/modules/mvp/flooring'
import { calcularConcreto } from '@/modules/calculator/modules/mvp/concrete'
import { calcularDrywallCompleto, calcularPortaoMetalico } from '@/modules/calculator/modules/advanced/drywall-serralheria'

test('mvp modules output material lines', () => {
  const pintura = calcularPintura({
    largura: 4,
    altura: 3,
    quantidadeParedes: 4,
    demaos: 2,
    standard: 'padrao',
    usarSelador: true,
  })
  const piso = calcularPiso({
    largura: 5,
    comprimento: 4,
    pecaLargura: 0.6,
    pecaComprimento: 0.6,
    standard: 'padrao',
  })
  const concreto = calcularConcreto({ largura: 5, comprimento: 4, altura: 0.1, standard: 'padrao' })
  assert.ok(pintura.materials.length > 0)
  assert.ok(piso.materials.length > 0)
  assert.ok(concreto.materials.length > 0)
})

test('drywall and serralheria modules output realistic quantities', () => {
  const drywall = calcularDrywallCompleto({
    largura: 6,
    altura: 2.8,
    tipo: 'parede_simples',
    espacamentoMontante: 0.6,
    faces: 2,
    tipoChapa: 'ST',
    standard: 'padrao',
  })
  const portao = calcularPortaoMetalico({
    largura: 3,
    altura: 2.2,
    tipo: 'correr',
    standard: 'padrao',
  })
  assert.ok(Number(drywall.summary.chapas) > 0)
  assert.ok(Number(portao.summary.pesoKg) > 0)
})

