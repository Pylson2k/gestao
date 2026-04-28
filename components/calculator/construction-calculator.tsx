'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ConstructionStandard } from '@/modules/calculator/engine/types'
import { calcularPacoteMvp, calcularProjetoCompleto, flattenMaterials } from '@/modules/calculator/services/calculator-service'
import { calcularOrcamento } from '@/modules/calculator/services/budget-service'

export function ConstructionCalculator() {
  const [area, setArea] = useState('120')
  const [altura, setAltura] = useState('2.8')
  const [standard, setStandard] = useState<ConstructionStandard>('padrao')
  const [mode, setMode] = useState<'mvp' | 'completo'>('mvp')

  const output = useMemo(() => {
    const a = Number(area)
    const h = Number(altura)
    if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(h) || h <= 0) return null
    const results =
      mode === 'mvp'
        ? calcularPacoteMvp(a, standard)
        : calcularProjetoCompleto({ areaBase: a, alturaMedia: h, standard })
    const materials = flattenMaterials(results)
    const budget = calcularOrcamento(materials)
    const subtotal = budget.lines.reduce((sum, line) => sum + line.totalCost, 0)
    return { results, materials, budget, subtotal }
  }, [area, altura, mode, standard])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros técnicos da obra</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="area">Área base (m²)</Label>
            <Input id="area" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="altura">Altura média (m)</Label>
            <Input id="altura" value={altura} onChange={(e) => setAltura(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Padrão da obra</Label>
            <Select value={standard} onValueChange={(v) => setStandard(v as ConstructionStandard)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="economico">Econômico</SelectItem>
                <SelectItem value="padrao">Padrão</SelectItem>
                <SelectItem value="reforcado">Reforçado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Escopo de cálculo</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as 'mvp' | 'completo')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mvp">MVP técnico</SelectItem>
                <SelectItem value="completo">Obra completa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {output ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo de orçamento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><strong>Custo direto:</strong> R$ {output.budget.directCost.toFixed(2)}</div>
              <div><strong>Custos indiretos:</strong> R$ {output.budget.indirectCost.toFixed(2)}</div>
              <div><strong>Preço final:</strong> R$ {output.budget.totalPrice.toFixed(2)}</div>
              <div><strong>Itens de material:</strong> {output.materials.length}</div>
              <div><strong>Subtotal técnico:</strong> R$ {output.subtotal.toFixed(2)}</div>
              <div><strong>Módulos processados:</strong> {output.results.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top materiais (estimativa)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {output.materials.slice(0, 18).map((line, idx) => (
                <div key={`${line.code}-${idx}`} className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                  <span>{line.description}</span>
                  <span>{line.quantity.toFixed(2)} {line.unit}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Informe valores válidos para área e altura para iniciar o cálculo.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

