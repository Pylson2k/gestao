'use client'

import React from "react"
import { QuotesProvider } from '@/contexts/quotes-context'
import { CompanyProvider } from '@/contexts/company-context'
import { Sidebar } from '@/components/dashboard/sidebar'

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-6 pt-16 lg:pt-6">{children}</div>
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
        <DashboardContent>{children}</DashboardContent>
      </QuotesProvider>
    </CompanyProvider>
  )
}
