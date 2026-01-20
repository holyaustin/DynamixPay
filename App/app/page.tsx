// app/page.tsx
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { ArrowRight, Shield, Zap, BarChart } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary-900/10" />
      
      <Container>
        {/* Hero Section */}
        <div className="relative py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-900/30 border border-primary-800 mb-8">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse mr-2"></div>
              <span className="text-primary-300 text-sm font-medium">
                Built for Cronos x402 Hackathon
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                Automate Your Treasury
              </span>
              <br />
              <span className="text-white">with x402 Payments</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              DynamixPay enables DAOs and on-chain businesses to automate payroll, 
              manage treasury assets, and execute intelligent x402-powered payments.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25"
              >
                Launch Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              
              <a
                href="https://cronos.org/explorer/testnet3/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-surface border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors"
              >
                View Contract
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-primary-500/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-primary-900/30 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">x402 Integration</h3>
              <p className="text-gray-400">
                Seamless gasless payments using Cronos official x402 facilitator.
                Supports USDC.e payments with EIP-3009 authorization.
              </p>
            </div>

            <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-primary-500/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-blue-900/30 flex items-center justify-center mb-6">
                <BarChart className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Treasury Management</h3>
              <p className="text-gray-400">
                Real-time tracking of USDC.e balances, payee management,
                and automated payment scheduling with revenue thresholds.
              </p>
            </div>

            <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-primary-500/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-green-900/30 flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Secure & Compliant</h3>
              <p className="text-gray-400">
                Built on Cronos Testnet with verified smart contracts.
                Multi-signature support and audit-ready architecture.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Details */}
        <div className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Cronos Integration</h2>
            <p className="text-gray-400">Powered by official Cronos infrastructure</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-surface/30 rounded-xl">
              <div className="text-2xl font-bold text-primary-400 mb-2">x402</div>
              <p className="text-sm text-gray-400">Facilitator Protocol</p>
            </div>
            <div className="text-center p-6 bg-surface/30 rounded-xl">
              <div className="text-2xl font-bold text-primary-400 mb-2">USDC.e</div>
              <p className="text-sm text-gray-400">Payment Token</p>
            </div>
            <div className="text-center p-6 bg-surface/30 rounded-xl">
              <div className="text-2xl font-bold text-primary-400 mb-2">Testnet</div>
              <p className="text-sm text-gray-400">Cronos Testnet</p>
            </div>
            <div className="text-center p-6 bg-surface/30 rounded-xl">
              <div className="text-2xl font-bold text-primary-400 mb-2">EVM</div>
              <p className="text-sm text-gray-400">Full Compatibility</p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}