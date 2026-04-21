import { QuotesProvider } from '@/contexts/quotes-context'
import { ClientsProvider } from '@/contexts/clients-context'
import { ServicesProvider } from '@/contexts/services-context'
import { MaterialListsProvider } from '@/contexts/material-lists-context'
import { PaymentsProvider } from '@/contexts/payments-context'
import { CompanyProvider } from '@/contexts/company-context'

export default function OrcamentosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <QuotesProvider>
        <ClientsProvider>
          <ServicesProvider>
            <MaterialListsProvider>
              <PaymentsProvider>
                {children}
              </PaymentsProvider>
            </MaterialListsProvider>
          </ServicesProvider>
        </ClientsProvider>
      </QuotesProvider>
    </CompanyProvider>
  )
}
