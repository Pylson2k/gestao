'use client'

import { useMemo } from 'react'
import { useCashClosings } from '@/contexts/cash-closings-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const periodTypeLabels: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
}

export default function RelatoriosFechamentosPage() {
  const { closings, isLoading } = useCashClosings()

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalProfit = closings.reduce((sum, c) => sum + c.totalProfit, 0)
    const totalRevenue = closings.reduce((sum, c) => sum + c.totalRevenue, 0)
    const totalExpenses = closings.reduce((sum, c) => sum + c.totalExpenses, 0)
    const totalGustavo = closings.reduce((sum, c) => sum + c.gustavoProfit, 0)
    const totalGiovanni = closings.reduce((sum, c) => sum + c.giovanniProfit, 0)

    return {
      totalProfit,
      totalRevenue,
      totalExpenses,
      totalGustavo,
      totalGiovanni,
      count: closings.length,
    }
  }, [closings])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center text-muted-foreground">Carregando fechamentos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Relatórios de Fechamentos
        </h1>
        <p className="text-muted-foreground">
          Histórico completo de fechamentos de caixa
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Fechamentos</p>
                <p className="text-2xl font-bold text-foreground">{stats.count}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Total Acumulado</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gustavo</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats.totalGustavo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Giovanni</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats.totalGiovanni.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fechamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Fechamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {closings.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum fechamento encontrado
              </h3>
              <p className="text-muted-foreground">
                Realize o primeiro fechamento de caixa para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {closings.map((closing) => (
                <Card key={closing.id} className="border-border">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">
                            {periodTypeLabels[closing.periodType] || closing.periodType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(closing.startDate).toLocaleDateString('pt-BR')} a {new Date(closing.endDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Receita</p>
                            <p className="font-semibold text-green-500">
                              {closing.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Despesas</p>
                            <p className="font-semibold text-red-500">
                              {closing.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lucro Total</p>
                            <p className={cn(
                              "font-semibold",
                              closing.totalProfit >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {closing.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Por Sócio (50%)</p>
                            <p className="font-semibold text-blue-500">
                              {closing.gustavoProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                        {closing.observations && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                              <strong>Observações:</strong> {closing.observations}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Fechado em {new Date(closing.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
