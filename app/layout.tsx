import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { I18nWrapper } from '@/components/providers/i18n-wrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CaféOS — POS for Coffee Shops',
  description: 'Web-based point-of-sale platform built for coffee shops',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Battambang:wght@300;400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <I18nWrapper>{children}</I18nWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
