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
