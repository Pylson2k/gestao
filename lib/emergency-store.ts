// Armazenamento em memória para modo de emergência (sem banco de dados)
// Os dados são perdidos quando o servidor reinicia

export const emergencyStore = {
  quotes: [] as any[],
  company: null as any,
}

export function getMemoryQuotes() {
  return emergencyStore.quotes
}

export function addMemoryQuote(quote: any) {
  emergencyStore.quotes.unshift(quote)
}

export function updateMemoryQuote(id: string, data: any) {
  const index = emergencyStore.quotes.findIndex(q => q.id === id)
  if (index !== -1) {
    emergencyStore.quotes[index] = { ...emergencyStore.quotes[index], ...data }
    return emergencyStore.quotes[index]
  }
  return null
}

export function deleteMemoryQuote(id: string) {
  const index = emergencyStore.quotes.findIndex(q => q.id === id)
  if (index !== -1) {
    emergencyStore.quotes.splice(index, 1)
    return true
  }
  return false
}

export function getMemoryQuoteById(id: string) {
  return emergencyStore.quotes.find(q => q.id === id)
}

export function getCompanySettings() {
  return emergencyStore.company || {
    id: '1',
    name: 'Minha Empresa',
    phone: '(11) 99999-9999',
    email: 'contato@minhaempresa.com',
    address: 'Endereço da Empresa',
  }
}

export function updateCompanySettings(data: any) {
  emergencyStore.company = { ...getCompanySettings(), ...data }
  return emergencyStore.company
}
