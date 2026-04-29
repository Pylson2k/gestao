'use client'

import { ArrowLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const hiddenRoutes = new Set([
  '/',
  '/login',
  '/reset',
  '/trabalhador/login',
])

export function AppReturnButton() {
  const pathname = usePathname()
  const router = useRouter()

  if (hiddenRoutes.has(pathname)) return null

  const handleReturn = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push('/dashboard')
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReturn}
      className={cn(
        'fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30',
        'h-11 rounded-xl border-border/80 bg-background/95 px-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'lg:right-5 lg:top-5'
      )}
      aria-label="Retornar para a página anterior"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Retornar</span>
    </Button>
  )
}
