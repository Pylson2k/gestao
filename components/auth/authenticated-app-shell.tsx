'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { QuotesProvider } from '@/contexts/quotes-context'
import { CompanyProvider } from '@/contexts/company-context'
import { ExpensesProvider } from '@/contexts/expenses-context'
import { ClientsProvider } from '@/contexts/clients-context'
import { MaterialListsProvider } from '@/contexts/material-lists-context'
import { ServicesProvider } from '@/contexts/services-context'
import { CashClosingsProvider } from '@/contexts/cash-closings-context'
import { PaymentsProvider } from '@/contexts/payments-context'
import { Sidebar } from '@/components/dashboard/sidebar'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
      return
    }
    if (
      !isLoading &&
      isAuthenticated &&
      user?.mustChangePassword &&
      pathname !== '/dashboard/perfil'
    ) {
      router.replace('/dashboard/perfil?force=1')
    }
  }, [isAuthenticated, isLoading, router, user?.mustChangePassword, pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-primary/15" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (user?.mustChangePassword && pathname !== '/dashboard/perfil') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecionando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <main className="min-h-dvh lg:pl-[var(--sidebar-width)]">
        <div className="app-shell-pad app-page py-5 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:py-7 sm:pt-[calc(4.75rem+env(safe-area-inset-top))] lg:py-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}

/** Providers + sidebar + gate de auth — use em todas as áreas do gestor. */
export function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <QuotesProvider>
        <ExpensesProvider>
          <ClientsProvider>
            <MaterialListsProvider>
              <ServicesProvider>
                <CashClosingsProvider>
                  <PaymentsProvider>
                    <AuthGate>{children}</AuthGate>
                  </PaymentsProvider>
                </CashClosingsProvider>
              </ServicesProvider>
            </MaterialListsProvider>
          </ClientsProvider>
        </ExpensesProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
