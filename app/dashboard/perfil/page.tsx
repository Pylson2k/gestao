'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react'

export default function PerfilPage() {
  const { user, changePassword, updateEmail } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Atualizar email quando o usuário mudar
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user?.email])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMessage(null)

    if (!email) {
      setEmailMessage({ type: 'error', text: 'Email e obrigatorio' })
      return
    }

    if (email === user?.email) {
      setEmailMessage({ type: 'error', text: 'O email deve ser diferente do atual' })
      return
    }

    setIsEmailLoading(true)

    try {
      const result = await updateEmail(email)
      
      if (result.success) {
        setEmailMessage({ type: 'success', text: 'Email alterado com sucesso!' })
      } else {
        setEmailMessage({ type: 'error', text: result.error || 'Erro ao alterar email' })
        // Restaurar email original em caso de erro
        setEmail(user?.email || '')
      }
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Erro ao alterar email. Tente novamente.' })
      setEmail(user?.email || '')
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas nao coincidem' })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'A nova senha deve ser diferente da senha atual' })
      return
    }

    setIsLoading(true)

    try {
      const result = await changePassword(currentPassword, newPassword)
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao alterar senha' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar senha. Tente novamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informacoes pessoais e seguranca</p>
      </div>

      {/* Informações do Usuário */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Informacoes do Usuario</CardTitle>
          <CardDescription>Suas informacoes de conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={user?.name || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  disabled={isEmailLoading}
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <Label>Usuario</Label>
                <Input value={user?.username || ''} disabled className="mt-1" />
              </div>
            </div>

            {emailMessage && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                  emailMessage.type === 'success'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {emailMessage.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{emailMessage.text}</span>
              </div>
            )}

            {email !== user?.email && (
              <Button type="submit" disabled={isEmailLoading} className="w-full sm:w-auto">
                {isEmailLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Email'
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <CardTitle>Alterar Senha</CardTitle>
          </div>
          <CardDescription>Altere sua senha para manter sua conta segura</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Digite sua nova senha (minimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                  message.type === 'success'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
