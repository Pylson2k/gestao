import { EmployeesProvider } from '@/contexts/employees-context'
import { ExpensesProvider } from '@/contexts/expenses-context'
import { CompanyProvider } from '@/contexts/company-context'

export default function FuncionariosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <EmployeesProvider>
        <ExpensesProvider>
          {children}
        </ExpensesProvider>
      </EmployeesProvider>
    </CompanyProvider>
  )
}
