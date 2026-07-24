import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita que o Next use outra pasta (ex.: usuário/OneDrive) como raiz por causa de lockfiles fora do projeto
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  /** html2pdf.js depende de html2canvas/jspdf — transpilar evita falhas de import/resolução no bundle do cliente. */
  transpilePackages: ['html2pdf.js', 'html2canvas', 'jspdf'],
  // Next.js 16: serverComponentsExternalPackages moved to root level
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  // Rotas legadas → caminhos canônicos do sidebar
  async redirects() {
    return [
      { source: '/dashboard/novo-orcamento', destination: '/orcamentos/novo', permanent: false },
      { source: '/dashboard/historico', destination: '/orcamentos/historico', permanent: false },
      { source: '/dashboard/orcamento/:id', destination: '/orcamentos/:id', permanent: false },
      { source: '/dashboard/editar-orcamento/:id', destination: '/orcamentos/editar/:id', permanent: false },
      { source: '/dashboard/pagamentos', destination: '/financeiro/pagamentos', permanent: false },
      { source: '/dashboard/faturamento', destination: '/financeiro/faturamento', permanent: false },
      { source: '/dashboard/inadimplentes', destination: '/financeiro/inadimplentes', permanent: false },
      { source: '/dashboard/despesas', destination: '/financeiro/despesas', permanent: false },
      { source: '/dashboard/relatorios-financeiros', destination: '/financeiro/relatorios', permanent: false },
      { source: '/dashboard/clientes', destination: '/operacao/clientes', permanent: false },
      { source: '/dashboard/servicos', destination: '/operacao/servicos', permanent: false },
      { source: '/dashboard/fechamento-caixa', destination: '/operacao/fechamento-caixa', permanent: false },
      { source: '/dashboard/relatorios-fechamentos', destination: '/operacao/relatorios-fechamentos', permanent: false },
      { source: '/dashboard/listas-materiais', destination: '/operacao/listas-materiais', permanent: false },
      { source: '/dashboard/listas-materiais/:path*', destination: '/operacao/listas-materiais/:path*', permanent: false },
    ]
  },
  // PWA Configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ]
  },
}

export default nextConfig
