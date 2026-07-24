'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { AlertTriangle, RefreshCw, Trash2, Shield } from 'lucide-react'

export default function ResetPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetType, setResetType] = useState<'passwords' | 'database' | null>(null)
  const [adminSecret, setAdminSecret] = useState('')

  const adminHeaders = (): HeadersInit => ({
    'x-admin-secret': adminSecret.trim(),
  })

  const handleResetPasswords = async () => {
    if (!adminSecret.trim()) {
      setResetType('passwords')
      setStatus('error')
      setMessage('Informe a chave administrativa (ADMIN_OPERATIONS_SECRET).')
      return
    }
    setResetType('passwords')
    setStatus('loading')
    setMessage('')
    setTempPassword(null)
    try {
      const response = await fetch('/api/admin/reset-passwords', {
        method: 'POST',
        headers: adminHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setTempPassword(typeof data.temporaryPassword === 'string' ? data.temporaryPassword : null)
        setMessage(
          data.message ||
            'Senha redefinida. Use a senha temporária abaixo e altere no primeiro login.'
        )
      } else {
        setStatus('error')
        setMessage(data.error || 'Falha ao resetar senha')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erro de conexão: ' + String(error))
    }
  }

  const handleResetDatabase = async () => {
    if (!adminSecret.trim()) {
      setResetType('database')
      setStatus('error')
      setMessage('Informe a chave administrativa (ADMIN_OPERATIONS_SECRET).')
      return
    }
    if (
      !confirm(
        'ATENÇÃO: Esta ação irá DELETAR TODOS os dados do banco, mantendo APENAS o usuário. Não pode ser desfeita. Continuar?'
      )
    ) {
      return
    }
    if (!confirm('CONFIRMAÇÃO FINAL: tem certeza absoluta?')) {
      return
    }

    setResetType('database')
    setStatus('loading')
    setMessage('')
    try {
      const response = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: adminHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        const deletedSummary = [
          `${data.deleted.auditLogs} logs de auditoria`,
          `${data.deleted.cashClosings} fechamentos`,
          `${data.deleted.expenses} despesas`,
          `${data.deleted.services} serviços`,
          `${data.deleted.employees} funcionários`,
          `${data.deleted.quotes} orçamentos`,
          `${data.deleted.materialLists ?? 0} listas de materiais`,
          `${data.deleted.clients} clientes`,
          `${data.deleted.companySettings} configurações`,
        ].join('\n')
        setMessage(`Banco limpo.\n\nDeletado:\n${deletedSummary}\n\nMantido: ${data.kept.users} usuário(s)`)
      } else {
        setStatus('error')
        setMessage(data.error || 'Falha ao limpar banco')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erro de conexão: ' + String(error))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-7 w-7" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {APP_DISPLAY_NAME} — Admin
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Ferramentas administrativas do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chave administrativa</CardTitle>
            <CardDescription>
              Deve ser igual a <code className="text-xs bg-muted px-1 rounded">ADMIN_OPERATIONS_SECRET</code> no
              servidor. Enviada no header (não na URL).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="admin-secret">Segredo</Label>
            <Input
              id="admin-secret"
              type="password"
              autoComplete="off"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Cole o segredo configurado no .env / Vercel"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Resetar Senha
            </CardTitle>
            <CardDescription>
              Gera uma senha temporária aleatória e exige troca no próximo login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleResetPasswords} disabled={status === 'loading'} className="h-11 w-full">
              {status === 'loading' && resetType === 'passwords' ? 'Processando...' : 'Resetar Senha'}
            </Button>
            {status === 'success' && resetType === 'passwords' && (
              <div className="space-y-2 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
                <p className="font-medium">{message}</p>
                {tempPassword && (
                  <p className="font-mono text-base break-all bg-white/80 border rounded px-2 py-1">
                    {tempPassword}
                  </p>
                )}
              </div>
            )}
            {status === 'error' && resetType === 'passwords' && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm whitespace-pre-wrap">{message}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
              <Trash2 className="w-5 h-5" />
              Limpar Banco de Dados
            </CardTitle>
            <CardDescription className="text-red-700/80">
              Deleta TODOS os dados, mantendo apenas o usuário. Irreversível.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-100/50 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 space-y-1">
                  <p className="font-semibold">Será deletado:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Orçamentos, clientes, despesas, pagamentos</li>
                    <li>Listas de materiais, serviços, GETAO</li>
                    <li>Fechamentos e logs de auditoria</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button
              onClick={handleResetDatabase}
              disabled={status === 'loading'}
              variant="destructive"
              className="h-11 w-full"
            >
              {status === 'loading' && resetType === 'database' ? 'Limpando banco...' : 'Limpar Banco de Dados'}
            </Button>
            {status === 'success' && resetType === 'database' && (
              <div className="p-4 rounded-lg bg-green-50 text-green-800 text-sm font-medium whitespace-pre-wrap border border-green-200">
                {message}
              </div>
            )}
            {status === 'error' && resetType === 'database' && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm whitespace-pre-wrap border border-red-200">
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
