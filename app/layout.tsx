import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { DynamicFavicon } from '@/components/dynamic-favicon'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'ServiPro - Gestão de Orçamentos',
  description: 'Sistema profissional de gestão de orçamentos, despesas e faturamento',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ServiPro',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-icon-180x180.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="icon" href="/api/company/favicon" type="image/png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ServiPro" />
        <link rel="apple-touch-icon" href="/api/company/pwa-icon/180" />
      </head>
      <body className={`font-sans antialiased`}>
        <DynamicFavicon />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}

// Componente para registrar o Service Worker
function PWARegister() {
  if (typeof window !== 'undefined') {
    if ('serviceWorker' in navigator) {
      // Registra imediatamente
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope)
          
          // Verifica atualizações periodicamente
          setInterval(() => {
            registration.update()
          }, 60000) // A cada minuto
        })
        .catch((error) => {
          console.log('❌ Erro ao registrar Service Worker:', error)
        })
    }
  }
  return null
}

