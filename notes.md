Updates needed. 
1. Analytic Page : the monthly payroll card, how did you get the figure? You should exclude the first two payees in the contract.
- The expenses breakdown card: how did you calculate the gas fees and service fees? i guess the amount shouod be very low.

2. dashboard Page: The four cards on top are just loading but not showing anything why?
- In the Payroll Automation card: What does the Run Payroll button do? Is it sam as the 2 payee(s) have payments due. Run payroll to process. Pay Now Button?
- the Active Payees card. You have to update the code to exclude the first two payees?
- The dashboard should display active payees that was added by that address. it cannot see other payees added from other address because the person adding the payees is seen as the admin of those addresses they add. 
- the action colums under the Active payees made up of a dropdown containing send payment and edit details are not working. Add their respective functionalities. 

3. fund page: You should have a card displaying how much funds the active address have added to the pool.

4. Payroll page: i dont understand the function of the card Revenue Threshold Settings. explain why it is needed.
- Active Payees should only fetch payee added by the active/current accounting accessing the app. i added 2 new payees but they did not show up.
- the Automated Payroll card: Explain what the start Automation button does. Also what does the run payroll now button does too. does it use the x402 or which of the button uses x402 for disbursement of payment?

Not the USDC.e token is the official erc20 token for the app. any other token should be ignored and not reference by this App. its contract address is 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0

5. HomePage app/page.tsx : add one more card to the section Why choose Dynamixpay. add the sixth reason.
- The button Launch Dashboard should call connect wallet button.
- the correct explorer url is https://explorer.cronos.org/testnet/address/   use it tand correct the View Contract button.

Alsso had this error from dashboard during execution or testing.
## Error Type
Console Error

## Error Message
execution reverted (unknown custom error) (action="estimateGas", data="0x118cdaa70000000000000000000000009d105b1122ea3a4808be9affee0287ac1740410f", reason=null, transaction={ "data": "0xa6067cc6", "from": "0x9d105B1122eA3a4808Be9AFFeE0287ac1740410f", "to": "0x084622e6970BBcBA510454C6145313c2993ED9E4" }, invocation=null, revert=null, code=CALL_EXCEPTION, version=6.16.0)

Next.js version: 16.1.3 (Turbopack)

## Error Type
Console Error

## Error Message
execution reverted (unknown custom error) (action="estimateGas", data="0x118cdaa70000000000000000000000009d105b1122ea3a4808be9affee0287ac1740410f", reason=null, transaction={ "data": "0xa6067cc6", "from": "0x9d105B1122eA3a4808Be9AFFeE0287ac1740410f", "to": "0x084622e6970BBcBA510454C6145313c2993ED9E4" }, invocation=null, revert=null, code=CALL_EXCEPTION, version=6.16.0)


    at <unknown> (app/dashboard/page.tsx:191:15)
    at async (lib/utils/error-handler.ts:190:14)

## Code Frame
  189 |         await fetchDashboardData()
  190 |       } else {
> 191 |         throw new Error(result.error || 'Failed to trigger payroll')
      |               ^
  192 |       }
  193 |     } catch (error: any) {
  194 |       // Update transaction as failed - FIXED: use the actual transaction ID

Next.js version: 16.1.3 (Turbopack)


## Error Type
Runtime Error

## Error Message
triggerPayroll failed: Transaction failed. The contract rejected it.


    at <unknown> (lib/utils/error-handler.ts:204:29)

## Code Frame
  202 |       
  203 |       // Re-throw with enhanced message
> 204 |       const enhancedError = new Error(
      |                             ^
  205 |         `${context} failed: ${EnhancedErrorHandler.getUserFriendlyMessage(error)}`
  206 |       )
  207 |       ;(enhancedError as any).originalError = error

Next.js version: 16.1.3 (Turbopack)

// app/page.tsx
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { ArrowRight, Shield, Zap, BarChart, Lock, Cpu, CheckCircle } from 'lucide-react'

export default function HomePage() {
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
      title: "Multi-Sig Support",
      description: "Enterprise-grade security with multi-signature transaction approvals.",
      gradient: "from-purple-500/20 to-purple-600/20"
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
        <div className="relative py-20 md:py-32 text-center">
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
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25 hover:scale-105 duration-300"
              >
                Launch Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              
              <a
                href="https://cronos.org/explorer/testnet3/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
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

// app/fund/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, ArrowUpRight, CheckCircle, 
  AlertCircle, ExternalLink, Wallet 
} from 'lucide-react'
import { getTreasuryBalance } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import { CONTRACTS, USDC_ABI } from '@/config/contracts'

export default function FundPage() {
  const { authenticated, user } = usePrivy()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'input' | 'approve' | 'transfer' | 'complete'>('input')
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(BigInt(0))
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [loading, setLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (authenticated) {
      fetchTreasuryBalance()
      fetchUserBalance()
    }
  }, [authenticated])

  const fetchTreasuryBalance = async () => {
    try {
      const balance = await getTreasuryBalance()
      setTreasuryBalance(balance)
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error)
    }
  }

  const fetchUserBalance = async () => {
    if (user?.wallet?.address) {
      try {
        const balance = await getBalance(user.wallet.address)
        setUserWalletBalance(balance)
      } catch (error) {
        console.error('Failed to fetch user balance:', error)
      }
    }
  }

  const handleApproveAndFund = async () => {
    if (!amount || !user?.wallet?.address) {
      alert('Please enter an amount and connect wallet')
      return
    }

    const provider = await (window as any).ethereum
    if (!provider) {
      alert('No wallet provider found')
      return
    }

    setLoading(true)
    setError('')
    setStep('approve')

    try {
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Create USDC contract instance with signer
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signer)
      
      // Parse amount
      const amountWei = ethers.parseUnits(amount, 6)
      
      // Check balance
      const balance = await usdcContract.balanceOf(user.wallet.address)
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, 6)} USDC`)
      }
      
      // Approve
      const approveTx = await usdcContract.approve(CONTRACTS.TREASURY_MANAGER, amountWei)
      await approveTx.wait()
      
      // Now transfer
      setStep('transfer')
      const transferTx = await usdcContract.transfer(CONTRACTS.TREASURY_MANAGER, amountWei)
      await transferTx.wait()
      
      setTransactionHash(transferTx.hash)
      setStep('complete')
      
      // Refresh balances
      fetchTreasuryBalance()
      fetchUserBalance()
      
    } catch (err: any) {
      console.error('Funding error:', err)
      setError(err.message || 'Transaction failed')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const handleDirectTransfer = async () => {
    if (!amount || !user?.wallet?.address) {
      alert('Please enter an amount and connect wallet')
      return
    }

    const provider = await (window as any).ethereum
    if (!provider) {
      alert('No wallet provider found')
      return
    }

    setLoading(true)
    setError('')
    setStep('transfer')

    try {
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Create USDC contract instance with signer
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signer)
      
      // Parse amount
      const amountWei = ethers.parseUnits(amount, 6)
      
      // Check balance
      const balance = await usdcContract.balanceOf(user.wallet.address)
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, 6)} USDC`)
      }
      
      // Transfer directly
      const transferTx = await usdcContract.transfer(CONTRACTS.TREASURY_MANAGER, amountWei)
      await transferTx.wait()
      
      setTransactionHash(transferTx.hash)
      setStep('complete')
      
      // Refresh balances
      fetchTreasuryBalance()
      fetchUserBalance()
      
    } catch (err: any) {
      console.error('Transfer error:', err)
      setError(err.message || 'Transaction failed')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = ['0.1', '0.2', '0.5', '1']

  const handleQuickAmount = (quickAmount: string) => {
    setAmount(quickAmount)
  }

  const resetForm = () => {
    setAmount('')
    setStep('input')
    setLoading(false)
    setError('')
    setTransactionHash('')
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to fund the treasury
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  const formattedTreasuryBalance = Number(treasuryBalance) / 1_000_000

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Fund Treasury</h1>
          <p className="text-gray-400">Add USDC to the treasury for payroll automation</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Current Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Your Balance</div>
                  <div className="text-xl font-bold text-white">
                    {userWalletBalance} USDC
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Treasury Balance</div>
                  <div className="text-xl font-bold text-white">
                    ${formattedTreasuryBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Card */}
          <div className="glass rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Add Funds to Treasury</h2>
              <p className="text-gray-400">
                Transfer USDC to the treasury contract for automated payroll
              </p>
            </div>

            {/* Status Indicators */}
            {error && (
              <div className="mb-4 p-4 bg-error/10 border border-error/30 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error mr-2" />
                  <div className="text-error">{error}</div>
                </div>
              </div>
            )}

            {step === 'approve' && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center">
                  <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin mr-2"></div>
                  <div className="text-warning">Approving USDC transfer...</div>
                </div>
              </div>
            )}

            {step === 'transfer' && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center">
                  <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin mr-2"></div>
                  <div className="text-warning">Transferring USDC to treasury...</div>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success mr-2" />
                  <div className="text-success">
                    Success! {amount} USDC transferred to treasury.
                  </div>
                </div>
                {transactionHash && (
                  <a
                    href={`https://cronos.org/explorer/testnet3/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-success/80 hover:text-success mt-2"
                  >
                    View transaction <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount to Transfer (USDC)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">$</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">USDC</span>
                </div>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleQuickAmount(quickAmount)}
                  disabled={loading}
                  className="py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${quickAmount}
                </button>
              ))}
            </div>

            {/* Contract Info */}
            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Treasury Contract</div>
              <div className="font-mono text-sm text-white break-all mb-2">
                {CONTRACTS.TREASURY_MANAGER}
              </div>
              <a
                href={`https://explorer.cronos.org/testnet/address/${CONTRACTS.TREASURY_MANAGER}#tokentxns`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm"
              >
                View on Explorer
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {step !== 'complete' ? (
                <>
                  <button
                    onClick={handleApproveAndFund}
                    disabled={!amount || loading || parseFloat(amount) <= 0}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    {loading && step === 'approve' ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      'Approve & Fund'
                    )}
                  </button>
                  
                  <button
                    onClick={handleDirectTransfer}
                    disabled={!amount || loading || parseFloat(amount) <= 0}
                    className="flex-1 py-3 rounded-lg bg-surface border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading && step === 'transfer' ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Transferring...
                      </>
                    ) : (
                      'Direct Transfer'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600"
                >
                  Fund More
                </button>
              )}
            </div>

            {/* Safety Notes */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Important Notes</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• USDC on Cronos Testnet has 6 decimals</li>
                <li>• Transfers are irreversible once confirmed</li>
                <li>• Test with small amounts first (0.1-1 USDC)</li>
                <li>• Ensure you have enough CRO for gas fees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

// app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import TreasuryMetrics from '@/components/dashboard/TreasuryMetrics'
import PayeeTable from '@/components/dashboard/PayeeTable'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, TrendingUp, Clock, Plus, 
  Settings, Play, Bell, Wallet, RefreshCw, Activity
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { 
  getTreasuryBalance, 
  getActivePayees, 
  getTotalAccrued,
  createPaymentRequests,
  calculateDuePayees,
  calculateTotalMonthlyOutflow,
  Payee
} from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import { treasuryEventListener } from '@/lib/blockchain/event-listener'
import { transactionStore, Transaction } from '@/lib/storage/transaction-store'
import { EnhancedErrorHandler, withGlobalErrorHandling } from '@/lib/utils/error-handler'

interface DashboardData {
  treasuryBalance: bigint
  payees: Payee[]
  totalAccrued: bigint
  totalMonthlyOutflow: bigint
  duePayeesCount: number
  userBalance: string
  lastUpdated: Date
}

export default function DashboardPage() {
  const { authenticated, user, ready } = usePrivy()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [pendingTransactions, setPendingTransactions] = useState(0)
  const [isEventListenerActive, setIsEventListenerActive] = useState(false)

  // Initialize event listener
  useEffect(() => {
    if (authenticated) {
      treasuryEventListener.start()
      setIsEventListenerActive(true)
      
      // Subscribe to all events
      const unsubscribe = treasuryEventListener.subscribe('*', (eventData: any) => {
        console.log('Dashboard received event:', eventData)
        
        // Auto-refresh on relevant events
        if (['PayeeAdded', 'PaymentRequestCreated', 'PaymentSettled', 'PayrollTriggered'].includes(eventData.event)) {
          fetchDashboardData()
        }
      })
      
      return () => {
        unsubscribe()
        treasuryEventListener.stop()
        setIsEventListenerActive(false)
      }
    }
  }, [authenticated])

  // Subscribe to transaction store updates
  useEffect(() => {
    const unsubscribe = transactionStore.subscribe((transactions: Transaction[]) => {
      const pending = transactions.filter(tx => tx.status === 'pending').length
      setPendingTransactions(pending)
    })
    
    return unsubscribe
  }, [])

  const fetchDashboardData = useCallback(async () => {
    await withGlobalErrorHandling(async () => {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel with retry
      const [treasuryBalance, payeesData, totalAccrued, userBalanceResult] = await Promise.all([
        EnhancedErrorHandler.withRetry(() => getTreasuryBalance(), {
          maxAttempts: 3,
          baseDelay: 1000,
          shouldRetry: EnhancedErrorHandler.isNetworkError
        }),
        EnhancedErrorHandler.withRetry(() => getActivePayees(), {
          maxAttempts: 3,
          baseDelay: 1000,
          shouldRetry: EnhancedErrorHandler.isNetworkError
        }),
        EnhancedErrorHandler.withRetry(() => getTotalAccrued(), {
          maxAttempts: 3,
          baseDelay: 1000,
          shouldRetry: EnhancedErrorHandler.isNetworkError
        }),
        user?.wallet?.address ? getBalance(user.wallet.address) : Promise.resolve('0.00')
      ])
      
      const duePayeesCount = calculateDuePayees(payeesData)
      const totalMonthlyOutflow = calculateTotalMonthlyOutflow(payeesData)

      setData({
        treasuryBalance,
        payees: payeesData,
        totalAccrued,
        totalMonthlyOutflow,
        duePayeesCount,
        userBalance: userBalanceResult as string,
        lastUpdated: new Date()
      })
      
      setUserWalletBalance(userBalanceResult as string)
      setLastUpdateTime(new Date())
    }, 'fetchDashboardData')()
  }, [user])

  useEffect(() => {
    if (!authenticated && ready) {
      router.push('/')
      return
    }
    
    if (authenticated) {
      fetchDashboardData()
      
      // Set up polling for updates (as backup to event listener)
      const pollInterval = setInterval(fetchDashboardData, 60000) // 1 minute
      
      return () => clearInterval(pollInterval)
    }
  }, [authenticated, ready, router, fetchDashboardData])

  const triggerPayroll = withGlobalErrorHandling(async () => {
    if (!user) {
      alert('Please connect your wallet')
      return
    }

    setPayrollLoading(true)

    try {
      const provider = await (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      const userAddress = await signer.getAddress()
      
      // Track transaction - FIXED: timestamp is automatically added by addTransaction
      const txId = transactionStore.addTransaction({
        hash: 'pending',
        type: 'create_payments',
        status: 'pending',
        from: userAddress,
        to: process.env.NEXT_PUBLIC_TREASURY_CONTRACT!,
        // timestamp is automatically added by addTransaction, don't include it here
      })
      
      // Call createPaymentRequests
      const result = await createPaymentRequests(signer)
      
      if (result.success && result.transactionHash) {
        // Update transaction record
        transactionStore.updateTransaction(txId, {
          hash: result.transactionHash,
          status: 'confirmed',
          confirmedAt: new Date(),
          blockNumber: result.requestIds?.length
        })
        
        alert('Payroll triggered successfully!')
        // Refresh data
        await fetchDashboardData()
      } else {
        throw new Error(result.error || 'Failed to trigger payroll')
      }
    } catch (error: any) {
      // Update transaction as failed - FIXED: use the actual transaction ID
      // We need to get the last transaction ID
      const transactions = transactionStore.getAllTransactions()
      const lastTx = transactions[0] // Most recent transaction
      if (lastTx) {
        transactionStore.updateTransaction(lastTx.id, {
          status: 'failed',
          error: error.message
        })
      }
      
      throw error
    } finally {
      setPayrollLoading(false)
    }
  }, 'triggerPayroll')

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      await fetchDashboardData()
    } finally {
      setIsRefreshing(false)
    }
  }

  const addPayee = () => {
    router.push('/payroll?action=add')
  }

  const manageSettings = () => {
    router.push('/payroll?action=settings')
  }

  const viewTransactions = () => {
    // Check if we have a transactions page or use analytics
    router.push('/transactions')
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to access the treasury dashboard and manage payroll
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  if (loading && !data) {
    return (
      <Container>
        <div className="py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
          <div className="p-4 bg-error/10 border border-error/30 rounded-lg mb-4">
            <div className="text-error">{error}</div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </Container>
    )
  }

  const formattedTreasuryBalance = data ? Number(data.treasuryBalance) / 1_000_000 : 0
  const formattedTotalMonthlyOutflow = data ? Number(data.totalMonthlyOutflow) / 1_000_000 : 0
  const formattedTotalAccrued = data ? Number(data.totalAccrued) / 1_000_000 : 0
  const duePayeesCount = data?.duePayeesCount || 0

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">Treasury Dashboard</h1>
                <div className="flex items-center gap-2">
                  {isEventListenerActive && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-green-400">Live</span>
                    </div>
                  )}
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Real-time treasury management with x402 payments</span>
                <span className="text-gray-500">•</span>
                <span>Updated {lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User Wallet Balance */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-gray-700">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary-400" />
                  <div>
                    <div className="text-sm text-gray-400">Your Balance</div>
                    <div className="font-semibold text-white">
                      {userWalletBalance} USDC
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pending Transactions Badge */}
              {pendingTransactions > 0 && (
                <button
                  onClick={viewTransactions}
                  className="relative p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  <Activity className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingTransactions}
                  </span>
                </button>
              )}
              
              <button
                onClick={manageSettings}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <TreasuryMetrics
            title="Treasury Balance"
            value={`$${formattedTreasuryBalance.toFixed(2)}`}
            change={formattedTreasuryBalance > 10000 ? '+12.5%' : '-5.2%'}
            icon={<DollarSign className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={data?.payees.length.toString() || '0'}
            change={duePayeesCount > 0 ? `${duePayeesCount} due` : undefined}
            icon={<Users className="h-5 w-5" />}
            loading={loading}
            status={duePayeesCount > 0 ? 'warning' : 'normal'}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`$${formattedTotalMonthlyOutflow.toFixed(2)}`}
            change="+5.0%"
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Total Accrued"
            value={`$${formattedTotalAccrued.toFixed(2)}`}
            change="Unpaid"
            icon={<Clock className="h-5 w-5" />}
            loading={loading}
            status="pending"
          />
        </div>

        {/* Actions */}
        <div className="mb-8 p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Payroll Automation</h3>
              <p className="text-gray-400">Trigger x402 payments for due payees</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={triggerPayroll}
                disabled={payrollLoading || duePayeesCount === 0}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {payrollLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Payroll
                  </>
                )}
              </button>
              
              <button
                onClick={addPayee}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold hover:from-secondary-600 hover:to-secondary-700 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Payee
              </button>
              
              <button
                onClick={() => router.push('/fund')}
                className="px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 font-semibold hover:bg-gray-700 hover:text-white transition-colors"
              >
                Fund Treasury
              </button>
            </div>
          </div>
          
          {/* Due Payments Alert */}
          {duePayeesCount > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-yellow-500 mr-2" />
                  <div className="text-yellow-500">
                    <span className="font-semibold">{duePayeesCount} payee(s)</span> have payments due. Run payroll to process.
                  </div>
                </div>
                <button
                  onClick={triggerPayroll}
                  className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payees Table */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Active Payees</h2>
                <p className="text-gray-400">Manage payroll recipients</p>
              </div>
              <div className="text-sm text-gray-400">
                Total: {data?.payees.length || 0} payees • {duePayeesCount} due for payment
              </div>
            </div>
          </div>
          <PayeeTable payees={data?.payees || []} loading={loading} />
        </div>

        {/* System Status */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Event Listener</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEventListenerActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-white">{isEventListenerActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network</span>
              <span className="text-white">Cronos Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Updated</span>
              <span className="text-white">{lastUpdateTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pending Transactions</span>
              <span className={`font-medium ${pendingTransactions > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {pendingTransactions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

//app/payroll/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, Clock, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw,
  Plus, Settings, Wallet
} from 'lucide-react'
import { CONTRACTS, TREASURY_ABI } from '@/config/contracts'
import { getActivePayees, addPayee, createPaymentRequests } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'

interface PayeeForm {
  address: string
  salary: string
}

export default function PayrollPage() {
  const { authenticated, user } = usePrivy()
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddPayee, setShowAddPayee] = useState(false)
  const [payeeForm, setPayeeForm] = useState<PayeeForm>({ address: '', salary: '' })
  const [activePayees, setActivePayees] = useState<any[]>([])
  const [automationEnabled, setAutomationEnabled] = useState(false)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (authenticated) {
      fetchPayrollData()
      fetchUserBalance()
    }
  }, [authenticated])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      
      // Fetch active payees
      const payees = await getActivePayees()
      setActivePayees(payees)
      
      // Fetch payment requests from contract
      // Note: This would require querying events in production
      
    } catch (error) {
      console.error('Failed to fetch payroll data:', error)
      setError('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserBalance = async () => {
    if (user?.wallet?.address) {
      try {
        const balance = await getBalance(user.wallet.address)
        setUserWalletBalance(balance)
      } catch (error) {
        console.error('Failed to fetch user balance:', error)
      }
    }
    
    // Fetch treasury balance
    try {
      const ethers = await import('ethers')
      const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, ['function balanceOf(address) view returns (uint256)'], provider)
      const balance = await usdcContract.balanceOf(CONTRACTS.TREASURY_MANAGER)
      setTreasuryBalance(ethers.formatUnits(balance, 6))
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error)
    }
  }

  const triggerPayroll = async () => {
    if (!user) {
      alert('Please connect your wallet')
      return
    }

    setLoading(true)
    setError('')

    try {
      const provider = await (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Call createPaymentRequests
      const result = await createPaymentRequests(signer)
      
      if (result.success) {
        alert('Payroll triggered successfully!')
        fetchPayrollData()
      } else {
        throw new Error(result.error || 'Failed to trigger payroll')
      }
    } catch (error: any) {
      console.error('Failed to trigger payroll:', error)
      setError(error.message || 'Failed to trigger payroll')
      alert(`Failed to trigger payroll: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutomation = () => {
    // Call API to update automation settings
    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isRunning ? 'stop' : 'start'
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setIsRunning(!isRunning)
        setAutomationEnabled(!isRunning)
        alert(`Automation ${!isRunning ? 'started' : 'stopped'}`)
      }
    })
    .catch(error => {
      console.error('Failed to toggle automation:', error)
    })
  }

  const handleAddPayee = async () => {
    if (!payeeForm.address || !payeeForm.salary) {
      alert('Please fill in all fields')
      return
    }

    if (!user) {
      alert('Please connect your wallet')
      return
    }

    try {
      const provider = await (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Add payee
      const success = await addPayee(signer, payeeForm.address, payeeForm.salary)
      
      if (success) {
        alert('Payee added successfully!')
        setShowAddPayee(false)
        setPayeeForm({ address: '', salary: '' })
        fetchPayrollData()
      } else {
        throw new Error('Failed to add payee')
      }
    } catch (error: any) {
      console.error('Error adding payee:', error)
      alert(`Failed to add payee: ${error.message || 'Unknown error'}`)
    }
  }

  const handleUpdateThreshold = async () => {
    // Implementation for updating revenue threshold
    alert('Update threshold feature coming soon!')
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to access payroll automation features
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Payroll Automation</h1>
              <p className="text-gray-400">Manage and automate x402-powered payments</p>
            </div>
            <div className="flex items-center gap-3">
              {/* User Wallet Balance */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-gray-700">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary-400" />
                  <div>
                    <div className="text-sm text-gray-400">Your Balance</div>
                    <div className="font-semibold text-white">
                      {userWalletBalance} USDC
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Treasury Balance */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-gray-700">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <div>
                    <div className="text-sm text-gray-400">Treasury</div>
                    <div className="font-semibold text-white">
                      {treasuryBalance} USDC
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Payee Modal */}
        {showAddPayee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Add New Payee</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payee Address
                  </label>
                  <input
                    type="text"
                    value={payeeForm.address}
                    onChange={(e) => setPayeeForm({...payeeForm, address: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Salary (USDC)
                  </label>
                  <input
                    type="number"
                    value={payeeForm.salary}
                    onChange={(e) => setPayeeForm({...payeeForm, salary: e.target.value})}
                    placeholder="1000"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPayee(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayee}
                  className="flex-1 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                >
                  Add Payee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Automation Controls */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Automated Payroll</h2>
              <p className="text-gray-400">
                Set up automatic payroll processing based on revenue thresholds
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${automationEnabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span className="text-sm text-gray-300">
                  {automationEnabled ? 'Automation active' : 'Automation paused'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleAutomation}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                  isRunning 
                    ? 'bg-error/20 text-error border border-error/30' 
                    : 'bg-success/20 text-success border border-success/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause Automation
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Start Automation
                  </>
                )}
              </button>
              
              <button
                onClick={triggerPayroll}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5" />
                    Run Payroll Now
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowAddPayee(true)}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Payee
              </button>
            </div>
          </div>
        </div>

        {/* Active Payees */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Active Payees</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="mt-2 text-gray-400">Loading payees...</p>
            </div>
          ) : activePayees.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Payees Found</h3>
              <p className="text-gray-400 mb-4">Add payees to start managing payroll</p>
              <button
                onClick={() => setShowAddPayee(true)}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                Add Your First Payee
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="text-left p-3 text-gray-300 font-medium">Address</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Monthly Salary</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Last Payment</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Accrued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activePayees.map((payee, index) => (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="p-3">
                        <div className="font-mono text-sm text-white">
                          {payee.address.substring(0, 8)}...{payee.address.substring(payee.address.length - 6)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">
                          ${(Number(payee.salary) / 1_000_000).toFixed(2)} USDC
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-300">
                          {payee.lastPayment.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-300">
                          ${(Number(payee.accrued) / 1_000_000).toFixed(2)} USDC
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue Threshold Settings */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Revenue Threshold Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Revenue to Trigger Payroll (USDC)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="10000"
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <button
                  onClick={handleUpdateThreshold}
                  className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                >
                  Update
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Payroll will automatically trigger when treasury balance exceeds this amount
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

// app/transactions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  CheckCircle, XCircle, Clock, ExternalLink,
  RefreshCw, Filter, Download, Search,
  DollarSign, Users, Settings, TrendingUp
} from 'lucide-react'
import { transactionStore, Transaction } from '@/lib/storage/transaction-store'
import { formatUSDC } from '@/lib/blockchain/treasury'
import { formatAddress } from '@/lib/utils/format'

export default function TransactionsPage() {
  const { authenticated } = usePrivy()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    if (authenticated) {
      loadTransactions()
      
      // Subscribe to updates
      const unsubscribe = transactionStore.subscribe((txs: Transaction[]) => {
        setTransactions(txs)
      })
      
      return unsubscribe
    }
  }, [authenticated])

  const loadTransactions = () => {
    // Access the private transactions map using a getter method
    // We'll need to add a getter to TransactionStore
    const allTransactions = transactionStore.getAllTransactions()
    setTransactions(allTransactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ))
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return null
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'add_payee': return <Users className="h-4 w-4" />
      case 'create_payments': return <DollarSign className="h-4 w-4" />
      case 'fund_treasury': return <TrendingUp className="h-4 w-4" />
      case 'update_threshold':
      case 'update_salary':
      case 'deactivate_payee': return <Settings className="h-4 w-4" />
      default: return null
    }
  }

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const filteredTransactions = transactions.filter(tx => {
    // Filter by status
    if (filter !== 'all' && tx.status !== filter) return false
    
    // Filter by type
    if (selectedType !== 'all' && tx.type !== selectedType) return false
    
    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        tx.hash.toLowerCase().includes(searchLower) ||
        tx.from.toLowerCase().includes(searchLower) ||
        tx.to.toLowerCase().includes(searchLower) ||
        tx.type.toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Status', 'From', 'To', 'Value', 'Hash', 'Block']
    const rows = transactions.map(tx => [
      new Date(tx.timestamp).toLocaleString(),
      getTypeLabel(tx.type),
      tx.status,
      tx.from,
      tx.to,
      tx.value || '0',
      tx.hash,
      tx.blockNumber || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `treasury-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const retryFailedTransactions = async () => {
    await transactionStore.retryFailedTransactions()
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view transaction history
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  const uniqueTypes = [...new Set(transactions.map(tx => tx.type))]

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-400">Track all treasury transactions and payments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{transactions.length}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-green-400">
              {transactions.filter(t => t.status === 'confirmed').length}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-400">
              {transactions.filter(t => t.status === 'pending').length}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-400">
              {transactions.filter(t => t.status === 'failed').length}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by hash, address, or type..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadTransactions}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            
            <button
              onClick={retryFailedTransactions}
              disabled={!transactions.some(t => t.status === 'failed')}
              className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Failed
            </button>
            
            <button
              onClick={exportToCSV}
              className="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="mt-2 text-gray-400">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Transactions Found</h3>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Type</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-300 font-medium">From</th>
                    <th className="text-left p-4 text-gray-300 font-medium">To</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Value</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-800/30">
                      <td className="p-4">
                        <div className="text-sm text-gray-300">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <span className="text-gray-300">{getTypeLabel(tx.type)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {getStatusIcon(tx.status)}
                          <span className="ml-1 capitalize">{tx.status}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-gray-300">
                          {formatAddress(tx.from)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-gray-300">
                          {formatAddress(tx.to)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-300">
                          {tx.value ? `${formatUSDC(tx.value)} USDC` : '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        {tx.hash && tx.hash !== 'pending' && (
                          <a
                            href={`https://cronos.org/explorer/testnet3/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm"
                          >
                            View <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}