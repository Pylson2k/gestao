'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Calendar, Filter, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  description: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    username: string
  }
}

const actionLabels: Record<string, string> = {
  create_quote: 'Criar Orçamento',
  update_quote: 'Atualizar Orçamento',
  delete_quote: 'Excluir Orçamento',
  change_quote_status: 'Alterar Status',
  change_quote_discount: 'Alterar Desconto',
  change_quote_total: 'Alterar Total',
  create_expense: 'Criar Despesa',
  update_expense: 'Atualizar Despesa',
  delete_expense: 'Excluir Despesa',
  update_company_settings: 'Atualizar Configurações da Empresa',
}

const actionColors: Record<string, string> = {
  create_quote: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_quote: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_quote: 'bg-red-500/10 text-red-500 border-red-500/20',
  change_quote_status: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  change_quote_discount: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  change_quote_total: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  create_expense: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_expense: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_expense: 'bg-red-500/10 text-red-500 border-red-500/20',
  update_company_settings: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
}

const actionIcons: Record<string, any> = {
  create_quote: Plus,
  update_quote: Edit,
  delete_quote: Trash2,
  change_quote_status: AlertTriangle,
  change_quote_discount: AlertTriangle,
  change_quote_total: AlertTriangle,
  create_expense: Plus,
  update_expense: Edit,
  delete_expense: Trash2,
  update_company_settings: Edit,
}

export default function AuditoriaPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // Primeiro dia do mês
    return date.toISOString().split('T')[0]
  })
  
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')

  useEffect(() => {
    fetchLogs()
  }, [filterStartDate, filterEndDate, filterAction, filterEntityType, user?.id])

  const fetchLogs = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (filterAction !== 'all') params.append('action', filterAction)
      if (filterEntityType !== 'all') params.append('entityType', filterEntityType)
      params.append('limit', '200')

      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return logs
  }, [logs])

  const criticalActions = useMemo(() => {
    return filteredLogs.filter(log => 
      log.action.includes('delete') || 
      log.action.includes('change_quote_total') || 
      log.action.includes('change_quote_discount')
    )
  }, [filteredLogs])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const parseJsonValue = (value: string | null) => {
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  const resetToCurrentMonth = () => {
    const date = new Date()
    date.setDate(1)
    setFilterStartDate(date.toISOString().split('T')[0])
    setFilterEndDate(new Date().toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Auditoria do Sistema
          </h1>
          <p className="text-muted-foreground">
            Registro completo de todas as ações realizadas no sistema
          </p>
        </div>
      </div>

      {/* Alert para ações críticas */}
      {criticalActions.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-semibold text-foreground">
                  {criticalActions.length} ação(ões) crítica(s) detectada(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Exclusões e alterações de valores foram registradas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="quote">Orçamento</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetToCurrentMonth} className="w-full">
                Mês Atual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando logs...</div>
          </CardContent>
        </Card>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const ActionIcon = actionIcons[log.action] || Edit
            const isCritical = log.action.includes('delete') || 
                              log.action.includes('change_quote_total') || 
                              log.action.includes('change_quote_discount')
            
            const oldValue = parseJsonValue(log.oldValue)
            const newValue = parseJsonValue(log.newValue)

            return (
              <Card 
                key={log.id} 
                className={cn(
                  "border-border",
                  isCritical && "border-orange-500/30 bg-orange-500/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      actionColors[log.action] || "bg-muted"
                    )}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            actionColors[log.action] || "bg-muted"
                          )}
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.entityType === 'quote' ? 'Orçamento' : 'Despesa'}
                        </Badge>
                        {isCritical && (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                            Crítico
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium text-foreground mb-2">{log.description}</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        Por: <span className="font-medium">{log.user.name}</span> ({log.user.username})
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {log.ipAddress}
                        </p>
                      )}
                      
                      {/* Mostrar valores antigos e novos se houver */}
                      {(oldValue || newValue) && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {oldValue && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Valor anterior: </span>
                              <span className="font-mono text-red-500">
                                {typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : String(oldValue)}
                              </span>
                            </div>
                          )}
                          {newValue && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Valor novo: </span>
                              <span className="font-mono text-green-500">
                                {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum log encontrado
              </h3>
              <p className="text-muted-foreground">
                Nenhuma ação foi registrada no período selecionado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
