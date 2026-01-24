// app/layout.tsx - UPDATED
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PrivyProviders } from '@/components/wallet/PrivyProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Suspense } from 'react'
import { ToastProvider } from '@/components/ui/ToastProvider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'DynamixPay - x402 Payroll Automation',
  description: 'AI-powered treasury management on Cronos',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-background text-foreground`}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        }>
          <PrivyProviders>
            <ToastProvider />
            <Header />
            <main className="flex-1 w-full overflow-x-hidden">
              {children}
            </main>
            <Footer />
          </PrivyProviders>
        </Suspense>
      </body>
    </html>
  )
}