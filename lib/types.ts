export interface User {
  id: string
  email: string
  name: string
  phone?: string
  company?: string
}

export interface Client {
  id: string
  name: string
  phone: string
  address: string
  email?: string
}

export interface ServiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface MaterialItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface Quote {
  id: string
  number: string
  client: Client
  services: ServiceItem[]
  materials: MaterialItem[]
  subtotal: number
  discount: number
  total: number
  observations?: string
  createdAt: Date
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  serviceStartedAt?: Date
  serviceCompletedAt?: Date
  userId: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface CompanySettings {
  name: string
  logo?: string // Base64 ou URL da imagem
  phone: string
  email: string
  address: string
  cnpj?: string
  website?: string
  additionalInfo?: string
}

export type ExpenseCategory = 
  | 'material' 
  | 'combustivel' 
  | 'almoco'
  | 'almoco_funcionario'
  | 'vale_funcionario' 
  | 'pagamento_funcionario' 
  | 'vale_gustavo' 
  | 'vale_giovanni'

export interface Employee {
  id: string
  userId: string
  name: string
  cpf?: string | null
  phone?: string | null
  email?: string | null
  position?: string | null
  hireDate?: string | Date | null
  isActive: boolean
  observations?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Service {
  id: string
  userId: string
  name: string
  description?: string | null
  unitPrice: number
  unit: string
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Expense {
  id: string
  userId: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string | Date
  observations?: string | null
  employeeId?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export type PeriodType = 'semanal' | 'quinzenal' | 'mensal'

export interface CashClosing {
  id: string
  userId: string
  periodType: PeriodType
  startDate: string | Date
  endDate: string | Date
  totalProfit: number
  gustavoProfit: number
  giovanniProfit: number
  totalRevenue: number
  totalExpenses: number
  observations?: string | null
  createdAt: string | Date
}
