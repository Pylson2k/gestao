/**
 * Utilitários para exportação de dados
 */

// Helper para log de exportação
async function logExport(userId: string | null, type: string, count: number) {
  if (!userId) return
  try {
    await fetch('/api/audit/action', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        action: 'export_csv',
        entityType: 'export',
        entityId: `export-${type}-${Date.now()}`,
        description: `Exportação CSV de ${count} ${type}(s)`,
        newValue: { type, count },
      }),
    })
  } catch {}
}

export function exportToCSV(data: any[], filename: string, type?: string) {
  if (data.length === 0) {
    alert('Nenhum dado para exportar')
    return
  }

  // Obter cabeçalhos
  const headers = Object.keys(data[0])
  
  // Criar CSV
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escapar valores que contêm vírgulas ou aspas
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  
  // Criar blob e download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Log de exportação
  if (type) {
    const userId = sessionStorage.getItem('servipro_user') 
      ? JSON.parse(sessionStorage.getItem('servipro_user')!).id 
      : null
    logExport(userId, type, data.length)
  }
}

export function exportQuotesToCSV(quotes: any[]) {
  const data = quotes.map(quote => ({
    'Número': quote.number,
    'Cliente': quote.client.name,
    'Telefone': quote.client.phone,
    'Status': quote.status,
    'Subtotal': quote.subtotal.toFixed(2),
    'Desconto': quote.discount.toFixed(2),
    'Total': quote.total.toFixed(2),
    'Data de Criação': new Date(quote.createdAt).toLocaleDateString('pt-BR'),
    'Data de Finalização': quote.serviceCompletedAt 
      ? new Date(quote.serviceCompletedAt).toLocaleDateString('pt-BR')
      : '',
  }))
  
  exportToCSV(data, 'orcamentos', 'orçamento')
}

export function exportClientsToCSV(clients: any[]) {
  const data = clients.map(client => ({
    'Nome': client.name,
    'Telefone': client.phone,
    'Endereço': client.address,
    'Email': client.email || '',
    'Data de Cadastro': new Date(client.createdAt).toLocaleDateString('pt-BR'),
  }))
  
  exportToCSV(data, 'clientes', 'cliente')
}

export function exportExpensesToCSV(expenses: any[]) {
  const data = expenses.map(expense => ({
    'Categoria': expense.category,
    'Descrição': expense.description,
    'Valor': expense.amount.toFixed(2),
    'Data': new Date(expense.date).toLocaleDateString('pt-BR'),
    'Funcionário': expense.employee?.name || '',
    'Observações': expense.observations || '',
  }))
  
  exportToCSV(data, 'despesas', 'despesa')
}

export function exportEmployeesToCSV(employees: any[]) {
  const data = employees.map(employee => ({
    'Nome': employee.name,
    'CPF': employee.cpf || '',
    'Telefone': employee.phone || '',
    'Email': employee.email || '',
    'Cargo': employee.position || '',
    'Data de Admissão': employee.hireDate 
      ? new Date(employee.hireDate).toLocaleDateString('pt-BR')
      : '',
    'Status': employee.isActive ? 'Ativo' : 'Inativo',
  }))
  
  exportToCSV(data, 'funcionarios', 'funcionário')
}

export function exportServicesToCSV(services: any[]) {
  const data = services.map(service => ({
    'Nome': service.name,
    'Descrição': service.description || '',
    'Preço Unitário': service.unitPrice.toFixed(2),
    'Unidade': service.unit,
    'Status': service.isActive ? 'Ativo' : 'Inativo',
    'Data de Cadastro': new Date(service.createdAt).toLocaleDateString('pt-BR'),
  }))
  
  exportToCSV(data, 'servicos', 'serviço')
}
