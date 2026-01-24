'use client'

import React from "react"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Zap, Loader2, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, isAuthenticated, mustChangePassword, changePassword, isLoading, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    // If user doesn't need to change password, redirect to dashboard
    if (!mustChangePassword) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, mustChangePassword, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas nao conferem')
      return
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    const result = await changePassword(currentPassword, newPassword)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } else {
      setError(result.error || 'Erro ao alterar senha')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!isAuthenticated || !mustChangePassword) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">ServiPro</span>
        </div>

        <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alteracao de Senha Obrigatoria</AlertTitle>
          <AlertDescription>
            Sua senha temporaria expirou. Por motivos de seguranca, voce deve criar uma nova senha antes de acessar o sistema.
          </AlertDescription>
        </Alert>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Criar Nova Senha</CardTitle>
            <CardDescription>
              Ola, {user?.name}! Defina uma nova senha segura para sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="py-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/20">
                    <CheckCircle2 className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Senha Alterada com Sucesso!</h3>
                <p className="text-sm text-muted-foreground">Redirecionando para o sistema...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual (Temporaria)</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Digite sua senha temporaria"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-background"
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background"
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      'Alterar Senha'
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={handleLogout}
                  >
                    Sair e voltar ao login
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Escolha uma senha forte que voce nao tenha usado em outros sites.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
