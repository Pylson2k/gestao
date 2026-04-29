'use client'

import { ArrowLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LAST_ROUTE_KEY = 'sinai:last-route'
const PREVIOUS_ROUTE_KEY = 'sinai:previous-route'

const hiddenRoutes = new Set([
  '/',
  '/login',
  '/reset',
  '/trabalhador/login',
])

function getFallbackRoute(pathname: string): string {
  if (pathname.startsWith('/trabalhador')) return '/trabalhador'
  return '/dashboard'
}

export function AppReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname || hiddenRoutes.has(pathname)) return

    const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY)
    if (lastRoute && lastRoute !== pathname) {
      sessionStorage.setItem(PREVIOUS_ROUTE_KEY, lastRoute)
    }
    sessionStorage.setItem(LAST_ROUTE_KEY, pathname)
  }, [pathname])

  if (hiddenRoutes.has(pathname)) return null

  const handleReturn = () => {
    const previousRoute =
      typeof window !== 'undefined' ? sessionStorage.getItem(PREVIOUS_ROUTE_KEY) : null
    const fallbackRoute = getFallbackRoute(pathname)
    const targetRoute =
      previousRoute && previousRoute !== pathname && !hiddenRoutes.has(previousRoute)
        ? previousRoute
        : fallbackRoute

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PREVIOUS_ROUTE_KEY, pathname)
      sessionStorage.setItem(LAST_ROUTE_KEY, targetRoute)
    }

    if (targetRoute === pathname) {
      router.replace(fallbackRoute)
      return
    }

    router.push(targetRoute)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReturn}
      className={cn(
        'fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30',
        'h-11 rounded-xl border-border/80 bg-background/95 px-3 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-background/85',
        'lg:right-5 lg:top-5'
      )}
      aria-label="Retornar para a página anterior"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Retornar</span>
    </Button>
  )
}
