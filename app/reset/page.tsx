'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, RefreshCw, Trash2, Shield } from 'lucide-react'

export default function ResetPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [resetType, setResetType] = useState<'passwords' | 'database' | null>(null)
  const [adminSecret, setAdminSecret] = useState('')

  const adminKeyQuery = () => {
    const key = adminSecret.trim()
    return key ? `?key=${encodeURIComponent(key)}` : ''
  }

  const handleResetPasswords = async () => {
    if (!adminSecret.trim()) {
      setResetType('passwords')
      setStatus('error')
      setMessage('Informe a chave administrativa (mesmo valor de ADMIN_OPERATIONS_SECRET no servidor).')
      return
    }
    setResetType('passwords')
    setStatus('loading')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/reset-passwords${adminKeyQuery()}`, {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage('Senha resetada! Usuário único: gustavo / gustavo123')
      } else {
        setStatus('error')
        setMessage(JSON.stringify(data, null, 2))
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
      setMessage('Informe a chave administrativa (mesmo valor de ADMIN_OPERATIONS_SECRET no servidor).')
      return
    }
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá DELETAR TODOS os dados do banco (orçamentos, despesas, clientes, funcionários, serviços, fechamentos e logs de auditoria), mantendo APENAS os usuários.\n\nEsta ação NÃO PODE ser desfeita!\n\nDeseja continuar?')) {
      return
    }

    if (!confirm('⚠️ CONFIRMAÇÃO FINAL: Você tem CERTEZA que deseja limpar todo o banco de dados?\n\nTodos os dados serão PERDIDOS permanentemente!\n\nClique em OK apenas se tiver CERTEZA ABSOLUTA.')) {
      return
    }

    setResetType('database')
    setStatus('loading')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/reset-database${adminKeyQuery()}`, {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        const deletedSummary = [
          `📋 ${data.deleted.auditLogs} logs de auditoria`,
          `💰 ${data.deleted.cashClosings} fechamentos`,
          `💸 ${data.deleted.expenses} despesas`,
          `🔧 ${data.deleted.services} serviços`,
          `👥 ${data.deleted.employees} funcionários`,
          `📄 ${data.deleted.quotes} orçamentos`,
          `👤 ${data.deleted.clients} clientes`,
          `⚙️ ${data.deleted.companySettings} configurações`,
        ].join('\n')
        setMessage(`✅ Banco limpo com sucesso!\n\n🗑️ Deletado:\n${deletedSummary}\n\n✅ Mantido: ${data.kept.users} usuário(s)`)
      } else {
        setStatus('error')
        setMessage(JSON.stringify(data, null, 2))
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erro de conexão: ' + String(error))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground">ServiPro Admin</span>
          </div>
          <p className="text-muted-foreground">Ferramentas administrativas do sistema</p>
        </div>

        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Chave administrativa</CardTitle>
            <CardDescription>
              Deve ser igual à variável <code className="text-xs bg-muted px-1 rounded">ADMIN_OPERATIONS_SECRET</code> no servidor (não fica salva nesta página).
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

        {/* Reset Senhas */}
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Resetar Senhas
            </CardTitle>
            <CardDescription>
              Redefine as senhas dos usuários para os valores padrão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleResetPasswords} 
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              {status === 'loading' && resetType === 'passwords' ? (
                <>Processando...</>
              ) : (
                <>Resetar Senhas</>
              )}
            </Button>
            {status === 'success' && resetType === 'passwords' && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                {message}
              </div>
            )}
            {status === 'error' && resetType === 'passwords' && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-mono whitespace-pre-wrap">
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Banco de Dados */}
        <Card className="border-2 border-red-200/50 bg-gradient-to-br from-red-50/50 via-white to-red-50/30 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Limpar Banco de Dados
            </CardTitle>
            <CardDescription className="text-red-700/80">
              ⚠️ Deleta TODOS os dados, mantendo apenas os usuários. Esta ação é IRREVERSÍVEL!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-100/50 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 space-y-1">
                  <p className="font-semibold">Será deletado:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Todos os orçamentos</li>
                    <li>Todas as despesas</li>
                    <li>Todos os clientes</li>
                    <li>Todos os funcionários</li>
                    <li>Todos os serviços</li>
                    <li>Todos os fechamentos de caixa</li>
                    <li>Todos os logs de auditoria</li>
                    <li>Todas as configurações da empresa</li>
                  </ul>
                  <p className="font-semibold mt-2">Será mantido:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Apenas os usuários</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleResetDatabase} 
              disabled={status === 'loading'}
              variant="destructive"
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg"
            >
              {status === 'loading' && resetType === 'database' ? (
                <>Limpando banco...</>
              ) : (
                <>⚠️ Limpar Banco de Dados</>
              )}
            </Button>
            {status === 'success' && resetType === 'database' && (
              <div className="p-4 rounded-lg bg-green-50 text-green-800 text-sm font-medium whitespace-pre-wrap border border-green-200">
                {message}
              </div>
            )}
            {status === 'error' && resetType === 'database' && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm font-mono whitespace-pre-wrap border border-red-200">
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
