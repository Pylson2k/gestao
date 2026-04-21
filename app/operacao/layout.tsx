import { ClientsProvider } from '@/contexts/clients-context'
import { MaterialListsProvider } from '@/contexts/material-lists-context'
import { ServicesProvider } from '@/contexts/services-context'
import { EmployeesProvider } from '@/contexts/employees-context'
import { CashClosingsProvider } from '@/contexts/cash-closings-context'
import { CompanyProvider } from '@/contexts/company-context'
import { QuotesProvider } from '@/contexts/quotes-context'
import { PaymentsProvider } from '@/contexts/payments-context'
import { ExpensesProvider } from '@/contexts/expenses-context'

export default function OperacaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <QuotesProvider>
        <PaymentsProvider>
          <ExpensesProvider>
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
          </ExpensesProvider>
        </PaymentsProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
