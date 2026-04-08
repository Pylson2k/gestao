'use client'

import { useEffect } from 'react'
import { APP_DISPLAY_NAME, APP_TITLE_SUFFIX } from '@/lib/app-constants'

export function DynamicTitle() {
  useEffect(() => {
    const updateTitle = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        
        if (data.name && data.name !== APP_DISPLAY_NAME) {
          document.title = `${data.name} - ${APP_TITLE_SUFFIX}`
          
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
    
    // Atualizar a cada 30 min (reduz tráfego Neon)
    const interval = setInterval(updateTitle, 30 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return null
}
