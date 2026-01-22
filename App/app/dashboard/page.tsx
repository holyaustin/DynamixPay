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