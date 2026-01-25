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
