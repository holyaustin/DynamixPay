// app/page.tsx
'use client'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { ArrowRight, Shield, Zap, BarChart, Lock, Cpu, CheckCircle } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

export default function HomePage() {
  const { authenticated, login } = usePrivy()
  //const router = useRouter()
  const handleClick = () => {
    if (!authenticated) {
      login()
    }
  }

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-primary-400" />,
      title: "x402 Integration",
      description: "Gasless payments using Cronos's official x402 facilitator with EIP-3009 authorization.",
      gradient: "from-primary-500/20 to-primary-600/20"
    },
    {
      icon: <Cpu className="h-6 w-6 text-secondary-400" />,
      title: "AI Agent Automation",
      description: "Intelligent decision engine that analyzes revenue and triggers payroll automatically.",
      gradient: "from-secondary-500/20 to-secondary-600/20"
    },
    {
      icon: <BarChart className="h-6 w-6 text-blue-400" />,
      title: "Treasury Management",
      description: "Real-time tracking of USDC.e balances, payee management, and automated payment scheduling.",
      gradient: "from-blue-500/20 to-blue-600/20"
    },
    {
      icon: <Shield className="h-6 w-6 text-green-400" />,
      title: "Secure & Compliant",
      description: "Built on Cronos Testnet with verified smart contracts and audit-ready architecture.",
      gradient: "from-green-500/20 to-green-600/20"
    },
    {
      icon: <Lock className="h-6 w-6 text-purple-400" />,
      title: "Multi-transaction Support",
      description: "Enterprise-grade security with multi-transaction approvals.",
      gradient: "from-purple-500/20 to-purple-600/20"
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-teal-400" />,
      title: "Real-time Monitoring",
      description: "Live tracking of payments, contract events, and treasury health with instant notifications.",
      gradient: "from-teal-500/20 to-teal-600/20"
    }
  ]


  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-primary-900/10 to-secondary-900/10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
      </div>

      <Container>
        {/* Hero Section */}
        <div className="relative py-20 md:py-12 text-center">
          <div className="max-w-6xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 mb-8 backdrop-blur-sm animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse mr-2"></div>
              <span className="text-primary-300 text-sm font-medium">
                Built for Cronos x402 Hackathon • AI-Powered Treasury Automation
              </span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in animation-delay-200">
              <span className="bg-gradient-to-r from-primary-400 via-white to-secondary-400 bg-clip-text text-transparent">
                Automate Your Treasury
              </span>
              <br />
              <span className="text-white">with Intelligent x402 Payments</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in animation-delay-400">
              DynamixPay enables DAOs and on-chain businesses to automate payroll, 
              manage treasury assets, and execute AI-powered x402 payments—all with 
              minimal human intervention. Built natively on Cronos.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-600">
            
            <button
              onClick={handleClick}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25 hover:scale-105 duration-300"
            >
              {authenticated ? 'Go to Dashboard' : 'Launch App'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            
              <a
                  href="https://explorer.cronos.org/testnet/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-black/40 border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white hover:border-primary-500/30 transition-all duration-300"
              >
                View Contract
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose DynamixPay</h2>
            <p className="text-gray-400">Enterprise-grade treasury automation for the decentralized world</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-primary-500/50 transition-all duration-300 hover:scale-105 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-primary-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-black/30 rounded-2xl border border-gray-800">
              <div className="text-3xl font-bold text-primary-400 mb-2">x402</div>
              <p className="text-sm text-gray-400">Facilitator Protocol</p>
            </div>
            <div className="text-center p-6 bg-black/30 rounded-2xl border border-gray-800">
              <div className="text-3xl font-bold text-primary-400 mb-2">USDC.e</div>
              <p className="text-sm text-gray-400">Payment Token</p>
            </div>
            <div className="text-center p-6 bg-black/30 rounded-2xl border border-gray-800">
              <div className="text-3xl font-bold text-primary-400 mb-2">Cronos</div>
              <p className="text-sm text-gray-400">Testnet/Mainnet</p>
            </div>
            <div className="text-center p-6 bg-black/30 rounded-2xl border border-gray-800">
              <div className="text-3xl font-bold text-primary-400 mb-2">EVM</div>
              <p className="text-sm text-gray-400">Full Compatibility</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400">Simple three-step process to automate your treasury</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                <div className="text-2xl font-bold text-primary-400">1</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Fund Treasury</h3>
              <p className="text-gray-400">
                Add USDC.e to your treasury contract. Set revenue thresholds and payment schedules.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary-500/20 flex items-center justify-center">
                <div className="text-2xl font-bold text-secondary-400">2</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Add Payees</h3>
              <p className="text-gray-400">
                Add payee addresses and set salaries. Multi-sig approvals for security.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="text-2xl font-bold text-blue-400">3</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Automate Payments</h3>
              <p className="text-gray-400">
                AI agent monitors revenue and triggers x402 payments automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Automate Your Treasury?</h2>
            <p className="text-gray-400 mb-8">
              Join the future of decentralized payroll management. No code required.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25 hover:scale-105"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}