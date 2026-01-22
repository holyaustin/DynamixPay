// app/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  TrendingUp, TrendingDown, DollarSign, Users,
  Calendar, BarChart3, PieChart, Download
} from 'lucide-react'
import { CONTRACTS, TREASURY_ABI } from '@/config/contracts'
import { getTreasuryBalance, getActivePayees, getTotalAccrued } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'

interface AnalyticsData {
  revenue: {
    total: number
    change: number
    history: { date: string; amount: number }[]
  }
  payments: {
    total: number
    count: number
    average: number
  }
  payees: {
    active: number
    inactive: number
    growth: number
  }
  expenses: {
    payroll: number
    gas: number
    fees: number
  }
}

export default function AnalyticsPage() {
  const { authenticated, user } = usePrivy()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revenueThreshold, setRevenueThreshold] = useState<string>('0')
  const [userFundedAmount, setUserFundedAmount] = useState<number>(0)

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchAnalyticsData()
      fetchUserFundedAmount()
    }
  }, [authenticated, timeRange, user])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch real data from blockchain
      const treasuryBalance = await getTreasuryBalance()
      const payees = await getActivePayees()
      const totalAccrued = await getTotalAccrued()
      
      // Filter out the first two payees (system payees)
      const filteredPayees = payees.slice(2)
      
      // Get revenue threshold
      try {
        const ethers = await import('ethers')
        const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
        const treasuryContract = new ethers.Contract(CONTRACTS.TREASURY_MANAGER, TREASURY_ABI, provider)
        const threshold = await treasuryContract.revenueThreshold()
        setRevenueThreshold(ethers.formatUnits(threshold, 6))
      } catch (error) {
        console.error('Failed to fetch revenue threshold:', error)
      }
      
      // Calculate real metrics
      const totalRevenue = Number(treasuryBalance) / 1_000_000
      const totalAccruedAmount = Number(totalAccrued) / 1_000_000
      const totalMonthlyOutflow = filteredPayees.reduce((sum, p) => sum + Number(p.salary) / 1_000_000, 0)
      
      // Calculate due payments
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const duePayees = filteredPayees.filter(p => p.lastPayment < thirtyDaysAgo).length
      
      // Get payment history from events (simplified - in production, query events)
      const paymentHistory = await getPaymentHistory(timeRange)
      
      // Calculate real gas fees (estimate: $0.01 per transaction * number of payees)
      const estimatedGasFees = filteredPayees.length * 0.01
      
      // Calculate service fees (0.1% of total payroll)
      const serviceFees = totalMonthlyOutflow * 0.001
      
      const analyticsData: AnalyticsData = {
        revenue: {
          total: totalRevenue,
          change: 12.5, // This would be calculated from historical data
          history: paymentHistory
        },
        payments: {
          total: duePayees,
          count: filteredPayees.length,
          average: filteredPayees.length > 0 ? totalMonthlyOutflow / filteredPayees.length : 0
        },
        payees: {
          active: filteredPayees.length,
          inactive: 0, // Would need to track inactive payees
          growth: 25 // Would calculate from historical data
        },
        expenses: {
          payroll: totalMonthlyOutflow,
          gas: estimatedGasFees,
          fees: serviceFees
        }
      }
      
      setData(analyticsData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserFundedAmount = async () => {
    if (!user?.wallet?.address) return
    
    try {
      // Query contract events to find funding transactions from this user
      // For now, using a placeholder - in production would query events
      setUserFundedAmount(500) // Example: $500 funded
    } catch (error) {
      console.error('Failed to fetch user funded amount:', error)
    }
  }

  const getPaymentHistory = async (range: string): Promise<{ date: string; amount: number }[]> => {
    // In production, query contract events for payment history
    // For now, return mock data
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    return Array.from({ length: days }, (_, i) => ({
      date: `Day ${i + 1}`,
      amount: Math.random() * 10000 + 1000
    }))
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to access treasury analytics
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  if (loading || !data) {
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
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Treasury Analytics</h1>
            <p className="text-gray-400">Real-time insights and performance metrics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-surface rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="px-4 py-2 rounded-lg bg-surface border border-border text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary-400" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                data.revenue.change >= 0 ? 'text-success' : 'text-error'
              }`}>
                {data.revenue.change >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(data.revenue.change)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${data.revenue.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400">Total Revenue</div>
            {revenueThreshold && (
              <div className="text-xs text-gray-500 mt-1">
                Threshold: ${parseFloat(revenueThreshold).toFixed(2)}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-secondary-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary-400" />
              </div>
              <span className="flex items-center text-sm font-medium text-success">
                <TrendingUp className="h-4 w-4 mr-1" />
                {data.payees.growth}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{data.payees.active}</div>
            <div className="text-sm text-gray-400">Active Payees</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.payments.total} due for payment
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{data.payments.total}</div>
            <div className="text-sm text-gray-400">Payments This Month</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg: ${data.payments.average.toFixed(2)}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-error/20 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-error" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              ${data.expenses.payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400">Monthly Payroll</div>
            <div className="text-xs text-gray-500 mt-1">
              Excluding first 2 system payees
            </div>
          </div>
        </div>

        {/* User Funding Card */}
        {userFundedAmount > 0 && (
          <div className="glass rounded-xl p-6 mb-8 border border-primary-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Contributions</h3>
                <p className="text-gray-400">Amount you've funded to the treasury</p>
              </div>
              <div className="text-2xl font-bold text-primary-400">
                ${userFundedAmount.toFixed(2)} USDC
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="glass rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
              <div className="text-sm text-gray-400">{timeRange} view</div>
            </div>
            <div className="h-64 flex items-end gap-1">
              {data.revenue.history.map((item, index) => (
                <div
                  key={index}
                  className="flex-1 relative group"
                  style={{ height: `${(item.amount / 12000) * 100}%` }}
                >
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-500 to-primary-300 rounded-t-lg transition-all group-hover:opacity-80"></div>
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.date}: ${item.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-sm text-gray-400">
              {data.revenue.history
                .filter((_, i) => i % (timeRange === '7d' ? 1 : timeRange === '30d' ? 5 : 15) === 0)
                .map((item) => (
                  <div key={item.date}>{item.date}</div>
                ))}
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Expenses Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Payroll', value: data.expenses.payroll, color: 'bg-primary-500' },
                { label: 'Gas Fees', value: data.expenses.gas, color: 'bg-secondary-500' },
                { label: 'Service Fees', value: data.expenses.fees, color: 'bg-warning' },
              ].map((item) => {
                const total = Object.values(data.expenses).reduce((a, b) => a + b, 0)
                const percentage = (item.value / total) * 100
                
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">{item.label}</span>
                      <span className="text-white font-medium">
                        ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Contract Stats */}
        <div className="mt-8 glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contract Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Contract Address</div>
              <div className="font-mono text-xs text-white truncate">
                {CONTRACTS.TREASURY_MANAGER}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Payment Token</div>
              <div className="font-mono text-xs text-white truncate">
                USDC.e (0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0)
              </div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Network</div>
              <div className="text-white">Cronos Testnet</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Total Accrued</div>
              <div className="text-xl font-bold text-white">
                ${(Number(data.payments.average * data.payments.count)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}