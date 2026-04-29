'use client'

import { ArrowLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ROUTE_STACK_KEY = 'sinai:route-stack'
const MAX_ROUTE_STACK = 20

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

function readRouteStack(): string[] {
  try {
    const raw = sessionStorage.getItem(ROUTE_STACK_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeRouteStack(stack: string[]) {
  sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack.slice(-MAX_ROUTE_STACK)))
}

export function AppReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname || hiddenRoutes.has(pathname)) return

    const stack = readRouteStack()
    const lastRoute = stack.at(-1)

    if (lastRoute === pathname) return

    writeRouteStack([...stack, pathname])
  }, [pathname])

  if (hiddenRoutes.has(pathname)) return null

  const handleReturn = () => {
    const fallbackRoute = getFallbackRoute(pathname)
    const stack = readRouteStack()

    while (stack.length > 0 && stack.at(-1) === pathname) {
      stack.pop()
    }

    let targetRoute = stack.pop()
    while (targetRoute && (targetRoute === pathname || hiddenRoutes.has(targetRoute))) {
      targetRoute = stack.pop()
    }

    if (!targetRoute) {
      targetRoute = fallbackRoute
    }

    writeRouteStack(targetRoute === pathname ? stack : [...stack, targetRoute])

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
