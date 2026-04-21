import { ExpensesProvider } from '@/contexts/expenses-context'
import { ClientsProvider } from '@/contexts/clients-context'
import { EmployeesProvider } from '@/contexts/employees-context'
import { PaymentsProvider } from '@/contexts/payments-context'
import { QuotesProvider } from '@/contexts/quotes-context'
import { CompanyProvider } from '@/contexts/company-context'

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <QuotesProvider>
        <ClientsProvider>
          <EmployeesProvider>
            <ExpensesProvider>
              <PaymentsProvider>
                {children}
              </PaymentsProvider>
            </ExpensesProvider>
          </EmployeesProvider>
        </ClientsProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
