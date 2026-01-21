//app/payroll/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, Clock, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw 
} from 'lucide-react'

interface PaymentRequest {
  id: number
  payee: string
  amount: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  date: string
  txHash?: string
}

export default function PayrollPage() {
  const { authenticated, user } = usePrivy()
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authenticated) {
      fetchPaymentRequests()
    }
  }, [authenticated])

  const fetchPaymentRequests = async () => {
    try {
      // This would fetch from your API
      const mockData: PaymentRequest[] = [
        {
          id: 1,
          payee: '0x742d35Cc6634C0532925a3b844Bc9e...',
          amount: '2500.00',
          status: 'pending',
          date: '2024-01-15',
        },
        {
          id: 2,
          payee: '0x742d35Cc6634C0532925a3b844Bc9e...',
          amount: '1800.00',
          status: 'completed',
          date: '2024-01-14',
          txHash: '0xabc...123'
        },
      ]
      setPaymentRequests(mockData)
    } catch (error) {
      console.error('Failed to fetch payment requests:', error)
    }
  }

  const triggerPayroll = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/treasury/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: user?.wallet?.address,
          signature: '0x', // This should be generated properly
        }),
      })

      if (response.ok) {
        alert('Payroll triggered successfully!')
        fetchPaymentRequests()
      }
    } catch (error) {
      console.error('Failed to trigger payroll:', error)
      alert('Failed to trigger payroll')
    } finally {
      setLoading(false)
    }
  }

  const toggleAutomation = () => {
    setIsRunning(!isRunning)
    // In production, this would update a setting in your backend
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
          <h1 className="text-3xl font-bold text-white">Payroll Automation</h1>
          <p className="text-gray-400">Manage and automate x402-powered payments</p>
        </div>

        {/* Automation Controls */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Automated Payroll</h2>
              <p className="text-gray-400">
                Set up automatic payroll processing based on revenue thresholds
              </p>
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
                className="px-6 py-3 rounded-lg bg-gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            </div>
          </div>
        </div>

        {/* Payment Requests */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-white">Recent Payment Requests</h2>
            <p className="text-gray-400">Track x402 payment requests and settlements</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">ID</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Payee</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paymentRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-800/30">
                    <td className="p-4">
                      <div className="font-mono text-sm text-white">#{request.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-sm text-white truncate max-w-[200px]">
                        {request.payee}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        ${request.amount} USDC
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'completed' 
                          ? 'bg-success/20 text-success border border-success/30'
                          : request.status === 'processing'
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-gray-700 text-gray-300 border border-gray-600'
                      }`}>
                        {request.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {request.status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {request.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300">{request.date}</div>
                    </td>
                    <td className="p-4">
                      {request.txHash && (
                        <a
                          href={`https://cronos.org/explorer/testnet3/tx/${request.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          View TX
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Container>
  )
}