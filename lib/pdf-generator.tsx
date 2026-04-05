import type { Quote, CompanySettings, MaterialList } from './types'
import { formatQuantityWithUnitPdf } from './material-units'

/**
 * Lista de materiais independente de orçamento — documento formal para o cliente.
 * Com `includePrices` desligado, exibe apenas descrição e quantidade (lista de compras).
 */
export function generateStandaloneMaterialListPDF(
  list: MaterialList,
  companySettings: CompanySettings
) {
  const docDate = new Date(list.createdAt).toLocaleDateString('pt-BR')
  const generatedAt = new Date().toLocaleDateString('pt-BR')
  const showPrices = list.includePrices

  const formatCurrency = (value: number) =>
    value > 0 ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

  const materialsTotal = list.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const rowsNoPrice = list.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
        </tr>`
    )
    .join('')

  const rowsWithPrice = list.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  const tableBlock = showPrices
    ? `
        <table>
          <thead>
            <tr>
              <th>Descricao</th>
              <th style="text-align: center;">Qtd / un.</th>
              <th style="text-align: right;">Valor unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsWithPrice}
            <tr class="subtotal-row">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 600;">Subtotal estimado:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">Valores meramente indicativos para planejamento, sujeitos a variacao de mercado.</p>
      `
    : `
        <table>
          <thead>
            <tr>
              <th style="width: 75%;">Descricao do material</th>
              <th style="text-align: center; width: 25%;">Quantidade / un.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsNoPrice}
          </tbody>
        </table>
      `

  const observationsHtml = list.observations
    ? escapeHtml(list.observations).replace(/\n/g, '<br/>')
    : ''
  const titleHtml = list.title ? escapeHtml(list.title) : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Lista de materiais ${escapeHtml(list.number)}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1f2937;
          line-height: 1.55;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 2px solid #1e40af;
        }
        .logo {
          font-size: 22px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: -0.02em;
        }
        .doc-info { text-align: right; }
        .doc-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        .doc-ref { color: #6b7280; font-size: 13px; margin-top: 4px; }
        .purpose {
          background: #f8fafc;
          border-left: 4px solid #1e40af;
          padding: 14px 16px;
          margin-bottom: 28px;
          font-size: 14px;
          color: #374151;
        }
        .section { margin-bottom: 28px; }
        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .client-info p { margin: 4px 0; color: #4b5563; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th {
          background-color: #f1f5f9;
          padding: 11px 8px;
          text-align: left;
          font-weight: 600;
          color: #334155;
        }
        .subtotal-row { background-color: #f8fafc; }
        .observations {
          background-color: #fffbeb;
          padding: 14px 16px;
          border-radius: 6px;
          border-left: 4px solid #d97706;
          font-size: 14px;
          color: #78350f;
        }
        .footer {
          margin-top: 48px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
        }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; align-items: flex-start; gap: 18px;">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="Logo" style="max-width: 110px; max-height: 72px; object-fit: contain;" />` : ''}
          <div>
            <div class="logo">${companySettings.name || 'ServiPro'}</div>
            ${companySettings.phone ? `<p style="margin: 4px 0; color: #64748b; font-size: 13px;">${companySettings.phone}</p>` : ''}
            ${companySettings.email ? `<p style="margin: 4px 0; color: #64748b; font-size: 13px;">${companySettings.email}</p>` : ''}
            ${companySettings.address ? `<p style="margin: 4px 0; color: #64748b; font-size: 13px;">${companySettings.address}</p>` : ''}
            ${companySettings.cnpj ? `<p style="margin: 4px 0; color: #64748b; font-size: 13px;">CNPJ: ${companySettings.cnpj}</p>` : ''}
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-title">Lista de materiais</div>
          <div class="doc-ref">Documento Nº ${escapeHtml(list.number)}</div>
          <div class="doc-ref">Emitido em ${docDate}</div>
        </div>
      </div>

      <div class="purpose">
        Relação dos materiais necessários para execução do serviço, para aquisição pelo cliente.
        Este documento não substitui orçamento e não constitui cobrança de valores, salvo quando indicado.
      </div>

      ${list.title ? `<p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 20px 0;">${titleHtml}</p>` : ''}

      <div class="section">
        <div class="section-title">Destinatário</div>
        <div class="client-info">
          <p><strong>${escapeHtml(list.client.name)}</strong></p>
          <p>${escapeHtml(list.client.phone)}</p>
          <p>${escapeHtml(list.client.address)}</p>
          ${list.client.email ? `<p>${escapeHtml(list.client.email)}</p>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Itens</div>
        ${tableBlock}
      </div>

      ${
        list.observations
          ? `
      <div class="section">
        <div class="section-title">Observações</div>
        <div class="observations">${observationsHtml}</div>
      </div>`
          : ''
      }

      <div class="footer">
        <p>Documento gerado em ${generatedAt} | ${companySettings.name || 'ServiPro'}</p>
        ${companySettings.additionalInfo ? `<p>${companySettings.additionalInfo}</p>` : ''}
      </div>
    </body>
    </html>
  `

  return html
}

/** PDF somente com dados do cliente e itens de material (mesmo layout base do orçamento). */
export function generateMaterialsListPDF(quote: Quote, companySettings: CompanySettings) {
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')
  const generatedAt = new Date().toLocaleDateString('pt-BR')

  const materialsTotal = quote.materials.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const formatCurrency = (value: number) =>
    value > 0 ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

  const materialsRows =
    quote.materials.length > 0
      ? quote.materials
          .map(
            (item) =>
              `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="4" style="padding: 16px 8px; text-align: center; color: #6b7280;">Nenhum item cadastrado</td></tr>`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Lista de materiais — ${quote.number}</title>
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
        .header > div:first-child {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          flex: 1;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 8px;
        }
        .doc-info {
          text-align: right;
        }
        .doc-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .doc-ref {
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
        <div style="display: flex; align-items: flex-start; gap: 20px;">
          ${companySettings.logo ? `
            <img src="${companySettings.logo}" alt="Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;" />
          ` : ''}
          <div>
            <div class="logo">${companySettings.name || 'ServiPro'}</div>
            ${companySettings.phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.phone}</p>` : ''}
            ${companySettings.email ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.email}</p>` : ''}
            ${companySettings.address ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.address}</p>` : ''}
            ${companySettings.cnpj ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">CNPJ: ${companySettings.cnpj}</p>` : ''}
            ${companySettings.website ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.website}</p>` : ''}
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-title">Lista de materiais</div>
          <div class="doc-ref">Ref.: ${quote.number}</div>
          <div class="doc-ref">Orçamento de ${formattedDate}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Dados do Cliente</div>
        <div class="client-info">
          <p><strong>${quote.client.name}</strong></p>
          <p>${quote.client.phone}</p>
          <p>${quote.client.address}</p>
          ${quote.client.email ? `<p>${quote.client.email}</p>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Materiais</div>
        <table>
          <thead>
            <tr>
              <th>Descricao</th>
              <th>Qtd / un.</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
            ${
              quote.materials.length > 0
                ? `
            <tr class="subtotal-row">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 600;">Subtotal materiais:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
            `
                : ''
            }
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Lista gerada em ${generatedAt} | Referente ao orçamento ${quote.number}</p>
        ${companySettings.additionalInfo ? `<p>${companySettings.additionalInfo}</p>` : ''}
        <p>Documento gerado por ${companySettings.name || 'ServiPro'}</p>
      </div>
    </body>
    </html>
  `

  return html
}

export function generateQuotePDF(quote: Quote, companySettings: CompanySettings) {
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
    value > 0 ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

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
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
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
        .header > div:first-child {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          flex: 1;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 8px;
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
        <div style="display: flex; align-items: flex-start; gap: 20px;">
          ${companySettings.logo ? `
            <img src="${companySettings.logo}" alt="Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;" />
          ` : ''}
          <div>
            <div class="logo">${companySettings.name || 'ServiPro'}</div>
            ${companySettings.phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.phone}</p>` : ''}
            ${companySettings.email ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.email}</p>` : ''}
            ${companySettings.address ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.address}</p>` : ''}
            ${companySettings.cnpj ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">CNPJ: ${companySettings.cnpj}</p>` : ''}
            ${companySettings.website ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${companySettings.website}</p>` : ''}
          </div>
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
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${servicesTotal > 0 ? servicesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
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
              <th>Qtd / un.</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
            <tr class="subtotal-row">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 600;">Subtotal Materiais:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      ${quote.total > 0 ? `
      <div class="summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        ${
          quote.discount > 0
            ? `
        <div class="summary-row">
          <span>Desconto</span>
          <span>- ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        `
            : ''
        }
        <div class="summary-row total">
          <span>Total</span>
          <span>${quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      ` : `
      <div class="summary" style="text-align: center; padding: 30px 20px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Orçamento sem valores financeiros</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">Os valores serão definidos posteriormente</p>
      </div>
      `}

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
        ${companySettings.additionalInfo ? `<p>${companySettings.additionalInfo}</p>` : ''}
        <p>Documento gerado por ${companySettings.name || 'ServiPro'}</p>
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

export function openViewWindow(html: string) {
  // Verificar se está em mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile) {
    // No mobile, usar fullscreen
    const viewWindow = window.open('', '_blank', 'fullscreen=yes')
    if (!viewWindow) {
      // Se pop-up foi bloqueado, criar um blob URL e abrir
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return
    }

    try {
      viewWindow.document.open('text/html', 'replace')
      viewWindow.document.write(html)
      viewWindow.document.close()
      
      // Aguardar o conteúdo ser renderizado
      setTimeout(() => {
        if (viewWindow && !viewWindow.closed) {
          viewWindow.focus()
        }
      }, 100)
    } catch (error) {
      console.error('Erro ao abrir janela de visualização:', error)
      if (viewWindow && !viewWindow.closed) {
        viewWindow.close()
      }
      // Fallback: criar blob URL
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } else {
    // Desktop: comportamento normal
    const viewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes')
    if (!viewWindow) {
      alert('Por favor, permita pop-ups para visualizar o orcamento')
      return
    }

    try {
      viewWindow.document.open('text/html', 'replace')
      viewWindow.document.write(html)
      viewWindow.document.close()
      
      // Aguardar o conteúdo ser renderizado
      setTimeout(() => {
        if (viewWindow && !viewWindow.closed) {
          viewWindow.focus()
        }
      }, 100)
    } catch (error) {
      console.error('Erro ao abrir janela de visualização:', error)
      viewWindow.close()
      alert('Erro ao visualizar o orcamento. Tente novamente.')
    }
  }
}

export async function downloadPDF(html: string, filename: string = 'orcamento.pdf') {
  try {
    // Dynamic import to avoid SSR issues
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule
    
    // Create a temporary container
    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.style.width = '800px'
    element.innerHTML = html
    document.body.appendChild(element)
    
    // Configure options - using type assertion to satisfy Html2PdfOptions
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    }
    
    // Generate and download PDF
    await html2pdf().set(opt as any).from(element).save()
    
    // Clean up
    document.body.removeChild(element)
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    // Fallback: abrir em nova janela para impressão
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
    throw error
  }
}

export function generateWhatsAppMessage(quote: Quote): string {
  const formattedTotal = quote.total > 0 
    ? quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'A definir'

  const message = `Ola ${quote.client.name}!

Segue o orcamento *${quote.number}*:

${quote.total > 0 ? `*Total: ${formattedTotal}*` : '*Valores a definir*'}

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
  const whatsappUrl = `https://wa.me/${fullPhone}?text=${message}`
  
  // Tentar abrir normalmente
  const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  
  // Se não abrir (bloqueio de pop-up), criar link temporário e clicar
  if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
    const link = document.createElement('a')
    link.href = whatsappUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)
  }
}
