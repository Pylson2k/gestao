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
import { Shield, Calendar, Filter, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Plus, User } from 'lucide-react'
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
  // Orçamentos
  create_quote: 'Criar Orçamento',
  update_quote: 'Atualizar Orçamento',
  delete_quote: 'Excluir Orçamento',
  change_quote_status: 'Alterar Status',
  change_quote_discount: 'Alterar Desconto',
  change_quote_total: 'Alterar Total',
  view_quote: 'Visualizar Orçamento',
  download_quote_pdf: 'Baixar PDF',
  send_quote_whatsapp: 'Enviar WhatsApp',
  // Despesas
  create_expense: 'Criar Despesa',
  update_expense: 'Atualizar Despesa',
  delete_expense: 'Excluir Despesa',
  // Clientes
  create_client: 'Cadastrar Cliente',
  update_client: 'Atualizar Cliente',
  delete_client: 'Excluir Cliente',
  view_client: 'Visualizar Cliente',
  // Funcionários
  create_employee: 'Cadastrar Funcionário',
  update_employee: 'Atualizar Funcionário',
  delete_employee: 'Excluir Funcionário',
  view_employee: 'Visualizar Funcionário',
  // Serviços
  create_service: 'Cadastrar Serviço',
  update_service: 'Atualizar Serviço',
  delete_service: 'Excluir Serviço',
  // Fechamentos
  create_cash_closing: 'Fechamento de Caixa',
  view_cash_closing: 'Visualizar Fechamento',
  // Configurações
  update_company_settings: 'Atualizar Configurações',
  update_profile: 'Atualizar Perfil',
  change_password: 'Alterar Senha',
  change_email: 'Alterar Email',
  // Autenticação
  user_login: 'Login',
  user_logout: 'Logout',
  failed_login: 'Tentativa de Login Falhada',
  // Exportações
  export_csv: 'Exportar CSV',
  export_pdf: 'Exportar PDF',
}

const actionColors: Record<string, string> = {
  // Orçamentos
  create_quote: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_quote: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_quote: 'bg-red-500/10 text-red-500 border-red-500/20',
  change_quote_status: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  change_quote_discount: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  change_quote_total: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  view_quote: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  download_quote_pdf: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  send_quote_whatsapp: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  // Despesas
  create_expense: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_expense: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_expense: 'bg-red-500/10 text-red-500 border-red-500/20',
  // Clientes
  create_client: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_client: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_client: 'bg-red-500/10 text-red-500 border-red-500/20',
  view_client: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  // Funcionários
  create_employee: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_employee: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_employee: 'bg-red-500/10 text-red-500 border-red-500/20',
  view_employee: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  // Serviços
  create_service: 'bg-green-500/10 text-green-500 border-green-500/20',
  update_service: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete_service: 'bg-red-500/10 text-red-500 border-red-500/20',
  // Fechamentos
  create_cash_closing: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  view_cash_closing: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  // Configurações
  update_company_settings: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  update_profile: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  change_password: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  change_email: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  // Autenticação
  user_login: 'bg-green-500/10 text-green-500 border-green-500/20',
  user_logout: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  failed_login: 'bg-red-500/10 text-red-500 border-red-500/20',
  // Exportações
  export_csv: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  export_pdf: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
}

const actionIcons: Record<string, any> = {
  // Orçamentos
  create_quote: Plus,
  update_quote: Edit,
  delete_quote: Trash2,
  change_quote_status: AlertTriangle,
  change_quote_discount: AlertTriangle,
  change_quote_total: AlertTriangle,
  view_quote: CheckCircle,
  download_quote_pdf: CheckCircle,
  send_quote_whatsapp: CheckCircle,
  // Despesas
  create_expense: Plus,
  update_expense: Edit,
  delete_expense: Trash2,
  // Clientes
  create_client: Plus,
  update_client: Edit,
  delete_client: Trash2,
  view_client: CheckCircle,
  // Funcionários
  create_employee: Plus,
  update_employee: Edit,
  delete_employee: Trash2,
  view_employee: CheckCircle,
  // Serviços
  create_service: Plus,
  update_service: Edit,
  delete_service: Trash2,
  // Fechamentos
  create_cash_closing: CheckCircle,
  view_cash_closing: CheckCircle,
  // Configurações
  update_company_settings: Edit,
  update_profile: Edit,
  change_password: Edit,
  change_email: Edit,
  // Autenticação
  user_login: CheckCircle,
  user_logout: XCircle,
  failed_login: XCircle,
  // Exportações
  export_csv: CheckCircle,
  export_pdf: CheckCircle,
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
    return filteredLogs.filter(log => {
      const isDelete = log.action.includes('delete')
      const isQuoteValueChange = log.action.includes('change_quote_total') || log.action.includes('change_quote_discount')
      const isCashClosing = log.action.includes('create_cash_closing')
      const isFailedLogin = log.action.includes('failed_login')
      const isVale = log.description?.includes('VALE') || log.description?.includes('vale')
      
      return isDelete || isQuoteValueChange || isCashClosing || isFailedLogin || isVale
    })
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2 mb-2">
            <Shield className="w-7 h-7 text-primary" />
            Auditoria do Sistema
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Registro completo de todas as ações realizadas no sistema
          </p>
        </div>
      </div>

      {/* Alert para ações críticas */}
      {criticalActions.length > 0 && (
        <Card className="border-2 border-orange-300/50 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-lg mb-1">
                  {criticalActions.length} ação(ões) crítica(s) detectada(s)
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Exclusões, alterações de valores, fechamentos de caixa, vales e tentativas de login falhadas foram registradas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
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
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="cash_closing">Fechamento de Caixa</SelectItem>
                  <SelectItem value="company_settings">Configurações</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="export">Exportação</SelectItem>
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
            const isVale = log.description?.includes('VALE') || log.description?.includes('vale')
            const isCritical = log.action.includes('delete') || 
                              log.action.includes('change_quote_total') || 
                              log.action.includes('change_quote_discount') ||
                              log.action.includes('create_cash_closing') ||
                              log.action.includes('failed_login') ||
                              isVale
            
            const oldValue = parseJsonValue(log.oldValue)
            const newValue = parseJsonValue(log.newValue)

            return (
              <Card 
                key={log.id} 
                className={cn(
                  "border-border/50 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300",
                  isCritical && "border-2 border-orange-300/50 bg-gradient-to-r from-orange-50/50 via-white to-orange-50/30"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl shadow-sm",
                      actionColors[log.action] || "bg-muted"
                    )}>
                      <ActionIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header com usuário destacado */}
                      <div className="flex items-start justify-between mb-3 pb-3 border-b border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                            <User className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground font-medium">Realizado por</span>
                              <span className="text-sm font-bold text-foreground">{log.user.name}</span>
                              <span className="text-xs text-muted-foreground">@{log.user.username}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-medium">{formatDate(log.createdAt)}</span>
                        </div>
                      </div>

                      {/* Badges de ação e tipo */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1",
                            actionColors[log.action] || "bg-muted"
                          )}
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                          {log.entityType === 'quote' ? 'Orçamento' : 
                           log.entityType === 'expense' ? 'Despesa' :
                           log.entityType === 'client' ? 'Cliente' :
                           log.entityType === 'employee' ? 'Funcionário' :
                           log.entityType === 'service' ? 'Serviço' :
                           log.entityType === 'cash_closing' ? 'Fechamento' :
                           log.entityType === 'company_settings' ? 'Configurações' :
                           log.entityType === 'user' ? 'Usuário' :
                           log.entityType === 'export' ? 'Exportação' :
                           log.entityType}
                        </Badge>
                        {isCritical && (
                          <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 border-2 border-orange-500 text-orange-600 bg-orange-50">
                            ⚠️ Crítico
                          </Badge>
                        )}
                      </div>

                      {/* Descrição da ação */}
                      <p className="font-semibold text-foreground mb-3 text-base leading-relaxed">{log.description}</p>
                      
                      {/* Informações adicionais (IP) */}
                      {log.ipAddress && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-2 py-1 bg-muted/30 rounded-md inline-block">
                          <span className="font-medium">IP:</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </div>
                      )}
                      
                      {/* Mostrar valores antigos e novos se houver */}
                      {(oldValue || newValue) && (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-3 bg-muted/30 p-3 rounded-lg">
                          {oldValue && (
                            <div className="text-xs">
                              <span className="text-muted-foreground font-medium">Valor anterior: </span>
                              <pre className="font-mono text-red-600 text-xs mt-1 bg-red-50 p-2 rounded overflow-x-auto">
                                {typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : String(oldValue)}
                              </pre>
                            </div>
                          )}
                          {newValue && (
                            <div className="text-xs">
                              <span className="text-muted-foreground font-medium">Valor novo: </span>
                              <pre className="font-mono text-green-600 text-xs mt-1 bg-green-50 p-2 rounded overflow-x-auto">
                                {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue)}
                              </pre>
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
