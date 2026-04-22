'use client'

import React from "react"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <main className="min-h-dvh lg:pl-[var(--sidebar-width)]">
        <div
          className="app-shell-pad app-page py-5 pt-[calc(4.25rem+env(safe-area-inset-top))] sm:py-6 sm:pt-[calc(4.5rem+env(safe-area-inset-top))] lg:py-8 lg:pt-8"
        >
          {children}
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <QuotesProvider>
        <ExpensesProvider>
          <ClientsProvider>
            <MaterialListsProvider>
              <ServicesProvider>
                <CashClosingsProvider>
                  <PaymentsProvider>
                    <DashboardContent>{children}</DashboardContent>
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
