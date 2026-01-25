'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleReset = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/admin/reset-passwords?key=sinai2026reset', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage('Senhas resetadas! Use: gustavo / gustavo123')
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset de Senhas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <Button onClick={handleReset} className="w-full">
              Resetar Senhas
            </Button>
          )}
          
          {status === 'loading' && (
            <p className="text-center">Resetando...</p>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 text-green-800 rounded-md">
                <p className="font-bold">✓ {message}</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-md">
                <p><strong>Usuário:</strong> gustavo</p>
                <p><strong>Senha:</strong> gustavo123</p>
              </div>
              <a href="/login">
                <Button className="w-full">Ir para Login</Button>
              </a>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-100 text-red-800 rounded-md text-sm">
                <p className="font-bold mb-2">Erro:</p>
                <pre className="whitespace-pre-wrap break-words">{message}</pre>
              </div>
              <Button onClick={handleReset} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
