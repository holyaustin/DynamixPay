// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PrivyProvider } from '@/components/wallet/PrivyProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DynamixPay - x402 Payroll Automation',
  description: 'AI-powered treasury management on Cronos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <PrivyProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </PrivyProvider>
      </body>
    </html>
  )
}