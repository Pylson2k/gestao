import { ExpensesProvider } from '@/contexts/expenses-context'
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
        <ExpensesProvider>
          <PaymentsProvider>
            {children}
          </PaymentsProvider>
        </ExpensesProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
