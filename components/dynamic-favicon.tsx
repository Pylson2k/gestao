'use client'

import { useEffect } from 'react'

export function DynamicFavicon() {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        
        if (data.logo) {
          // Remover favicons antigos (exceto os que já são dinâmicos)
          const oldFavicons = document.querySelectorAll("link[rel~='icon']")
          oldFavicons.forEach(element => {
            const link = element as HTMLLinkElement
            // Não remover se for o favicon dinâmico que acabamos de criar
            if (!link.href.includes('api/company/favicon')) {
              link.remove()
            }
          })
          
          const oldAppleIcons = document.querySelectorAll("link[rel~='apple-touch-icon']")
          oldAppleIcons.forEach(element => {
            const link = element as HTMLLinkElement
            if (!link.href.includes('api/company/pwa-icon')) {
              link.remove()
            }
          })

          // Criar/atualizar favicon dinâmico
          let link = document.querySelector("link[rel='icon']") as HTMLLinkElement
          if (!link) {
            link = document.createElement('link')
            document.getElementsByTagName('head')[0].appendChild(link)
          }
          link.rel = 'icon'
          link.type = 'image/png'
          link.href = data.logo

          // Criar/atualizar apple-touch-icon dinâmico
          let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement
          if (!appleLink) {
            appleLink = document.createElement('link')
            document.getElementsByTagName('head')[0].appendChild(appleLink)
          }
          appleLink.rel = 'apple-touch-icon'
          appleLink.href = data.logo

          // Título será atualizado pelo DynamicTitle component
        }
      } catch (error) {
        console.error('Error updating favicon:', error)
      }
    }

    updateFavicon()
    
    // Atualizar periodicamente (a cada 2 minutos) para pegar mudanças
    const interval = setInterval(updateFavicon, 2 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return null
}
