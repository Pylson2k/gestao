'use client'

import { useEffect } from 'react'

export function DynamicTitle() {
  useEffect(() => {
    const updateTitle = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        
        if (data.name && data.name !== 'ServiPro') {
          document.title = `${data.name} - Gestão de Orçamentos`
          
          // Atualizar meta tags do PWA
          const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
          if (appleTitle) {
            appleTitle.setAttribute('content', data.name)
          }
        }
      } catch (error) {
        console.error('Error updating title:', error)
      }
    }

    updateTitle()
    
    // Atualizar periodicamente (a cada 2 minutos) para pegar mudanças
    const interval = setInterval(updateTitle, 2 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return null
}
