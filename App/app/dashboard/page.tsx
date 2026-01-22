// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import TreasuryMetrics from '@/components/dashboard/TreasuryMetrics'
import PayeeTable from '@/components/dashboard/PayeeTable'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, TrendingUp, Clock, Plus, 
  Settings, Play, Bell, Wallet 
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { 
  getTreasuryBalance, 
  getActivePayees, 
  getTotalAccrued,
  createPaymentRequests
} from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'

interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
  active: boolean
}

interface DashboardData {
  treasuryBalance: bigint
  payees: Payee[]
  totalAccrued: bigint
  totalMonthlyOutflow: bigint
  duePayeesCount: number
  userBalance: string
}

export default function DashboardPage() {
  const { authenticated, user, ready } = usePrivy()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [treasuryBalance, payeesData, totalAccrued] = await Promise.all([
        getTreasuryBalance(),
        getActivePayees(),
        getTotalAccrued()
      ])
      
      // Calculate due payees
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const duePayeesCount = payeesData.filter(payee => 
        payee.lastPayment < thirtyDaysAgo
      ).length
      
      // Calculate total monthly outflow
      const totalMonthlyOutflow = payeesData.reduce(
        (sum, payee) => sum + payee.salary, 
        BigInt(0)
      )
      
      // Get user wallet balance if available
      let userBalance = '0.00'
      if (user?.wallet?.address) {
        try {
          userBalance = await getBalance(user.wallet.address)
        } catch (err) {
          console.error('Failed to fetch user balance:', err)
        }
      }

      setData({
        treasuryBalance,
        payees: payeesData,
        totalAccrued,
        totalMonthlyOutflow,
        duePayeesCount,
        userBalance
      })
      
      // Update user wallet balance separately for the UI component
      setUserWalletBalance(userBalance)

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authenticated && ready) {
      router.push('/')
      return
    }
    
    if (authenticated) {
      fetchDashboardData()
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000)
      
      return () => clearInterval(interval)
    }
  }, [authenticated, ready, router])

  const triggerPayroll = async () => {
    if (!user) {
      alert('Please connect your wallet')
      return
    }

    setPayrollLoading(true)
    try {
      // Check if ethereum provider is available
      if (!(window as any).ethereum) {
        throw new Error('No wallet provider found. Please install MetaMask or use a Web3 wallet.')
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers')
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      
      // Call createPaymentRequests
      const result = await createPaymentRequests(signer)
      
      if (result.success) {
        alert('Payroll triggered successfully!')
        // Refresh data
        await fetchDashboardData()
      } else {
        throw new Error(result.error || 'Failed to trigger payroll')
      }
    } catch (error) {
      console.error('Failed to trigger payroll:', error)
      alert(`Failed to trigger payroll: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPayrollLoading(false)
    }
  }

  const addPayee = () => {
    router.push('/payroll?action=add')
  }

  const manageSettings = () => {
    router.push('/payroll?action=settings')
  }

  const viewNotifications = () => {
    alert('Notifications feature coming soon!')
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

  // Safe calculations with null checks
  const formattedTreasuryBalance = data ? Number(data.treasuryBalance) / 1_000_000 : 0
  const formattedTotalMonthlyOutflow = data ? Number(data.totalMonthlyOutflow) / 1_000_000 : 0
  const formattedTotalAccrued = data ? Number(data.totalAccrued) / 1_000_000 : 0
  const duePayeesCount = data?.duePayeesCount || 0
  const totalPayees = data?.payees.length || 0

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Treasury Dashboard</h1>
              <p className="text-gray-400">Real-time treasury management with x402 payments</p>
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
              
              <button
                onClick={viewNotifications}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {duePayeesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
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
            icon={<DollarSign className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={totalPayees.toString()}
            change={duePayeesCount > 0 ? `${duePayeesCount} due` : undefined}
            icon={<Users className="h-5 w-5" />}
            loading={loading}
            status={duePayeesCount > 0 ? 'warning' : 'normal'}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`$${formattedTotalMonthlyOutflow.toFixed(2)}`}
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
          
          {/* Due Payments Alert - FIXED: Using duePayeesCount variable */}
          {duePayeesCount > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-yellow-500 mr-2" />
                <div className="text-yellow-500">
                  <span className="font-semibold">{duePayeesCount} payee(s)</span> have payments due. Run payroll to process.
                </div>
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
                Total: {totalPayees} payees • {duePayeesCount} due for payment
              </div>
            </div>
          </div>
          <PayeeTable payees={data?.payees || []} loading={loading} />
        </div>

        {/* Contract Info */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contract Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">Cronos Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}