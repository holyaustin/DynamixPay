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
  const { authenticated } = usePrivy()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authenticated) {
      fetchAnalyticsData()
    }
  }, [authenticated, timeRange])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Mock data - in production, fetch from your API
      const mockData: AnalyticsData = {
        revenue: {
          total: 152400,
          change: 12.5,
          history: Array.from({ length: 30 }, (_, i) => ({
            date: `Jan ${i + 1}`,
            amount: Math.random() * 10000 + 1000
          }))
        },
        payments: {
          total: 24,
          count: 156,
          average: 1560.42
        },
        payees: {
          active: 12,
          inactive: 3,
          growth: 25
        },
        expenses: {
          payroll: 42000,
          gas: 245.50,
          fees: 1200.75
        }
      }
      setData(mockData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
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
              ${data.revenue.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Revenue</div>
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
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{data.payments.total}</div>
            <div className="text-sm text-gray-400">Payments This Month</div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-error/20 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-error" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              ${data.expenses.payroll.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Monthly Payroll</div>
          </div>
        </div>

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
                .filter((_, i) => i % 5 === 0)
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
                        ${item.value.toLocaleString()}
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
      </div>
    </Container>
  )
}