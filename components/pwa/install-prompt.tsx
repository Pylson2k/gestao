'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [companyName, setCompanyName] = useState(APP_DISPLAY_NAME)

  useEffect(() => {
    // Buscar nome da empresa
    const fetchCompanyName = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        if (data.name) {
          setCompanyName(data.name)
        }
      } catch (error) {
        console.error('Error fetching company name:', error)
      }
    }
    fetchCompanyName()

    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Verifica se está no mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    if (!isMobile) {
      return
    }

    // Escuta o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Verifica se já foi instalado anteriormente
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setShowPrompt(false)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Salva no localStorage para não mostrar novamente por um tempo
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Não mostra se já está instalado ou se foi dispensado recentemente
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const timeDiff = Date.now() - parseInt(dismissedTime)
    // Não mostra novamente por 7 dias
    if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
      return null
    }
  }

  return (
    <Card className="animate-in slide-in-from-bottom-5 fixed bottom-4 left-4 right-4 z-50 border border-border/80 shadow-lg md:left-auto md:right-4 md:w-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-foreground">
            Instalar {companyName}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Instale o {companyName} no seu celular para acesso rápido e funcionamento offline!
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            className="h-10 flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar Agora
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="rounded-xl"
          >
            Depois
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
