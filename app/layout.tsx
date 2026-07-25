import React from 'react'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Instrument_Sans, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { AppFrame } from '@/components/auth/app-frame'
import { DynamicFavicon } from '@/components/dynamic-favicon'
import { DynamicTitle } from '@/components/dynamic-title'
import { PWARegister } from '@/components/pwa-register'
import { AppReturnButton } from '@/components/layout/app-return-button'
import { Toaster } from '@/components/ui/sonner'
import { APP_DISPLAY_NAME, APP_TITLE_SUFFIX } from '@/lib/app-constants'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

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
    { media: '(prefers-color-scheme: light)', color: '#fafbfc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} ${instrumentSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="icon" href="/api/company/favicon" type="image/png" />
        <meta name="theme-color" content="#3d4f6f" />
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
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
        <AppReturnButton />
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}
