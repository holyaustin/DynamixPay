// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import TreasuryMetrics from '@/components/dashboard/TreasuryMetrics'
import PayeeTable from '@/components/dashboard/PayeeTable'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { DollarSign, Users, TrendingUp, Clock } from 'lucide-react'
import { getTreasuryBalance, getActivePayees, getTotalAccrued } from '@/lib/blockchain/treasury'

interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
}

export default function DashboardPage() {
  const { authenticated } = usePrivy()
  const [balance, setBalance] = useState<bigint>(BigInt(0))
  const [payees, setPayees] = useState<Payee[]>([])
  const [totalAccrued, setTotalAccrued] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated) return
    
    fetchData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [authenticated])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching dashboard data...')
      
      const [balanceData, payeesData, accruedData] = await Promise.allSettled([
        getTreasuryBalance(),
        getActivePayees(),
        getTotalAccrued()
      ])
      
      // Handle results with better error handling
      const errors = []
      
      if (balanceData.status === 'fulfilled') {
        setBalance(balanceData.value)
      } else {
        console.error('Failed to fetch balance:', balanceData.reason)
        setBalance(BigInt(0))
        errors.push('balance')
      }
      
      if (payeesData.status === 'fulfilled') {
        setPayees(payeesData.value)
      } else {
        console.error('Failed to fetch payees:', payeesData.reason)
        setPayees([])
        errors.push('payees')
      }
      
      if (accruedData.status === 'fulfilled') {
        setTotalAccrued(accruedData.value)
      } else {
        console.error('Failed to fetch accrued:', accruedData.reason)
        setTotalAccrued(BigInt(0))
        errors.push('accrued')
      }
      
      if (errors.length > 0) {
        setError(`Failed to load: ${errors.join(', ')}. Check console for details.`)
      }
      
    } catch (error) {
      console.error('Unexpected error fetching data:', error)
      setError('Failed to fetch data from blockchain. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const triggerPayroll = async () => {
    try {
      const response = await fetch('/api/treasury', {
        method: 'POST'
      })
      if (response.ok) {
        alert('Payroll triggered successfully!')
        fetchData()
      } else {
        alert('Failed to trigger payroll. Please try again.')
      }
    } catch (error) {
      console.error('Failed to trigger payroll:', error)
      alert('Failed to trigger payroll. Please check console for details.')
    }
  }

  if (!authenticated) {
    return (
      <Container>
        <div className="py-20 text-center">
          <div className="max-w-md mx-auto">
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

  const totalMonthlyOutflow = payees.reduce((sum, p) => sum + Number(p.salary), 0)
  const formattedBalance = (Number(balance) / 1000000).toFixed(2)
  const formattedOutflow = (totalMonthlyOutflow / 1000000).toFixed(2)
  const formattedAccrued = (Number(totalAccrued) / 1000000).toFixed(2)

  return (
    <Container>
      <div className="py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Treasury Dashboard</h1>
          <p className="text-gray-400">Manage your on-chain payroll with x402 payments</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <TreasuryMetrics
            title="USDC Balance"
            value={`${formattedBalance} USDC`}
            change="+2.5%"
            icon={<DollarSign className="h-5 w-5" />}
            loading={loading}
            error={error?.includes('balance')}
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={payees.length.toString()}
            change="+1"
            icon={<Users className="h-5 w-5" />}
            loading={loading}
            error={error?.includes('payees')}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`${formattedOutflow} USDC`}
            change="+5%"
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
            error={error?.includes('payees')}
          />
          
          <TreasuryMetrics
            title="Total Accrued"
            value={`${formattedAccrued} USDC`}
            change="Pending"
            icon={<Clock className="h-5 w-5" />}
            loading={loading}
            error={error?.includes('accrued')}
          />
        </div>

        {/* Actions */}
        <div className="mb-8 p-6 bg-surface/50 rounded-2xl border border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Payroll Automation</h3>
              <p className="text-gray-400">Trigger x402 payments for due payees</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={triggerPayroll}
                disabled={loading || payees.length === 0}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Processing...' : 'Run Payroll'}
              </button>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-surface border border-border text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button className="px-6 py-3 rounded-lg bg-surface border border-border text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors">
                Add Payee
              </button>
              <button className="px-6 py-3 rounded-lg bg-surface border border-border text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Payees Table */}
        <div className="bg-surface/30 rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Active Payees</h2>
                <p className="text-gray-400">Manage payroll recipients</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400">
                  Total: {payees.length} payees
                </div>
                {error?.includes('payees') && (
                  <span className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">
                    Data unavailable
                  </span>
                )}
              </div>
            </div>
          </div>
          <PayeeTable payees={payees} loading={loading} />
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-surface/20 rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Debug Info</h3>
            <div className="text-xs font-mono text-gray-500 space-y-1">
              <div>Balance: {balance.toString()}</div>
              <div>Payees: {payees.length}</div>
              <div>Total Accrued: {totalAccrued.toString()}</div>
              <div>Loading: {loading.toString()}</div>
              <div>Error: {error || 'none'}</div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}