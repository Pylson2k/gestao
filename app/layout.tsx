import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { DynamicFavicon } from '@/components/dynamic-favicon'
import { DynamicTitle } from '@/components/dynamic-title'
import { PWARegister } from '@/components/pwa-register'
import { AppReturnButton } from '@/components/layout/app-return-button'
import { Toaster } from '@/components/ui/sonner'
import { APP_DISPLAY_NAME, APP_TITLE_SUFFIX } from '@/lib/app-constants'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${APP_DISPLAY_NAME} - ${APP_TITLE_SUFFIX}`,
  description: `Sistema profissional de gestão de orçamentos, despesas e faturamento — ${APP_DISPLAY_NAME}`,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DISPLAY_NAME,
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
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
        <meta name="apple-mobile-web-app-title" content={APP_DISPLAY_NAME} />
        <link rel="apple-touch-icon" href="/api/company/pwa-icon/180" />
      </head>
      <body className="font-sans antialiased">
        <DynamicFavicon />
        <DynamicTitle />
        <AuthProvider>
          {children}
        </AuthProvider>
        <AppReturnButton />
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}
