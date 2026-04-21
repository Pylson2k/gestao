import { ClientsProvider } from '@/contexts/clients-context'
import { MaterialListsProvider } from '@/contexts/material-lists-context'
import { ServicesProvider } from '@/contexts/services-context'
import { EmployeesProvider } from '@/contexts/employees-context'
import { CashClosingsProvider } from '@/contexts/cash-closings-context'
import { CompanyProvider } from '@/contexts/company-context'

export default function OperacaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <ClientsProvider>
        <MaterialListsProvider>
          <ServicesProvider>
            <EmployeesProvider>
              <CashClosingsProvider>
                {children}
              </CashClosingsProvider>
            </EmployeesProvider>
          </ServicesProvider>
        </MaterialListsProvider>
      </ClientsProvider>
    </CompanyProvider>
  )
}
