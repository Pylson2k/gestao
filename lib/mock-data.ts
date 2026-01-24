import type { Quote, User } from './types'

export const mockUser: User = {
  id: '1',
  email: 'joao@servico.com',
  name: 'Joao Silva',
  phone: '(11) 99999-9999',
  company: 'JS Servicos Eletricos',
}

export const mockQuotes: Quote[] = [
  {
    id: '1',
    number: 'ORC-2024-001',
    client: {
      id: 'c1',
      name: 'Maria Oliveira',
      phone: '(11) 98888-8888',
      address: 'Rua das Flores, 123 - Sao Paulo, SP',
    },
    services: [
      { id: 's1', name: 'Instalacao de tomadas', quantity: 5, unitPrice: 80 },
      { id: 's2', name: 'Troca de disjuntor', quantity: 2, unitPrice: 120 },
    ],
    materials: [
      { id: 'm1', name: 'Tomada 20A', quantity: 5, unitPrice: 25 },
      { id: 'm2', name: 'Disjuntor 32A', quantity: 2, unitPrice: 45 },
    ],
    subtotal: 855,
    discount: 55,
    total: 800,
    observations: 'Servico com garantia de 90 dias.',
    createdAt: new Date('2024-01-15'),
    status: 'approved',
    userId: '1',
  },
  {
    id: '2',
    number: 'ORC-2024-002',
    client: {
      id: 'c2',
      name: 'Carlos Santos',
      phone: '(11) 97777-7777',
      address: 'Av. Brasil, 456 - Sao Paulo, SP',
    },
    services: [
      { id: 's3', name: 'Instalacao de luminarias', quantity: 8, unitPrice: 60 },
      { id: 's4', name: 'Passagem de fiacao', quantity: 1, unitPrice: 350 },
    ],
    materials: [
      { id: 'm3', name: 'Luminaria LED', quantity: 8, unitPrice: 89 },
      { id: 'm4', name: 'Cabo flexivel 2.5mm (m)', quantity: 50, unitPrice: 3 },
    ],
    subtotal: 1542,
    discount: 0,
    total: 1542,
    observations: 'Material incluso no valor.',
    createdAt: new Date('2024-01-18'),
    status: 'sent',
    userId: '1',
  },
  {
    id: '3',
    number: 'ORC-2024-003',
    client: {
      id: 'c3',
      name: 'Ana Costa',
      phone: '(11) 96666-6666',
      address: 'Rua Consolacao, 789 - Sao Paulo, SP',
    },
    services: [
      { id: 's5', name: 'Reparo em quadro eletrico', quantity: 1, unitPrice: 450 },
    ],
    materials: [
      { id: 'm5', name: 'Disjuntor DR', quantity: 1, unitPrice: 180 },
      { id: 'm6', name: 'Barramento', quantity: 1, unitPrice: 65 },
    ],
    subtotal: 695,
    discount: 45,
    total: 650,
    createdAt: new Date('2024-01-20'),
    status: 'draft',
    userId: '1',
  },
  {
    id: '4',
    number: 'ORC-2024-004',
    client: {
      id: 'c4',
      name: 'Roberto Lima',
      phone: '(11) 95555-5555',
      address: 'Rua Augusta, 1000 - Sao Paulo, SP',
    },
    services: [
      { id: 's6', name: 'Automacao de iluminacao', quantity: 1, unitPrice: 1200 },
      { id: 's7', name: 'Instalacao de interruptores inteligentes', quantity: 6, unitPrice: 150 },
    ],
    materials: [
      { id: 'm7', name: 'Interruptor inteligente WiFi', quantity: 6, unitPrice: 189 },
      { id: 'm8', name: 'Hub de automacao', quantity: 1, unitPrice: 350 },
    ],
    subtotal: 3384,
    discount: 184,
    total: 3200,
    observations: 'Inclui configuracao do aplicativo.',
    createdAt: new Date('2024-01-22'),
    status: 'approved',
    userId: '1',
  },
]

export function generateQuoteNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ORC-${year}-${random}`
}

export function calculateMonthlyRevenue(quotes: Quote[]): number {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return quotes
    .filter((quote) => {
      const quoteDate = new Date(quote.createdAt)
      return (
        quote.status === 'approved' &&
        quoteDate.getMonth() === currentMonth &&
        quoteDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, quote) => sum + quote.total, 0)
}
