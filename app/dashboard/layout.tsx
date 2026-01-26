'use client'

import React from "react"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { QuotesProvider } from '@/contexts/quotes-context'
import { CompanyProvider } from '@/contexts/company-context'
import { ExpensesProvider } from '@/contexts/expenses-context'
import { EmployeesProvider } from '@/contexts/employees-context'
import { ClientsProvider } from '@/contexts/clients-context'
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 pt-20 sm:pt-16 lg:pt-6">{children}</div>
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
          <EmployeesProvider>
            <ClientsProvider>
              <ServicesProvider>
                <CashClosingsProvider>
                  <PaymentsProvider>
                    <DashboardContent>{children}</DashboardContent>
                  </PaymentsProvider>
                </CashClosingsProvider>
              </ServicesProvider>
            </ClientsProvider>
          </EmployeesProvider>
        </ExpensesProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
