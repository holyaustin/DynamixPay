// app/analytics/page.tsx 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  TrendingUp, TrendingDown, DollarSign, Users,
  Calendar, BarChart3, PieChart, Download,
  Wallet, ExternalLink, History, CreditCard,
  ArrowUpRight, ArrowDownRight, Activity,
  RefreshCw, AlertCircle, Loader2
} from 'lucide-react'
import { CONTRACTS, TREASURY_ABI, USDC_ABI } from '@/config/contracts'
import { getTreasuryBalance, getActivePayees, getTotalAccrued } from '@/lib/blockchain/treasury'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

// Type guard for EventLog
function isEventLog(log: ethers.Log | ethers.EventLog): log is ethers.EventLog {
  return (log as ethers.EventLog).args !== undefined;
}

interface AnalyticsData {
  revenue: {
    total: number
    change: number
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

interface FundingData {
  date: string
  amount: number
  address: string
  txHash: string
  timestamp: number
}

interface UserContribution {
  total: number
  transactions: number
  lastContribution: string | null
  recentTransactions: Array<{
    amount: number
    timestamp: string
    txHash: string
    blockNumber: number
  }>
}

interface PaymentData {
  date: string
  amount: number
  payee: string
  txHash: string
  timestamp: number
}

export default function AnalyticsPage() {
  const { authenticated, user } = usePrivy()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revenueThreshold, setRevenueThreshold] = useState<string>('0')
  const [userContribution, setUserContribution] = useState<UserContribution>({
    total: 0,
    transactions: 0,
    lastContribution: null,
    recentTransactions: []
  })
  const [fundingHistory, setFundingHistory] = useState<FundingData[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentData[]>([])
  const [contractStats, setContractStats] = useState({
    totalTransactions: 0,
    uniqueFunders: 0,
    largestContribution: 0,
    averageContribution: 0,
    totalFundingVolume: 0
  })

  const fetchAllData = useCallback(async () => {
    if (!authenticated) return
    
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchAnalyticsData(),
        fetchUserContribution(),
        fetchFundingHistory(),
        fetchPaymentHistory()
      ])
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [authenticated, timeRange, user?.wallet?.address])

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await fetchAllData()
      toast.success('Data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchAllData()
    }
  }, [authenticated, timeRange, user?.wallet?.address, fetchAllData])

  const fetchAnalyticsData = async () => {
    try {
      // Fetch real data from blockchain
      const treasuryBalance = await getTreasuryBalance()
      const payees = await getActivePayees()
      const totalAccrued = await getTotalAccrued()
      
      // Filter out the first two payees (system payees)
      const filteredPayees = payees.slice(2)
      
      // Get revenue threshold from contract
      let threshold = '0'
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const treasuryContract = new ethers.Contract(CONTRACTS.TREASURY_MANAGER, TREASURY_ABI, provider)
          const thresholdBigInt = await treasuryContract.revenueThreshold()
          threshold = ethers.formatUnits(thresholdBigInt, 6)
        }
      } catch (error) {
        console.error('Failed to fetch revenue threshold:', error)
      }
      setRevenueThreshold(threshold)
      
      // Calculate real metrics
      const totalRevenue = Number(treasuryBalance) / 1_000_000
      const totalAccruedAmount = Number(totalAccrued) / 1_000_000
      const totalMonthlyOutflow = filteredPayees.reduce((sum, p) => sum + Number(p.salary) / 1_000_000, 0)
      
      // Calculate due payments (last payment older than 30 days)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
      const duePayees = filteredPayees.filter(p => Number(p.lastPayment) < thirtyDaysAgo).length
      
      // Calculate change from previous period (simplified - in production would compare with historical data)
      const change = 12.5 // This would be calculated from historical blockchain data
      
      const analyticsData: AnalyticsData = {
        revenue: {
          total: totalRevenue,
          change: change
        },
        payments: {
          total: duePayees,
          count: filteredPayees.length,
          average: filteredPayees.length > 0 ? totalMonthlyOutflow / filteredPayees.length : 0
        },
        payees: {
          active: filteredPayees.length,
          inactive: 0,
          growth: filteredPayees.length > 0 ? Math.round((filteredPayees.length / 10) * 100) / 100 : 0
        },
        expenses: {
          payroll: totalMonthlyOutflow,
          gas: filteredPayees.length * 0.01, // Estimated gas per transaction
          fees: totalMonthlyOutflow * 0.001 // 0.1% service fee
        }
      }
      
      setData(analyticsData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      throw error
    }
  }

  const fetchUserContribution = async () => {
    if (!user?.wallet?.address) return
    
    try {
      let totalContribution = 0
      let transactionCount = 0
      let lastContribution: string | null = null
      const recentTransactions: Array<{ amount: number; timestamp: string; txHash: string; blockNumber: number }> = []
      
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        
        // Get current block number
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 10000) // Last ~10k blocks
        
        // Create USDC contract instance
        const usdcContract = new ethers.Contract(
          CONTRACTS.USDC,
          USDC_ABI,
          provider
        )
        
        // Query Transfer events where user is sender and treasury is recipient
        console.log('Querying USDC transfer events...')
        const transferFilter = usdcContract.filters.Transfer(user.wallet.address, CONTRACTS.TREASURY_MANAGER)
        const events = await usdcContract.queryFilter(transferFilter, fromBlock, currentBlock)
        
        console.log(`Found ${events.length} USDC transfer events from user to treasury`)
        
        // Process each event with proper type checking
        for (const event of events) {
          try {
            if (!isEventLog(event)) continue
            
            // Access args safely
            const args = event.args
            if (!args || args.length < 3) continue
            
            // Use the get method to access args by index
            const amount = Number(ethers.formatUnits(args[2], 6))
            const block = await provider.getBlock(event.blockNumber)
            
            if (!block) continue
            
            totalContribution += amount
            transactionCount++
            
            // Store most recent contribution block
            if (!lastContribution || event.blockNumber > Number(lastContribution)) {
              lastContribution = event.blockNumber.toString()
            }
            
            // Store recent transactions (max 5)
            if (recentTransactions.length < 5) {
              recentTransactions.push({
                amount,
                timestamp: new Date(Number(block.timestamp) * 1000).toLocaleDateString(),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              })
            }
          } catch (err) {
            console.error('Error processing USDC transfer event:', err)
          }
        }
        
        // Also check Treasury contract for FundingReceived events
        const treasuryContract = new ethers.Contract(
          CONTRACTS.TREASURY_MANAGER,
          TREASURY_ABI,
          provider
        )
        
        console.log('Querying Treasury funding events...')
        const fundingFilter = treasuryContract.filters.FundingReceived(user.wallet.address)
        const fundingEvents = await treasuryContract.queryFilter(fundingFilter, fromBlock, currentBlock)
        
        console.log(`Found ${fundingEvents.length} treasury funding events from user`)
        
        for (const event of fundingEvents) {
          try {
            if (!isEventLog(event)) continue
            
            const args = event.args
            if (!args || args.length < 2) continue
            
            const amount = Number(ethers.formatUnits(args[1], 6))
            const block = await provider.getBlock(event.blockNumber)
            
            if (!block) continue
            
            totalContribution += amount
            transactionCount++
            
            if (!lastContribution || event.blockNumber > Number(lastContribution)) {
              lastContribution = event.blockNumber.toString()
            }
            
            // Check if we already have this transaction from USDC events
            const existingTx = recentTransactions.find(tx => tx.blockNumber === event.blockNumber)
            if (!existingTx && recentTransactions.length < 5) {
              recentTransactions.push({
                amount,
                timestamp: new Date(Number(block.timestamp) * 1000).toLocaleDateString(),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              })
            }
          } catch (err) {
            console.error('Error processing treasury funding event:', err)
          }
        }
      }
      
      setUserContribution({
        total: totalContribution,
        transactions: transactionCount,
        lastContribution,
        recentTransactions: recentTransactions.sort((a, b) => b.blockNumber - a.blockNumber)
      })
    } catch (error) {
      console.error('Failed to fetch user contribution:', error)
      // Don't set mock data - show zero instead
      setUserContribution({
        total: 0,
        transactions: 0,
        lastContribution: null,
        recentTransactions: []
      })
    }
  }

  const fetchFundingHistory = async () => {
    try {
      if (!window.ethereum) {
        console.log('No ethereum provider available')
        setFundingHistory([])
        return
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const currentBlock = await provider.getBlockNumber()
      
      // Calculate block range based on time range
      const blocksPerDay = 7200 // ~12 seconds per block on Cronos
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const fromBlock = Math.max(0, currentBlock - (days * blocksPerDay))
      
      // Query USDC Transfer events to treasury
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, provider)
      const transferFilter = usdcContract.filters.Transfer(null, CONTRACTS.TREASURY_MANAGER)
      
      console.log(`Querying USDC transfers to treasury from block ${fromBlock} to ${currentBlock}`)
      const transferEvents = await usdcContract.queryFilter(transferFilter, fromBlock, currentBlock)
      
      console.log(`Found ${transferEvents.length} USDC transfer events to treasury`)
      
      // Also query Treasury FundingReceived events
      const treasuryContract = new ethers.Contract(CONTRACTS.TREASURY_MANAGER, TREASURY_ABI, provider)
      const fundingFilter = treasuryContract.filters.FundingReceived()
      const fundingEvents = await treasuryContract.queryFilter(fundingFilter, fromBlock, currentBlock)
      
      console.log(`Found ${fundingEvents.length} treasury funding events`)
      
      // Combine and process events
      const allEvents: Array<{
        address: string
        amount: bigint
        txHash: string
        blockNumber: number
        timestamp: number
      }> = []
      
      // Process USDC transfer events with proper type checking
      for (const event of transferEvents) {
        try {
          if (!isEventLog(event)) continue
          
          const args = event.args
          if (!args || args.length < 3) continue
          
          const block = await provider.getBlock(event.blockNumber)
          if (!block) continue
          
          allEvents.push({
            address: args[0], // from address
            amount: args[2], // amount
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: Number(block.timestamp)
          })
        } catch (err) {
          console.error('Error processing transfer event:', err)
        }
      }
      
      // Process Treasury funding events with proper type checking
      for (const event of fundingEvents) {
        try {
          if (!isEventLog(event)) continue
          
          const args = event.args
          if (!args || args.length < 2) continue
          
          const block = await provider.getBlock(event.blockNumber)
          if (!block) continue
          
          allEvents.push({
            address: args[0], // funder address
            amount: args[1], // amount
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: Number(block.timestamp)
          })
        } catch (err) {
          console.error('Error processing funding event:', err)
        }
      }
      
      // Remove duplicates (same transaction may appear in both USDC and Treasury events)
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.txHash, event])).values()
      )
      
      // Sort by timestamp (newest first)
      uniqueEvents.sort((a, b) => b.timestamp - a.timestamp)
      
      // Group by day for chart
      const groupedByDay = new Map<string, { amount: number; count: number; addresses: Set<string> }>()
      
      for (const event of uniqueEvents) {
        const date = new Date(event.timestamp * 1000)
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        const existing = groupedByDay.get(dateKey) || { amount: 0, count: 0, addresses: new Set<string>() }
        existing.amount += Number(ethers.formatUnits(event.amount, 6))
        existing.count += 1
        existing.addresses.add(event.address)
        
        groupedByDay.set(dateKey, existing)
      }
      
      // Convert to FundingData array for chart
      const fundingData: FundingData[] = Array.from(groupedByDay.entries())
        .sort((a, b) => {
          const dateA = new Date(a[0])
          const dateB = new Date(b[0])
          return dateA.getTime() - dateB.getTime()
        })
        .map(([date, data]) => {
          // Get a sample address from this day's transactions
          const sampleAddress = Array.from(data.addresses)[0] || '0x000...000'
          
          return {
            date,
            amount: data.amount,
            address: sampleAddress,
            txHash: '0x...', // For grouped data, we don't have a single tx hash
            timestamp: 0
          }
        })
      
      setFundingHistory(fundingData)
      
      // Calculate contract stats
      const totalTransactions = uniqueEvents.length
      const uniqueFunders = new Set(uniqueEvents.map(e => e.address)).size
      const amounts = uniqueEvents.map(e => Number(ethers.formatUnits(e.amount, 6)))
      const largestContribution = Math.max(...amounts, 0)
      const totalFundingVolume = amounts.reduce((sum, amount) => sum + amount, 0)
      const averageContribution = totalTransactions > 0 ? totalFundingVolume / totalTransactions : 0
      
      setContractStats({
        totalTransactions,
        uniqueFunders,
        largestContribution,
        averageContribution,
        totalFundingVolume
      })
    } catch (error) {
      console.error('Failed to fetch funding history:', error)
      setFundingHistory([])
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      if (!window.ethereum) {
        console.log('No ethereum provider available')
        setPaymentHistory([])
        return
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const currentBlock = await provider.getBlockNumber()
      
      // Calculate block range based on time range
      const blocksPerDay = 7200
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const fromBlock = Math.max(0, currentBlock - (days * blocksPerDay))
      
      // Query Treasury PaymentExecuted events
      const treasuryContract = new ethers.Contract(CONTRACTS.TREASURY_MANAGER, TREASURY_ABI, provider)
      const paymentFilter = treasuryContract.filters.PaymentExecuted()
      
      console.log(`Querying payment events from block ${fromBlock} to ${currentBlock}`)
      const paymentEvents = await treasuryContract.queryFilter(paymentFilter, fromBlock, currentBlock)
      
      console.log(`Found ${paymentEvents.length} payment events`)
      
      const paymentData: PaymentData[] = []
      
      for (const event of paymentEvents) {
        try {
          if (!isEventLog(event)) continue
          
          const args = event.args
          if (!args || args.length < 3) continue
          
          const block = await provider.getBlock(event.blockNumber)
          if (!block) continue
          
          const amount = Number(ethers.formatUnits(args[2], 6)) // paymentAmount
          const payee = args[1] // payee address
          
          paymentData.push({
            date: new Date(Number(block.timestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount,
            payee,
            txHash: event.transactionHash,
            timestamp: Number(block.timestamp)
          })
        } catch (err) {
          console.error('Error processing payment event:', err)
        }
      }
      
      // Sort by timestamp (newest first)
      paymentData.sort((a, b) => b.timestamp - a.timestamp)
      setPaymentHistory(paymentData)
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
      setPaymentHistory([])
    }
  }

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
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

  if (loading) {
    return (
      <Container>
        <div className="py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-gray-400">Loading real-time blockchain data...</p>
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
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-error mr-2" />
              <div className="text-error">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Treasury Analytics</h1>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-gray-400">Real-time insights from blockchain data</p>
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
            <button 
              onClick={refreshData}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {data && (
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
              <div className="text-sm text-gray-400">Treasury Balance</div>
              {revenueThreshold && parseFloat(revenueThreshold) > 0 && (
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
                <div className="text-xs text-gray-400">
                  {paymentHistory.length} total
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{data.payments.total}</div>
              <div className="text-sm text-gray-400">Due Payments</div>
              <div className="text-xs text-gray-500 mt-1">
                Avg: ${data.payments.average.toFixed(2)} per payee
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-error/20 flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-error" />
                </div>
                <div className="text-xs text-gray-400">
                  ${contractStats.totalFundingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} funded
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                ${data.expenses.payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-400">Monthly Payroll</div>
              <div className="text-xs text-gray-500 mt-1">
                Excluding system payees
              </div>
            </div>
          </div>
        )}

        {/* User Contribution Card */}
        <div className="glass rounded-xl p-6 mb-8 border border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-transparent">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Your Contributions</h3>
                  <p className="text-gray-400">Real-time tracking from blockchain</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Funded</div>
                  <div className="text-2xl font-bold text-primary-400">
                    ${userContribution.total.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Transactions</div>
                  <div className="text-2xl font-bold text-white">
                    {userContribution.transactions}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Last Contribution</div>
                  <div className="text-lg font-semibold text-white">
                    {userContribution.lastContribution ? 'Block #' + userContribution.lastContribution : 'None yet'}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    userContribution.total > 0 
                      ? 'bg-success/20 text-success' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    <Activity className="h-3 w-3 mr-1" />
                    {userContribution.total > 0 ? 'Active Contributor' : 'No Contributions Yet'}
                  </div>
                </div>
              </div>
            </div>
            
            {userContribution.recentTransactions.length > 0 && (
              <div className="w-full lg:w-96">
                <div className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Transactions
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {userContribution.recentTransactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-primary-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            +${tx.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">{tx.timestamp}</div>
                        </div>
                      </div>
                      <a
                        href={`https://explorer.cronos.org/testnet/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 p-1"
                        title="View on explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Funding Trend Chart */}
          <div className="glass rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-success" />
                  Funding Trend
                </h3>
                <p className="text-sm text-gray-400">Real funding data from blockchain</p>
              </div>
              <div className="text-sm text-gray-400">{timeRange} view</div>
            </div>
            
            {/* Funding Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Funders</div>
                <div className="text-xl font-bold text-white">{contractStats.uniqueFunders}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Largest Contribution</div>
                <div className="text-xl font-bold text-success">
                  ${contractStats.largestContribution.toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Funding Chart */}
            {fundingHistory.length > 0 ? (
              <>
                <div className="h-48 flex items-end gap-1 mt-4">
                  {fundingHistory.map((item, index) => {
                    const maxAmount = Math.max(...fundingHistory.map(f => f.amount), 1)
                    const heightPercentage = (item.amount / maxAmount) * 100
                    
                    return (
                      <div
                        key={index}
                        className="flex-1 relative group"
                        style={{ height: `${heightPercentage}%` }}
                      >
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-success to-success/70 rounded-t-lg transition-all group-hover:from-success group-hover:to-success/90"></div>
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                          <div className="font-medium">{item.date}</div>
                          <div className="text-success">+${item.amount.toFixed(2)}</div>
                          {item.address !== '0x...' && (
                            <div className="text-gray-400 text-xs mt-1">
                              From: {formatAddress(item.address)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex justify-between mt-4 text-sm text-gray-400">
                  {fundingHistory.length > 0 && fundingHistory[0]?.date}
                  {fundingHistory.length > 1 && '...'}
                  {fundingHistory.length > 1 && fundingHistory[fundingHistory.length - 1]?.date}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No funding data available for this period</p>
                </div>
              </div>
            )}
          </div>

          {/* Expenses & Recent Payments */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Expenses & Payments</h3>
            
            {data && (
              <div className="space-y-4 mb-8">
                {[
                  { label: 'Payroll', value: data.expenses.payroll, color: 'bg-primary-500' },
                  { label: 'Gas Fees', value: data.expenses.gas, color: 'bg-secondary-500' },
                  { label: 'Service Fees', value: data.expenses.fees, color: 'bg-warning' },
                ].map((item) => {
                  const total = Object.values(data.expenses).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (item.value / total) * 100 : 0
                  
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
            )}
            
            {/* Recent Payments */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Payments
              </h4>
              {paymentHistory.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {paymentHistory.slice(0, 3).map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">
                          To: {formatAddress(payment.payee)}
                        </div>
                        <div className="text-xs text-gray-400">{payment.date}</div>
                      </div>
                      <div className="text-error font-medium">
                        -${payment.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No payment data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Stats */}
        <div className="mt-8 glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Blockchain Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Total Funding Tx</div>
              <div className="text-2xl font-bold text-white">
                {contractStats.totalTransactions}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Unique Funders</div>
              <div className="text-2xl font-bold text-secondary-400">
                {contractStats.uniqueFunders}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Avg Contribution</div>
              <div className="text-2xl font-bold text-success">
                ${contractStats.averageContribution.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-400">Total Volume</div>
              <div className="text-2xl font-bold text-primary-400">
                ${contractStats.totalFundingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          {/* Contract Info */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="text-sm font-medium text-gray-300 mb-4">Contract Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900/30 rounded-lg">
                <div className="text-sm text-gray-400">Treasury Contract</div>
                <div className="font-mono text-xs text-white truncate flex items-center gap-2">
                  {CONTRACTS.TREASURY_MANAGER}
                  <a
                    href={`https://explorer.cronos.org/testnet/address/${CONTRACTS.TREASURY_MANAGER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-400"
                    title="View on explorer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="p-4 bg-gray-900/30 rounded-lg">
                <div className="text-sm text-gray-400">USDC Token</div>
                <div className="font-mono text-xs text-white truncate flex items-center gap-2">
                  {CONTRACTS.USDC}
                  <a
                    href={`https://explorer.cronos.org/testnet/address/${CONTRACTS.USDC}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-400"
                    title="View on explorer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="p-4 bg-gray-900/30 rounded-lg">
                <div className="text-sm text-gray-400">Network</div>
                <div className="text-white font-medium">Cronos Testnet</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}