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