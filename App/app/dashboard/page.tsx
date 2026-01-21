// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import TreasuryMetrics from '@/components/dashboard/TreasuryMetrics'
import PayeeTable from '@/components/dashboard/PayeeTable'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { DollarSign, Users, TrendingUp, Clock, Plus, Settings, Play, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
}

export default function DashboardPage() {
  const { authenticated, user, ready } = usePrivy()
  const router = useRouter()
  const [balance, setBalance] = useState<bigint>(BigInt(0))
  const [payees, setPayees] = useState<Payee[]>([])
  const [totalAccrued, setTotalAccrued] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] = useState(false)

  useEffect(() => {
    if (!authenticated && ready) {
      router.push('/')
      return
    }
    
    if (authenticated) {
      fetchData()
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [authenticated, ready, router])

  const fetchData = async () => {
    try {
      // Mock data for demo - in production, fetch from your API
      const mockPayees: Payee[] = [
        {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7ec8E62a8c',
          salary: BigInt(100000000), // 100 USDC
          lastPayment: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          accrued: BigInt(50000000) // 50 USDC
        },
        {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7ec8E62a8d',
          salary: BigInt(150000000), // 150 USDC
          lastPayment: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (due)
          accrued: BigInt(150000000) // 150 USDC
        },
        {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7ec8E62a8e',
          salary: BigInt(200000000), // 200 USDC
          lastPayment: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          accrued: BigInt(100000000) // 100 USDC
        }
      ]
      
      setBalance(BigInt(5000000000)) // 5000 USDC
      setPayees(mockPayees)
      setTotalAccrued(BigInt(300000000)) // 300 USDC
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerPayroll = async () => {
    setPayrollLoading(true)
    try {
      const response = await fetch('/api/treasury/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: user?.wallet?.address,
          signature: '0x',
        }),
      })
      
      if (response.ok) {
        alert('Payroll triggered successfully!')
        fetchData()
      } else {
        throw new Error('Failed to trigger payroll')
      }
    } catch (error) {
      console.error('Failed to trigger payroll:', error)
      alert('Failed to trigger payroll. Please try again.')
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

  const totalMonthlyOutflow = payees.reduce((sum, p) => sum + Number(p.salary), 0)
  const formattedBalance = (Number(balance) / 1000000).toFixed(2)
  const duePayees = payees.filter(p => {
    const daysSincePayment = (Date.now() - p.lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    return daysSincePayment >= 30
  }).length

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Treasury Dashboard</h1>
              <p className="text-gray-400">Manage your on-chain payroll with x402 payments</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={viewNotifications}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
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
            title="USDC Balance"
            value={`$${formattedBalance}`}
            change="+2.5%"
            icon={<DollarSign className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={payees.length.toString()}
            change={`${duePayees} due`}
            icon={<Users className="h-5 w-5" />}
            loading={loading}
            status={duePayees > 0 ? 'warning' : 'normal'}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`$${(totalMonthlyOutflow / 1000000).toFixed(2)}`}
            change="+5%"
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Total Accrued"
            value={`$${(Number(totalAccrued) / 1000000).toFixed(2)}`}
            change="Pending"
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
                disabled={payrollLoading || payees.length === 0}
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
          {duePayees > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-yellow-500 mr-2" />
                <div className="text-yellow-500">
                  <span className="font-semibold">{duePayees} payee(s)</span> have payments due. Run payroll to process.
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
                Total: {payees.length} payees • {duePayees} due for payment
              </div>
            </div>
          </div>
          <PayeeTable payees={payees} loading={loading} />
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <div className="text-white font-medium">Treasury Funded</div>
                  <div className="text-sm text-gray-400">Added $5,000 USDC</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">2 hours ago</div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-medium">Payee Added</div>
                  <div className="text-sm text-gray-400">New developer added</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">1 day ago</div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}