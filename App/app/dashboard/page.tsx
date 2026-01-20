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

  useEffect(() => {
    if (!authenticated) return
    
    fetchData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [authenticated])

  const fetchData = async () => {
    try {
      const [balanceData, payeesData, accruedData] = await Promise.all([
        getTreasuryBalance(),
        getActivePayees(),
        getTotalAccrued()
      ])
      setBalance(balanceData)
      setPayees(payeesData)
      setTotalAccrued(accruedData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
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
      }
    } catch (error) {
      console.error('Failed to trigger payroll:', error)
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

  return (
    <Container>
      <div className="py-8">
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
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={payees.length.toString()}
            change="+1"
            icon={<Users className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`${(totalMonthlyOutflow / 1000000).toFixed(2)} USDC`}
            change="+5%"
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Total Accrued"
            value={`${(Number(totalAccrued) / 1000000).toFixed(2)} USDC`}
            change="Pending"
            icon={<Clock className="h-5 w-5" />}
            loading={loading}
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
              <div className="text-sm text-gray-400">
                Total: {payees.length} payees
              </div>
            </div>
          </div>
          <PayeeTable payees={payees} loading={loading} />
        </div>
      </div>
    </Container>
  )
}