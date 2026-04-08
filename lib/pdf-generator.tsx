import type { Quote, CompanySettings, MaterialList, Payment } from './types'
import { formatQuantityWithUnitPdf } from './material-units'

/**
 * Estilos compartilhados — layout compacto tipo documento comercial (fatura/orçamento):
 * margens A4 enxutas, tipografia densa, cabeçalho em uma faixa, tabelas com células baixas.
 * Objetivo: listagens pequenas caberem em uma página ao imprimir ou exportar PDF.
 */
const PDF_BASE_COMPACT_CSS = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a;
    font-size: 10.5pt;
    line-height: 1.32;
    padding: 8px 10px 10px;
    max-width: 100%;
  }
  .pdf-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 2px solid #1e3a5f;
  }
  .pdf-header-left {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .pdf-header-left img {
    max-width: 88px;
    max-height: 44px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .pdf-company-name {
    font-size: 12pt;
    font-weight: 700;
    color: #1e3a5f;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0 0 2px 0;
  }
  .pdf-company-line {
    margin: 0;
    color: #64748b;
    font-size: 8.5pt;
    line-height: 1.25;
  }
  .pdf-meta {
    text-align: right;
    flex-shrink: 0;
  }
  .pdf-doc-title {
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    margin: 0;
  }
  .pdf-doc-ref {
    color: #64748b;
    font-size: 8.5pt;
    margin: 2px 0 0 0;
    line-height: 1.25;
  }
  .pdf-notice {
    background: #f8fafc;
    border-left: 3px solid #1e3a5f;
    padding: 5px 8px;
    margin: 0 0 8px 0;
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.35;
  }
  .pdf-list-title {
    font-size: 10.5pt;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 6px 0;
    line-height: 1.25;
  }
  .pdf-section {
    margin-bottom: 8px;
  }
  .pdf-section-title {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin: 0 0 3px 0;
    padding-bottom: 2px;
    border-bottom: 1px solid #e2e8f0;
  }
  .pdf-client p {
    margin: 0 0 1px 0;
    color: #334155;
    font-size: 9.5pt;
    line-height: 1.3;
  }
  .pdf-table-wrap {
    margin: 0;
  }
  table.pdf-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  table.pdf-table th {
    background: #f1f5f9;
    padding: 4px 6px;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    border-bottom: 1px solid #cbd5e1;
  }
  table.pdf-table th.pdf-td-center { text-align: center; }
  table.pdf-table th.pdf-td-right { text-align: right; }
  table.pdf-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #e8ecf0;
    vertical-align: top;
  }
  table.pdf-table .pdf-td-desc { word-break: break-word; }
  table.pdf-table .pdf-td-center { text-align: center; }
  table.pdf-table .pdf-td-right { text-align: right; }
  table.pdf-table .pdf-td-strong { font-weight: 600; }
  table.pdf-table .pdf-subtotal td {
    background: #f8fafc;
    font-weight: 600;
    padding: 5px 6px;
    border-bottom: 1px solid #cbd5e1;
  }
  .pdf-footnote {
    margin: 6px 0 0 0;
    font-size: 8pt;
    color: #64748b;
    line-height: 1.3;
  }
  .pdf-footer {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    color: #94a3b8;
    font-size: 7.5pt;
    line-height: 1.35;
  }
  .pdf-footer p { margin: 2px 0; }
  .pdf-summary {
    margin-top: 8px;
    padding: 8px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }
  .pdf-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 9.5pt;
  }
  .pdf-summary-row.total {
    border-top: 1px solid #cbd5e1;
    margin-top: 4px;
    padding-top: 6px;
    font-size: 11pt;
    font-weight: 700;
    color: #1e3a5f;
  }
  .pdf-obs {
    background: #fffbeb;
    padding: 6px 8px;
    border-radius: 3px;
    border-left: 3px solid #d97706;
    font-size: 9pt;
    color: #78350f;
    line-height: 1.35;
  }
  .pdf-empty {
    text-align: center;
    color: #94a3b8;
    padding: 10px 6px;
    font-size: 9pt;
  }
  .pdf-summary-empty {
    text-align: center;
    padding: 8px 10px;
    margin-top: 8px;
    font-size: 9pt;
    color: #64748b;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
    line-height: 1.35;
  }
  .pdf-summary-empty p { margin: 2px 0; }
  @media print {
    body { padding: 0; }
  }
`.trim()

function pdfEscapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PAYMENT_METHOD_LABELS_PT: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência bancária',
  boleto: 'Boleto',
}

function paymentMethodLabelPt(method: string): string {
  return PAYMENT_METHOD_LABELS_PT[method] ?? method
}

function pdfFormatCurrency(value: number): string {
  return value > 0 ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
}

/** Blocos HTML de tabelas de serviços e materiais do orçamento (reutilizado em PDF de orçamento e ordem de serviço). */
function pdfQuoteLineItemsSections(quote: Quote): string {
  const servicesTotal = quote.services.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const materialsTotal = quote.materials.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const servicesRows = quote.services
    .map(
      (item) =>
        `<tr>
          <td class="pdf-td-desc">${pdfEscapeHtml(item.name)}</td>
          <td class="pdf-td-center">${item.quantity}</td>
          <td class="pdf-td-right">${pdfFormatCurrency(item.unitPrice)}</td>
          <td class="pdf-td-right">${pdfFormatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  const materialsRows = quote.materials
    .map(
      (item) =>
        `<tr>
          <td class="pdf-td-desc">${pdfEscapeHtml(item.name)}</td>
          <td class="pdf-td-center">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
          <td class="pdf-td-right">${pdfFormatCurrency(item.unitPrice)}</td>
          <td class="pdf-td-right">${pdfFormatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  let html = ''
  if (quote.services.length > 0) {
    html += `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Serviços</h2>
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Descricao</th>
              <th class="pdf-td-center">Qtd</th>
              <th class="pdf-td-right">V. unit.</th>
              <th class="pdf-td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${servicesRows}
            <tr class="pdf-subtotal">
              <td colspan="3" class="pdf-td-right">Subtotal serviços</td>
              <td class="pdf-td-right">${servicesTotal > 0 ? servicesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>`
  }
  if (quote.materials.length > 0) {
    html += `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Materiais</h2>
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Descricao</th>
              <th class="pdf-td-center">Qtd / un.</th>
              <th class="pdf-td-right">V. unit.</th>
              <th class="pdf-td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
            <tr class="pdf-subtotal">
              <td colspan="3" class="pdf-td-right">Subtotal materiais</td>
              <td class="pdf-td-right">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>`
  }
  return html
}

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

  const rowsNoPrice = list.items
    .map(
      (item) =>
        `<tr>
          <td class="pdf-td-desc">${pdfEscapeHtml(item.name)}</td>
          <td class="pdf-td-center pdf-td-strong">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
        </tr>`
    )
    .join('')

  const rowsWithPrice = list.items
    .map(
      (item) =>
        `<tr>
          <td class="pdf-td-desc">${pdfEscapeHtml(item.name)}</td>
          <td class="pdf-td-center">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
          <td class="pdf-td-right">${formatCurrency(item.unitPrice)}</td>
          <td class="pdf-td-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
    )
    .join('')

  const tableBlock = showPrices
    ? `
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Descricao</th>
              <th class="pdf-td-center">Qtd / un.</th>
              <th class="pdf-td-right">Valor unit.</th>
              <th class="pdf-td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsWithPrice}
            <tr class="pdf-subtotal">
              <td colspan="3" class="pdf-td-right">Subtotal estimado</td>
              <td class="pdf-td-right">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p class="pdf-footnote">Valores meramente indicativos para planejamento, sujeitos a variacao de mercado.</p>
      `
    : `
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th style="width:72%;">Descricao</th>
              <th class="pdf-td-center" style="width:28%;">Qtd / un.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsNoPrice}
          </tbody>
        </table>
        </div>
      `

  const observationsHtml = list.observations
    ? pdfEscapeHtml(list.observations).replace(/\n/g, '<br/>')
    : ''
  const titleHtml = list.title ? pdfEscapeHtml(list.title) : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Lista de materiais ${pdfEscapeHtml(list.number)}</title>
      <style>${PDF_BASE_COMPACT_CSS}</style>
    </head>
    <body>
      <header class="pdf-header">
        <div class="pdf-header-left">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="" />` : ''}
          <div>
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
            ${companySettings.phone ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.phone)}</p>` : ''}
            ${companySettings.email ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.email)}</p>` : ''}
            ${companySettings.address ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.address)}</p>` : ''}
            ${companySettings.cnpj ? `<p class="pdf-company-line">CNPJ ${pdfEscapeHtml(companySettings.cnpj)}</p>` : ''}
          </div>
        </div>
        <div class="pdf-meta">
          <p class="pdf-doc-title">Lista de materiais</p>
          <p class="pdf-doc-ref">Nº ${pdfEscapeHtml(list.number)}</p>
          <p class="pdf-doc-ref">${docDate}</p>
        </div>
      </header>

      <p class="pdf-notice">
        Materiais para aquisição pelo cliente. Não substitui orçamento nem constitui cobrança, salvo quando houver valores indicados.
      </p>

      ${list.title ? `<p class="pdf-list-title">${titleHtml}</p>` : ''}

      <section class="pdf-section">
        <h2 class="pdf-section-title">Destinatário</h2>
        <div class="pdf-client">
          <p><strong>${pdfEscapeHtml(list.client.name)}</strong></p>
          <p>${pdfEscapeHtml(list.client.phone)}</p>
          <p>${pdfEscapeHtml(list.client.address)}</p>
          ${list.client.email ? `<p>${pdfEscapeHtml(list.client.email)}</p>` : ''}
        </div>
      </section>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Itens</h2>
        ${tableBlock}
      </section>

      ${
        list.observations
          ? `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Observações</h2>
        <div class="pdf-obs">${observationsHtml}</div>
      </section>`
          : ''
      }

      <footer class="pdf-footer">
        <p>Gerado em ${generatedAt} · ${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
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
          <td class="pdf-td-desc">${pdfEscapeHtml(item.name)}</td>
          <td class="pdf-td-center">${formatQuantityWithUnitPdf(item.quantity, item.unit)}</td>
          <td class="pdf-td-right">${formatCurrency(item.unitPrice)}</td>
          <td class="pdf-td-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="4" class="pdf-empty">Nenhum item cadastrado</td></tr>`

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Lista de materiais — ${pdfEscapeHtml(quote.number)}</title>
      <style>${PDF_BASE_COMPACT_CSS}</style>
    </head>
    <body>
      <header class="pdf-header">
        <div class="pdf-header-left">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="" />` : ''}
          <div>
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
            ${companySettings.phone ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.phone)}</p>` : ''}
            ${companySettings.email ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.email)}</p>` : ''}
            ${companySettings.address ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.address)}</p>` : ''}
            ${companySettings.cnpj ? `<p class="pdf-company-line">CNPJ ${pdfEscapeHtml(companySettings.cnpj)}</p>` : ''}
            ${companySettings.website ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.website)}</p>` : ''}
          </div>
        </div>
        <div class="pdf-meta">
          <p class="pdf-doc-title">Lista de materiais</p>
          <p class="pdf-doc-ref">Orç. ${pdfEscapeHtml(quote.number)}</p>
          <p class="pdf-doc-ref">${formattedDate}</p>
        </div>
      </header>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Cliente</h2>
        <div class="pdf-client">
          <p><strong>${pdfEscapeHtml(quote.client.name)}</strong></p>
          <p>${pdfEscapeHtml(quote.client.phone)}</p>
          <p>${pdfEscapeHtml(quote.client.address)}</p>
          ${quote.client.email ? `<p>${pdfEscapeHtml(quote.client.email)}</p>` : ''}
        </div>
      </section>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Materiais</h2>
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Descricao</th>
              <th class="pdf-td-center">Qtd / un.</th>
              <th class="pdf-td-right">V. unit.</th>
              <th class="pdf-td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
            ${
              quote.materials.length > 0
                ? `
            <tr class="pdf-subtotal">
              <td colspan="3" class="pdf-td-right">Subtotal materiais</td>
              <td class="pdf-td-right">${materialsTotal > 0 ? materialsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
            </tr>
            `
                : ''
            }
          </tbody>
        </table>
        </div>
      </section>

      <footer class="pdf-footer">
        <p>${generatedAt} · Orç. ${pdfEscapeHtml(quote.number)} · ${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

export function generateQuotePDF(quote: Quote, companySettings: CompanySettings) {
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const observationsHtml = quote.observations
    ? pdfEscapeHtml(quote.observations).replace(/\n/g, '<br/>')
    : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Orcamento ${pdfEscapeHtml(quote.number)}</title>
      <style>${PDF_BASE_COMPACT_CSS}</style>
    </head>
    <body>
      <header class="pdf-header">
        <div class="pdf-header-left">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="" />` : ''}
          <div>
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
            ${companySettings.phone ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.phone)}</p>` : ''}
            ${companySettings.email ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.email)}</p>` : ''}
            ${companySettings.address ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.address)}</p>` : ''}
            ${companySettings.cnpj ? `<p class="pdf-company-line">CNPJ ${pdfEscapeHtml(companySettings.cnpj)}</p>` : ''}
            ${companySettings.website ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.website)}</p>` : ''}
          </div>
        </div>
        <div class="pdf-meta">
          <p class="pdf-doc-title">Orçamento</p>
          <p class="pdf-doc-ref">${pdfEscapeHtml(quote.number)}</p>
          <p class="pdf-doc-ref">${formattedDate}</p>
        </div>
      </header>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Cliente</h2>
        <div class="pdf-client">
          <p><strong>${pdfEscapeHtml(quote.client.name)}</strong></p>
          <p>${pdfEscapeHtml(quote.client.phone)}</p>
          <p>${pdfEscapeHtml(quote.client.address)}</p>
        </div>
      </section>

      ${pdfQuoteLineItemsSections(quote)}

      ${
        quote.total > 0
          ? `
      <div class="pdf-summary">
        <div class="pdf-summary-row">
          <span>Subtotal</span>
          <span>${quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        ${
          quote.discount > 0
            ? `
        <div class="pdf-summary-row">
          <span>Desconto</span>
          <span>- ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        `
            : ''
        }
        <div class="pdf-summary-row total">
          <span>Total</span>
          <span>${quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      `
          : `
      <div class="pdf-summary-empty">
        <p><strong>Sem valores no orçamento</strong></p>
        <p>Valores a combinar.</p>
      </div>
      `
      }

      ${
        quote.observations
          ? `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Observações</h2>
        <div class="pdf-obs">${observationsHtml}</div>
      </section>
      `
          : ''
      }

      <footer class="pdf-footer">
        <p>Válido 15 dias · ${formattedDate} · ${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

/** PDF de ordem de serviço (pós-conclusão): itens, totais e histórico de pagamentos. */
export function generateServiceOrderPDF(
  quote: Quote,
  companySettings: CompanySettings,
  payments: Payment[]
): string {
  const completedDateStr = quote.serviceCompletedAt
    ? new Date(quote.serviceCompletedAt).toLocaleDateString('pt-BR')
    : new Date(quote.createdAt).toLocaleDateString('pt-BR')
  const issuedDateStr = new Date().toLocaleDateString('pt-BR')

  const sortedPayments = [...payments].sort((a, b) => {
    const da = new Date(a.paymentDate).getTime()
    const db = new Date(b.paymentDate).getTime()
    return da - db
  })

  const totalPaid = sortedPayments.reduce((s, p) => s + p.amount, 0)
  const outstanding = quote.total > 0 ? quote.total - totalPaid : 0

  const paymentRows = sortedPayments
    .map(
      (p) =>
        `<tr>
          <td class="pdf-td-center">${new Date(p.paymentDate).toLocaleDateString('pt-BR')}</td>
          <td class="pdf-td-desc">${pdfEscapeHtml(paymentMethodLabelPt(String(p.paymentMethod)))}</td>
          <td class="pdf-td-right">${p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          <td class="pdf-td-desc">${p.observations ? pdfEscapeHtml(p.observations) : '-'}</td>
        </tr>`
    )
    .join('')

  const paymentsFooter =
    sortedPayments.length > 0
      ? `<tr class="pdf-subtotal">
          <td colspan="3" class="pdf-td-right">Total registrado em pagamentos</td>
          <td class="pdf-td-right">${totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
        ${
          quote.total > 0 && outstanding > 0.01
            ? `<tr class="pdf-subtotal">
          <td colspan="3" class="pdf-td-right">Saldo em aberto (total do orçamento menos pagamentos)</td>
          <td class="pdf-td-right">${outstanding.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>`
            : ''
        }`
      : ''

  const observationsHtml = quote.observations
    ? pdfEscapeHtml(quote.observations).replace(/\n/g, '<br/>')
    : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Ordem de servico ${pdfEscapeHtml(quote.number)}</title>
      <style>${PDF_BASE_COMPACT_CSS}</style>
    </head>
    <body>
      <header class="pdf-header">
        <div class="pdf-header-left">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="" />` : ''}
          <div>
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
            ${companySettings.phone ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.phone)}</p>` : ''}
            ${companySettings.email ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.email)}</p>` : ''}
            ${companySettings.address ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.address)}</p>` : ''}
            ${companySettings.cnpj ? `<p class="pdf-company-line">CNPJ ${pdfEscapeHtml(companySettings.cnpj)}</p>` : ''}
            ${companySettings.website ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.website)}</p>` : ''}
          </div>
        </div>
        <div class="pdf-meta">
          <p class="pdf-doc-title">Ordem de serviço</p>
          <p class="pdf-doc-ref">${pdfEscapeHtml(quote.number)}</p>
          <p class="pdf-doc-ref">Conclusão: ${pdfEscapeHtml(completedDateStr)}</p>
          <p class="pdf-doc-ref">Emissão: ${pdfEscapeHtml(issuedDateStr)}</p>
        </div>
      </header>

      <p class="pdf-notice">Documento emitido após a conclusão do serviço, com valores acordados e registros de pagamento do sistema.</p>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Cliente</h2>
        <div class="pdf-client">
          <p><strong>${pdfEscapeHtml(quote.client.name)}</strong></p>
          <p>${pdfEscapeHtml(quote.client.phone)}</p>
          <p>${pdfEscapeHtml(quote.client.address)}</p>
        </div>
      </section>

      ${pdfQuoteLineItemsSections(quote)}

      ${
        quote.total > 0
          ? `
      <div class="pdf-summary">
        <div class="pdf-summary-row">
          <span>Subtotal</span>
          <span>${quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        ${
          quote.discount > 0
            ? `
        <div class="pdf-summary-row">
          <span>Desconto</span>
          <span>- ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        `
            : ''
        }
        <div class="pdf-summary-row total">
          <span>Total</span>
          <span>${quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      `
          : `
      <div class="pdf-summary-empty">
        <p><strong>Sem total fechado no orçamento</strong></p>
        <p>Valores conforme combinado com o cliente.</p>
      </div>
      `
      }

      <section class="pdf-section">
        <h2 class="pdf-section-title">Pagamentos registrados</h2>
        <div class="pdf-table-wrap">
        <table class="pdf-table">
          <thead>
            <tr>
              <th class="pdf-td-center">Data</th>
              <th>Meio</th>
              <th class="pdf-td-right">Valor</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            ${
              sortedPayments.length > 0
                ? `${paymentRows}${paymentsFooter}`
                : `<tr><td colspan="4" class="pdf-empty">Nenhum pagamento cadastrado — registre na tela de pagamentos deste orçamento.</td></tr>`
            }
          </tbody>
        </table>
        </div>
      </section>

      ${
        quote.observations
          ? `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Observações</h2>
        <div class="pdf-obs">${observationsHtml}</div>
      </section>
      `
          : ''
      }

      <footer class="pdf-footer">
        <p>Serviço concluído · ${pdfEscapeHtml(quote.number)} · ${pdfEscapeHtml(completedDateStr)} · ${pdfEscapeHtml(companySettings.name || 'ServiPro')}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

export function generateServiceOrderWhatsAppMessage(quote: Quote, totalPaid: number): string {
  const totalStr =
    quote.total > 0
      ? quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'conforme combinado'
  const paidStr = totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  let balanceLine = ''
  if (quote.total > 0) {
    const saldo = quote.total - totalPaid
    if (saldo > 0.01) {
      balanceLine = `\nSaldo em aberto: ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    }
  }

  const message = `Ola ${quote.client.name}!

Servico concluido — ordem de servico *${quote.number}*.

Total: *${totalStr}*
Pagamentos registrados: *${paidStr}*${balanceLine}

Em anexo o PDF com itens, valores e formas de pagamento.

Obrigado pela confianca!`

  return encodeURIComponent(message)
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

/** Pré-carrega html2pdf.js — reduz atraso no primeiro download nesta sessão. */
export function preloadHtml2Pdf(): void {
  if (typeof window === 'undefined') return
  void import('html2pdf.js')
}

export async function downloadPDF(html: string, filename: string = 'orcamento.pdf') {
  const element = document.createElement('div')
  element.style.cssText =
    'position:absolute;left:-9999px;top:0;width:720px;overflow:visible;pointer-events:none;'
  element.innerHTML = html
  document.body.appendChild(element)

  try {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )

    const opt = {
      margin: [6, 6, 6, 6] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.9 },
      html2canvas: {
        scale: 1.35,
        useCORS: true,
        logging: false,
        letterRendering: false,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    }

    await html2pdf().set(opt as any).from(element).save()
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
    throw error
  } finally {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
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

/**
 * Abre conversa no WhatsApp Web/App no mesmo “gesto” do usuário.
 * Evita window.open com noopener (retorna null no Chrome) e prioriza <a target="_blank">.
 */
export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone || cleanPhone.length < 8) return
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  const whatsappUrl = `https://wa.me/${fullPhone}?text=${message}`

  const link = document.createElement('a')
  link.href = whatsappUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
