// components/layout/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Wallet, Home, Users, BarChart } from 'lucide-react'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { Container } from '@/components/layout/Container'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Payroll', href: '/payroll', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-white">DynamixPay</span>
                <span className="ml-2 text-xs font-medium text-primary-400 bg-primary-900/30 px-2 py-1 rounded">
                  x402
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-surface text-white'
                      : 'text-gray-300 hover:bg-surface hover:text-white'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Connect Button */}
          <div className="flex items-center space-x-4">
            <ConnectButton />
            
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                      isActive
                        ? 'bg-surface text-white'
                        : 'text-gray-300 hover:bg-surface hover:text-white'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </Container>
    </header>
  )
}