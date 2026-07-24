'use client'

import { usePathname } from 'next/navigation'
import { AuthenticatedAppShell } from '@/components/auth/authenticated-app-shell'

function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login' || pathname === '/reset') return true
  if (pathname.startsWith('/trabalhador')) return true
  return false
}

/** Shell autenticado único — evita remount de providers entre /dashboard, /financeiro, etc. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isPublicPath(pathname)) {
    return <>{children}</>
  }
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}
