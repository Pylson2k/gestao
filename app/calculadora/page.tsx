'use client'

import { ConstructionCalculator } from '@/components/calculator/construction-calculator'
import { Card, CardContent } from '@/components/ui/card'

export default function CalculadoraPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Calculadora Profissional de Obra</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Motor técnico modular com perdas, arredondamentos inteligentes, orçamento automático e base evolutiva
            para todas as etapas da construção.
          </p>
        </CardContent>
      </Card>
      <ConstructionCalculator />
    </div>
  )
}

