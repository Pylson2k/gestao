/// <reference path="./html2pdf-bundle.d.ts" />
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
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
  .pdf-commercial-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;
  }
  .pdf-commercial-card {
    border: 1px solid #cbd5e1;
    border-top: 3px solid #1e3a5f;
    border-radius: 4px;
    padding: 7px 8px;
    background: #ffffff;
    page-break-inside: avoid;
  }
  .pdf-commercial-card h3 {
    margin: 0 0 4px 0;
    font-size: 8.5pt;
    font-weight: 700;
    color: #1e3a5f;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .pdf-commercial-card p {
    margin: 0;
    color: #334155;
    font-size: 8.8pt;
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

/** Estilos extras para recibo de pagamento (comprovante ao cliente). */
const PDF_RECEIPT_EXTRA_CSS = `
  .pdf-receipt-declaration {
    font-size: 10pt;
    line-height: 1.5;
    color: #334155;
    margin: 0 0 12px 0;
    text-align: justify;
  }
  .pdf-receipt-amount-box {
    margin: 12px 0 14px 0;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    text-align: center;
  }
  .pdf-receipt-amount-box .pdf-amt-label {
    font-size: 8pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 6px 0;
  }
  .pdf-receipt-amount-box .pdf-amt-value {
    font-size: 20pt;
    font-weight: 700;
    color: #1e3a5f;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .pdf-receipt-meta-table td:first-child {
    width: 38%;
    color: #64748b;
    font-weight: 600;
    font-size: 9pt;
  }
  .pdf-signature-row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-top: 36px;
    page-break-inside: avoid;
  }
  .pdf-signature-col {
    flex: 1;
    text-align: center;
    min-width: 0;
  }
  .pdf-signature-line {
    border-top: 1px solid #64748b;
    margin: 40px 12px 6px 12px;
    padding-top: 6px;
    font-size: 8.5pt;
    color: #64748b;
    line-height: 1.3;
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

function pdfMultilineText(value?: string | null): string {
  return value ? pdfEscapeHtml(value).replace(/\n/g, '<br/>') : ''
}

function pdfQuoteCommercialTermsSection(quote: Quote): string {
  const cards = [
    { title: 'Pagamentos', value: quote.paymentTerms },
    { title: 'Condições comerciais', value: quote.conditions },
    { title: 'Prazos', value: quote.deadlines },
  ].filter((item) => item.value && item.value.trim())

  if (cards.length === 0) return ''

  return `
      <section class="pdf-section">
        <h2 class="pdf-section-title">Proposta comercial</h2>
        <div class="pdf-commercial-grid">
          ${cards
            .map(
              (item) => `
          <div class="pdf-commercial-card">
            <h3>${item.title}</h3>
            <p>${pdfMultilineText(item.value)}</p>
          </div>`
            )
            .join('')}
        </div>
      </section>`
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
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
          ${list.client.document ? `<p>CPF/CNPJ ${pdfEscapeHtml(list.client.document)}</p>` : ''}
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
        <p>Gerado em ${generatedAt} · ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
          ${quote.client.document ? `<p>CPF/CNPJ ${pdfEscapeHtml(quote.client.document)}</p>` : ''}
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
        <p>${generatedAt} · Orç. ${pdfEscapeHtml(quote.number)} · ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

export function generateQuotePDF(quote: Quote, companySettings: CompanySettings) {
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const observationsHtml = pdfMultilineText(quote.observations)

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
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
          ${quote.client.document ? `<p>CPF/CNPJ ${pdfEscapeHtml(quote.client.document)}</p>` : ''}
          <p>${pdfEscapeHtml(quote.client.phone)}</p>
          <p>${pdfEscapeHtml(quote.client.address)}</p>
        </div>
      </section>

      ${pdfQuoteLineItemsSections(quote)}
      ${pdfQuoteCommercialTermsSection(quote)}

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
        <p>Válido 15 dias · ${formattedDate} · ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
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
          ${quote.client.document ? `<p>CPF/CNPJ ${pdfEscapeHtml(quote.client.document)}</p>` : ''}
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
        <p>Serviço concluído · ${pdfEscapeHtml(quote.number)} · ${pdfEscapeHtml(completedDateStr)} · ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

export type PaymentReceiptTotals = {
  /** Soma de todos os pagamentos já registrados neste orçamento (situação atual). */
  totalPaidOnQuote: number
}

/**
 * Recibo de pagamento referente a serviços / orçamento — documento para entregar ao cliente pagador.
 */
export function generatePaymentReceiptPDF(
  payment: Payment,
  quote: Quote,
  companySettings: CompanySettings,
  totals: PaymentReceiptTotals
): string {
  const payDate = new Date(payment.paymentDate)
  const payDateLong = payDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const payDateShort = payDate.toLocaleDateString('pt-BR')
  const issuedNow = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const methodLabel = paymentMethodLabelPt(String(payment.paymentMethod))
  const amountStr = payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const receiptRef = payment.id.slice(-10).toUpperCase()

  const serviceHint =
    quote.services.length === 0
      ? 'serviços e/ou fornecimentos relacionados ao documento comercial indicado abaixo'
      : quote.services.length === 1
        ? `o serviço de <strong>${pdfEscapeHtml(quote.services[0].name)}</strong> e demais itens discriminados no orçamento`
        : `os serviços contratados (entre eles <strong>${pdfEscapeHtml(quote.services[0].name)}</strong> e outros constantes do orçamento)`

  const obsHtml = payment.observations
    ? pdfEscapeHtml(payment.observations).replace(/\n/g, '<br/>')
    : '—'

  const quoteTotalStr =
    quote.total > 0
      ? quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Conforme orçamento / combinação entre as partes'

  const totalPaidStr = totals.totalPaidOnQuote.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const remaining =
    quote.total > 0 ? Math.max(0, quote.total - totals.totalPaidOnQuote) : null
  const remainingRow =
    remaining !== null
      ? `
        <div class="pdf-summary-row">
          <span>Saldo remanescente no orçamento (após todos os pagamentos)</span>
          <span>${remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>`
      : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Recibo de pagamento — ${pdfEscapeHtml(quote.number)}</title>
      <style>${PDF_BASE_COMPACT_CSS}\n${PDF_RECEIPT_EXTRA_CSS}</style>
    </head>
    <body>
      <header class="pdf-header">
        <div class="pdf-header-left">
          ${companySettings.logo ? `<img src="${companySettings.logo}" alt="" />` : ''}
          <div>
            <p class="pdf-company-name">${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
            ${companySettings.phone ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.phone)}</p>` : ''}
            ${companySettings.email ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.email)}</p>` : ''}
            ${companySettings.address ? `<p class="pdf-company-line">${pdfEscapeHtml(companySettings.address)}</p>` : ''}
            ${companySettings.cnpj ? `<p class="pdf-company-line">CNPJ ${pdfEscapeHtml(companySettings.cnpj)}</p>` : ''}
          </div>
        </div>
        <div class="pdf-meta">
          <p class="pdf-doc-title">Recibo de pagamento</p>
          <p class="pdf-doc-ref">Ref. ${pdfEscapeHtml(receiptRef)}</p>
          <p class="pdf-doc-ref">Emitido em ${pdfEscapeHtml(issuedNow)}</p>
        </div>
      </header>

      <p class="pdf-notice">
        Documento emitido pelo prestador em comprovação do recebimento do valor discriminado abaixo,
        referente a pagamento vinculado ao orçamento / ordem de serviço indicado.
      </p>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Pagador (cliente)</h2>
        <div class="pdf-client">
          <p><strong>${pdfEscapeHtml(quote.client.name)}</strong></p>
          ${quote.client.document ? `<p>CPF/CNPJ ${pdfEscapeHtml(quote.client.document)}</p>` : ''}
          <p>${pdfEscapeHtml(quote.client.phone)}</p>
          <p>${pdfEscapeHtml(quote.client.address)}</p>
          ${quote.client.email ? `<p>${pdfEscapeHtml(quote.client.email)}</p>` : ''}
        </div>
      </section>

      <p class="pdf-receipt-declaration">
        <strong>${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</strong> declara ter recebido de
        <strong>${pdfEscapeHtml(quote.client.name)}</strong>, nesta data de
        <strong>${pdfEscapeHtml(payDateLong)}</strong>, por meio de
        <strong>${pdfEscapeHtml(methodLabel)}</strong>, a importância relacionada a
        ${serviceHint}, conforme o documento comercial
        <strong>nº ${pdfEscapeHtml(quote.number)}</strong>, nos termos acordados entre as partes.
      </p>

      <div class="pdf-receipt-amount-box">
        <p class="pdf-amt-label">Valor recebido neste pagamento</p>
        <p class="pdf-amt-value">${amountStr}</p>
      </div>

      <section class="pdf-section">
        <h2 class="pdf-section-title">Detalhes do lançamento</h2>
        <div class="pdf-table-wrap">
          <table class="pdf-table pdf-receipt-meta-table">
            <tbody>
              <tr>
                <td>Forma de pagamento</td>
                <td>${pdfEscapeHtml(methodLabel)}</td>
              </tr>
              <tr>
                <td>Data do pagamento</td>
                <td>${pdfEscapeHtml(payDateShort)}</td>
              </tr>
              <tr>
                <td>Orçamento / OS de referência</td>
                <td>${pdfEscapeHtml(quote.number)}</td>
              </tr>
              <tr>
                <td>Observações do lançamento</td>
                <td>${obsHtml}</td>
              </tr>
              <tr>
                <td>Identificador interno</td>
                <td style="font-size:8pt;word-break:break-all;">${pdfEscapeHtml(payment.id)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="pdf-summary">
        <div class="pdf-summary-row">
          <span>Total do orçamento (referência)</span>
          <span>${quoteTotalStr}</span>
        </div>
        <div class="pdf-summary-row">
          <span>Total pago no orçamento (todos os lançamentos)</span>
          <span>${totalPaidStr}</span>
        </div>
        ${remainingRow}
      </div>

      <div class="pdf-signature-row">
        <div class="pdf-signature-col">
          <div class="pdf-signature-line">
            Assinatura do pagador<br/>
            ${pdfEscapeHtml(quote.client.name)}
          </div>
        </div>
        <div class="pdf-signature-col">
          <div class="pdf-signature-line">
            ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}<br/>
            Responsável / carimbo
          </div>
        </div>
      </div>

      <footer class="pdf-footer">
        <p>Recibo ref. ${pdfEscapeHtml(receiptRef)} · Orç. ${pdfEscapeHtml(quote.number)} · ${pdfEscapeHtml(companySettings.name || APP_DISPLAY_NAME)}</p>
        ${companySettings.additionalInfo ? `<p>${pdfEscapeHtml(companySettings.additionalInfo)}</p>` : ''}
      </footer>
    </body>
    </html>
  `

  return html
}

/** Texto para WhatsApp — recibo de pagamento (PDF anexo gerado em segundo plano na UI). */
export function generatePaymentReceiptWhatsAppMessage(quote: Quote, payment: Payment): string {
  const amountStr = payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dateStr = new Date(payment.paymentDate).toLocaleDateString('pt-BR')
  const method = paymentMethodLabelPt(String(payment.paymentMethod))
  const ref = payment.id.slice(-10).toUpperCase()
  const message = `Ola ${quote.client.name}!

Confirmamos o recebimento de *${amountStr}* referente ao serviço vinculado ao orçamento *${quote.number}*, em *${dateStr}*, via *${method}*.

Recibo ref. *${ref}*.

Segue em anexo o PDF do recibo para seus arquivos.

Obrigado!`

  return encodeURIComponent(message)
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

Serviço concluído — ordem de serviço *${quote.number}*.

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
      alert('Por favor, permita pop-ups para visualizar o orçamento.')
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
      alert('Erro ao visualizar o orçamento. Tente novamente.')
    }
  }
}

/**
 * Injeta no DOM o conteúdo de um HTML completo (com &lt;head&gt; e estilos) de forma que o html2canvas
 * enxergue CSS e markup — atribuir o string inteiro a div.innerHTML descarta &lt;style&gt; do &lt;head&gt;.
 */
function appendFullHtmlDocumentToContainer(container: HTMLElement, fullHtml: string): void {
  const parser = new DOMParser()
  const doc = parser.parseFromString(fullHtml, 'text/html')
  if (doc.querySelector('parsererror')) {
    container.innerHTML = fullHtml
    return
  }
  doc.head?.querySelectorAll('style').forEach((styleEl) => {
    const s = document.createElement('style')
    s.textContent = styleEl.textContent
    container.appendChild(s)
  })
  if (doc.body) {
    Array.from(doc.body.childNodes).forEach((node) => {
      try {
        container.appendChild(document.importNode(node, true))
      } catch {
        if (node.nodeType === Node.TEXT_NODE) {
          container.appendChild(document.createTextNode(node.textContent ?? ''))
        }
      }
    })
  }
}

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = root.querySelectorAll('img')
  return Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && (img.naturalHeight !== 0 || img.src === '')) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          setTimeout(done, 10000)
        })
    )
  ).then(() => undefined)
}

/** Celular / tablet com toque — PDF exige fluxo diferente (Share ou overlay com gesto explícito). */
function isTouchMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true
  try {
    if (window.matchMedia('(max-width: 768px)').matches && navigator.maxTouchPoints > 0) return true
  } catch {
    /* ignore */
  }
  return false
}

async function tryWebSharePdf(pdf: Blob, filename: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>
    canShare?: (data: ShareData) => boolean
  }
  if (typeof nav.share !== 'function') return false
  const safeName = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').trim() || 'documento.pdf'
  const file = new File([pdf], safeName, { type: 'application/pdf', lastModified: Date.now() })
  const data: ShareData = { files: [file], title: safeName, text: 'PDF gerado' }
  if (typeof nav.canShare === 'function' && !nav.canShare(data)) return false
  try {
    await nav.share(data)
    return true
  } catch (e) {
    const name = (e as { name?: string }).name
    if (name === 'AbortError') return true
    return false
  }
}

/**
 * Mobile: o Safari/Chrome costumam ignorar download programático após await.
 * Overlay em tela cheia: o toque em "Salvar PDF" dispara o download com gesto válido.
 */
function showMobilePdfSaveOverlay(pdf: Blob, filename: string): void {
  const safeName = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').trim() || 'documento.pdf'
  const url = URL.createObjectURL(pdf)

  const backdrop = document.createElement('div')
  backdrop.setAttribute('role', 'dialog')
  backdrop.setAttribute('aria-modal', 'true')
  backdrop.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:rgba(15,23,42,.78)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))',
    'box-sizing:border-box',
  ].join(';')

  const card = document.createElement('div')
  card.style.cssText = [
    'background:#fff',
    'color:#0f172a',
    'border-radius:16px',
    'padding:22px 20px',
    'max-width:min(400px,100%)',
    'width:100%',
    'box-shadow:0 25px 50px rgba(0,0,0,.4)',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
  ].join(';')

  const h = document.createElement('h2')
  h.textContent = 'PDF pronto'
  h.style.cssText = 'margin:0 0 8px;font-size:1.25rem;font-weight:700'

  const p = document.createElement('p')
  p.textContent =
    'Toque em Salvar para baixar o arquivo. Se não funcionar, use Abrir e depois compartilhe ou salve pelo menu do navegador.'
  p.style.cssText = 'margin:0 0 18px;font-size:14px;line-height:1.5;color:#64748b'

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;flex-direction:column;gap:10px'

  let revoked = false
  function scheduleRevoke() {
    if (revoked) return
    revoked = true
    // Não revogar imediatamente — pode cancelar download/abertura em alguns browsers/PWA.
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }, 90_000)
  }

  function closeOverlay() {
    scheduleRevoke()
    backdrop.remove()
  }

  const btnSave = document.createElement('button')
  btnSave.type = 'button'
  btnSave.textContent = 'Salvar PDF'
  btnSave.style.cssText = [
    'min-height:52px',
    'border-radius:12px',
    'border:none',
    'background:#1e3a5f',
    'color:#fff',
    'font-size:17px',
    'font-weight:600',
    'cursor:pointer',
    'touch-action:manipulation',
    'width:100%',
    '-webkit-tap-highlight-color:transparent',
  ].join(';')
  btnSave.onclick = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = safeName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    closeOverlay()
  }

  const btnOpen = document.createElement('button')
  btnOpen.type = 'button'
  btnOpen.textContent = 'Abrir PDF'
  btnOpen.style.cssText = [
    'min-height:48px',
    'border-radius:12px',
    'border:2px solid #e2e8f0',
    'background:#fff',
    'color:#0f172a',
    'font-size:16px',
    'font-weight:600',
    'cursor:pointer',
    'touch-action:manipulation',
    'width:100%',
    '-webkit-tap-highlight-color:transparent',
  ].join(';')
  btnOpen.onclick = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const btnClose = document.createElement('button')
  btnClose.type = 'button'
  btnClose.textContent = 'Fechar'
  btnClose.style.cssText =
    'min-height:44px;border:none;background:transparent;color:#64748b;font-size:15px;cursor:pointer;touch-action:manipulation'
  btnClose.onclick = () => closeOverlay()

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeOverlay()
  })

  row.appendChild(btnSave)
  row.appendChild(btnOpen)
  row.appendChild(btnClose)
  card.appendChild(h)
  card.appendChild(p)
  card.appendChild(row)
  backdrop.appendChild(card)
  document.body.appendChild(backdrop)
}

function normalizePdfBlob(out: unknown): Blob | null {
  if (out instanceof Blob) {
    return new Blob([out], { type: 'application/pdf' })
  }
  if (out instanceof ArrayBuffer) {
    return new Blob([out], { type: 'application/pdf' })
  }
  if (out instanceof Uint8Array) {
    const ab = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
    return new Blob([ab], { type: 'application/pdf' })
  }
  return null
}

/** Download via &lt;a download&gt; — não usar display:none (Firefox); não revogar URL na mesma tarefa (Chrome cancela o download). */
function anchorDownloadPdf(blob: Blob, filename: string): void {
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const url = URL.createObjectURL(pdf)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.setAttribute('aria-hidden', 'true')
  a.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 90_000)
}

type SaveFilePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }

/**
 * Grava o PDF no disco. Ordem: Edge legado → diálogo nativo (Chrome/Edge) → link download.
 * Após vários await, o Chrome pode ignorar download programático; o diálogo "Salvar como" costuma funcionar.
 */
async function savePdfBlobToDisk(blob: Blob, filename: string): Promise<void> {
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const mobile = isTouchMobileDevice()

  const nav = navigator as Navigator & { msSaveOrOpenBlob?: (b: Blob, name: string) => void }
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    try {
      nav.msSaveOrOpenBlob(pdf, filename)
      return
    } catch {
      /* continua */
    }
  }

  if (mobile) {
    try {
      if (await tryWebSharePdf(pdf, filename)) return
    } catch {
      /* segue para overlay */
    }
    showMobilePdfSaveOverlay(pdf, filename)
    return
  }

  const w = typeof window !== 'undefined' ? (window as SaveFilePickerWindow) : null
  if (w?.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(pdf)
      await writable.close()
      return
    } catch (e) {
      const err = e as { name?: string }
      if (err.name === 'AbortError') return
      console.warn('showSaveFilePicker:', e)
    }
  }

  anchorDownloadPdf(pdf, filename)
  showPdfDownloadFallbackBar(pdf, filename)
}

let fallbackBarSeq = 0

/** Barra discreta: segundo clique garante gesto do usuário se o download automático foi bloqueado. */
function showPdfDownloadFallbackBar(blob: Blob, filename: string): void {
  const id = ++fallbackBarSeq
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const url = URL.createObjectURL(pdf)

  const bar = document.createElement('div')
  bar.setAttribute('role', 'status')
  bar.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:2147483646;padding:12px 16px;background:#0f172a;color:#f8fafc;font:14px/1.4 system-ui,-apple-system,sans-serif;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;box-shadow:0 -4px 24px rgba(0,0,0,.25)'

  const msg = document.createElement('span')
  msg.textContent = 'PDF gerado. Se o arquivo não apareceu na pasta de Downloads, clique em Salvar.'

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Salvar PDF'
  btn.style.cssText =
    'padding:10px 20px;border-radius:8px;border:none;background:#fff;color:#0f172a;font-weight:600;cursor:pointer'
  btn.onclick = () => {
    anchorDownloadPdf(pdf, filename)
  }

  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Fechar'
  close.style.cssText =
    'padding:10px 16px;border-radius:8px;border:1px solid rgba(248,250,252,.35);background:transparent;color:#f8fafc;cursor:pointer'
  close.onclick = () => {
    URL.revokeObjectURL(url)
    bar.remove()
  }

  bar.appendChild(msg)
  bar.appendChild(btn)
  bar.appendChild(close)
  document.body.appendChild(bar)

  setTimeout(() => {
    if (id !== fallbackBarSeq) return
    if (!bar.parentNode) return
    URL.revokeObjectURL(url)
    bar.remove()
  }, 45_000)
}

function openHtmlForPrintFallback(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) {
    setTimeout(() => {
      try {
        w.focus()
        w.print()
      } catch {
        /* ignore */
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    }, 500)
    return
  }
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      try {
        printWindow.print()
      } catch {
        /* ignore */
      }
    }, 500)
  }
}

function forceDownloadHtmlSnapshot(html: string, filename: string): void {
  const safeHtmlName = filename.replace(/\.pdf$/i, '.html')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeHtmlName
  a.rel = 'noopener'
  a.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 45_000)
}

let html2PdfFactoryPromise: Promise<() => unknown> | null = null

async function loadHtml2PdfFactory(): Promise<() => unknown> {
  if (html2PdfFactoryPromise) {
    return html2PdfFactoryPromise
  }
  html2PdfFactoryPromise = (async () => {
  try {
    const bundle = await import('html2pdf.js/dist/html2pdf.bundle.min.js')
    const fn = (bundle as { default?: unknown }).default ?? bundle
    if (typeof fn === 'function') return fn as () => unknown
  } catch {
    /* tenta entry principal */
  }
  const mod = await import('html2pdf.js')
  const fn = (mod as { default?: unknown }).default ?? mod
  return fn as () => unknown
  })()
  return html2PdfFactoryPromise
}

/** Pré-carrega html2pdf (bundle com html2canvas/jspdf embutidos, mais confiável no Next). */
export function preloadHtml2Pdf(): void {
  if (typeof window === 'undefined') return
  void import('html2pdf.js/dist/html2pdf.bundle.min.js').catch(() => import('html2pdf.js'))
}

export async function downloadPDF(html: string, filename: string = 'orcamento.pdf') {
  const safeFilename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').trim() || 'documento.pdf'
  const mobile = isTouchMobileDevice()
  const pdfWidth =
    typeof window !== 'undefined'
      ? mobile
        ? Math.min(Math.max(320, window.innerWidth - 16), 794)
        : 794
      : 794
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasScale = mobile
    ? Math.min(1.75, Math.max(1, dpr * 0.85))
    : Math.min(2, Math.max(1.25, dpr * 1.25))

  const container = document.createElement('div')
  container.setAttribute('lang', 'pt-BR')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${pdfWidth}px;max-width:100%;overflow:visible;pointer-events:none;background:#fff;z-index:-1;`

  appendFullHtmlDocumentToContainer(container, html)
  document.body.appendChild(container)

  try {
    await waitForImages(container)
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )

    const html2pdfRaw = await loadHtml2PdfFactory()
    if (typeof html2pdfRaw !== 'function') {
      throw new Error('html2pdf não carregou corretamente')
    }
    const html2pdf = html2pdfRaw as () => {
      set: (o: unknown) => { from: (el: HTMLElement) => { outputPdf: (t: string) => Promise<Blob>; save: () => Promise<void> } }
    }

    const opt = {
      margin: [6, 6, 6, 6] as [number, number, number, number],
      filename: safeFilename,
      image: { type: 'jpeg' as const, quality: 0.92 },
      html2canvas: {
        scale: canvasScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: container.scrollWidth || pdfWidth,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    }

    let blob: Blob | null = null
    try {
      const out = await html2pdf().set(opt as unknown).from(container).outputPdf('blob')
      blob = normalizePdfBlob(out)
    } catch (e) {
      console.warn('html2pdf outputPdf(blob) falhou, tentando .save()', e)
    }

    if (blob && blob.size > 80) {
      await savePdfBlobToDisk(blob, safeFilename)
      return
    }

    if (mobile) {
      console.warn('PDF blob não gerado no mobile; usando impressão / visualização')
      openHtmlForPrintFallback(html)
      throw new Error('Não foi possível gerar o PDF automaticamente no celular.')
    }

    try {
      await html2pdf().set(opt as unknown).from(container).save()
      return
    } catch (e) {
      console.warn('html2pdf .save() falhou', e)
      openHtmlForPrintFallback(html)
      throw new Error('Não foi possível finalizar o download do PDF.')
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    forceDownloadHtmlSnapshot(html, safeFilename)
    openHtmlForPrintFallback(html)
    throw error instanceof Error ? error : new Error('Erro ao gerar PDF')
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

export async function forceDownloadPDF(html: string, filename: string = 'documento.pdf'): Promise<void> {
  const safeFilename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').trim() || 'documento.pdf'
  try {
    await downloadPDF(html, safeFilename)
  } catch {
    forceDownloadHtmlSnapshot(html, safeFilename)
    openHtmlForPrintFallback(html)
  }
}

export function generateWhatsAppMessage(quote: Quote): string {
  const formattedTotal = quote.total > 0 
    ? quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'A definir'

  const message = `Ola ${quote.client.name}!

Segue o orçamento *${quote.number}*:

${quote.total > 0 ? `*Total: ${formattedTotal}*` : '*Valores a definir*'}

Detalhes:
- Serviços: ${quote.services.length} item(s)
- Materiais: ${quote.materials.length} item(s)
${quote.discount > 0 ? `- Desconto aplicado: ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}

${quote.observations ? `Obs: ${quote.observations}` : ''}
${quote.paymentTerms ? `\nPagamentos: ${quote.paymentTerms}` : ''}
${quote.conditions ? `\nCondições: ${quote.conditions}` : ''}
${quote.deadlines ? `\nPrazos: ${quote.deadlines}` : ''}

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
