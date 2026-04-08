'use client'

import { useEffect } from 'react'

/** Registra o service worker uma vez por montagem (evita efeitos colaterais durante o render). */
export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let intervalId: ReturnType<typeof setInterval> | undefined

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope)
        intervalId = setInterval(() => {
          registration.update()
        }, 60_000)
      })
      .catch((error) => {
        console.log('❌ Erro ao registrar Service Worker:', error)
      })

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null
}
