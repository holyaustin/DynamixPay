// components/layout/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Wallet, Home, Users, BarChart, DollarSign } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { Container } from '@/components/layout/Container'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Payroll', href: '/payroll', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Fund', href: '/fund', icon: DollarSign },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { authenticated } = usePrivy()

  const handleNavigation = (href: string) => {
    if (!authenticated && href !== '/') {
      router.push('/')
      return
    }
    router.push(href)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-900 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80">
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
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${!authenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!authenticated && item.href !== '/'}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </button>
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
          <div className="md:hidden py-4 border-t border-gray-900 animate-fade-in">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`flex items-center w-full px-4 py-3 rounded-lg text-base font-medium ${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    } ${!authenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!authenticated && item.href !== '/'}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Container>
    </header>
  )
}