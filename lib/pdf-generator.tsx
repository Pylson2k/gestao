import type { Quote, User } from './types'

export function generateQuotePDF(quote: Quote, user: User | null) {
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const servicesTotal = quote.services.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const materialsTotal = quote.materials.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const servicesRows = quote.services
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  const materialsRows = quote.materials
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Orcamento ${quote.number}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1f2937;
          line-height: 1.5;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }
        .quote-info {
          text-align: right;
        }
        .quote-number {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .quote-date {
          color: #6b7280;
          font-size: 14px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .client-info p {
          margin: 4px 0;
          color: #4b5563;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th {
          background-color: #f3f4f6;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) {
          text-align: right;
        }
        th:nth-child(2) {
          text-align: center;
        }
        .subtotal-row {
          background-color: #f9fafb;
        }
        .summary {
          margin-top: 30px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .summary-row.total {
          border-top: 2px solid #e5e7eb;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: 700;
          color: #3b82f6;
        }
        .observations {
          background-color: #fffbeb;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }
        .observations p {
          margin: 0;
          color: #92400e;
          font-size: 14px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">${user?.company || 'ServiPro'}</div>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${user?.name || ''}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${user?.phone || ''}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${user?.email || ''}</p>
        </div>
        <div class="quote-info">
          <div class="quote-number">${quote.number}</div>
          <div class="quote-date">${formattedDate}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Dados do Cliente</div>
        <div class="client-info">
          <p><strong>${quote.client.name}</strong></p>
          <p>${quote.client.phone}</p>
          <p>${quote.client.address}</p>
        </div>
      </div>

      ${
        quote.services.length > 0
          ? `
      <div class="section">
        <div class="section-title">Servicos</div>
        <table>
          <thead>
            <tr>
              <th>Descricao</th>
              <th>Qtd</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${servicesRows}
            <tr class="subtotal-row">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 600;">Subtotal Servicos:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatCurrency(servicesTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      ${
        quote.materials.length > 0
          ? `
      <div class="section">
        <div class="section-title">Materiais</div>
        <table>
          <thead>
            <tr>
              <th>Descricao</th>
              <th>Qtd</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
            <tr class="subtotal-row">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 600;">Subtotal Materiais:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatCurrency(materialsTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      <div class="summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatCurrency(quote.subtotal)}</span>
        </div>
        ${
          quote.discount > 0
            ? `
        <div class="summary-row">
          <span>Desconto</span>
          <span>- ${formatCurrency(quote.discount)}</span>
        </div>
        `
            : ''
        }
        <div class="summary-row total">
          <span>Total</span>
          <span>${formatCurrency(quote.total)}</span>
        </div>
      </div>

      ${
        quote.observations
          ? `
      <div class="section" style="margin-top: 30px;">
        <div class="section-title">Observacoes</div>
        <div class="observations">
          <p>${quote.observations}</p>
        </div>
      </div>
      `
          : ''
      }

      <div class="footer">
        <p>Orcamento gerado em ${formattedDate} | Valido por 15 dias</p>
        <p>Documento gerado por ServiPro</p>
      </div>
    </body>
    </html>
  `

  return html
}

export function openPrintWindow(html: string) {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

export function generateWhatsAppMessage(quote: Quote): string {
  const formattedTotal = quote.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const message = `Ola ${quote.client.name}!

Segue o orcamento *${quote.number}*:

*Total: ${formattedTotal}*

Detalhes:
- Servicos: ${quote.services.length} item(s)
- Materiais: ${quote.materials.length} item(s)
${quote.discount > 0 ? `- Desconto aplicado: ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}

${quote.observations ? `Obs: ${quote.observations}` : ''}

Aguardo sua confirmacao!`

  return encodeURIComponent(message)
}

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank')
}
