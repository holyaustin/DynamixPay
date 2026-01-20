// components/dashboard/PayeeTable.tsx
'use client'

import { useState } from 'react'
import { ExternalLink, MoreVertical } from 'lucide-react'
import { formatAddress, formatUSDC } from '@/lib/utils/format'

interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
}

interface PayeeTableProps {
  payees: Payee[]
  loading: boolean
}

export default function PayeeTable({ payees, loading }: PayeeTableProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    if (date.getFullYear() === 1970) return 'Never'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading && payees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p className="mt-2 text-gray-400">Loading payees...</p>
      </div>
    )
  }

  if (payees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <div className="text-2xl">👤</div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Payees Found</h3>
        <p className="text-gray-400">Add payees to start managing payroll</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-900/50">
          <tr>
            <th className="text-left p-4 text-gray-300 font-medium">Payee</th>
            <th className="text-left p-4 text-gray-300 font-medium hidden md:table-cell">Salary</th>
            <th className="text-left p-4 text-gray-300 font-medium">Last Paid</th>
            <th className="text-left p-4 text-gray-300 font-medium hidden lg:table-cell">Accrued</th>
            <th className="text-left p-4 text-gray-300 font-medium">Status</th>
            <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {payees.map((payee, index) => (
            <tr key={index} className="hover:bg-gray-800/30 transition-colors">
              <td className="p-4">
                <div>
                  <div className="font-mono text-sm text-white">
                    {formatAddress(payee.address)}
                  </div>
                  <a
                    href={`https://cronos.org/explorer/testnet3/address/${payee.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-gray-400 hover:text-primary-400 mt-1"
                  >
                    View on explorer
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </td>
              <td className="p-4 hidden md:table-cell">
                <div className="font-semibold text-white">
                  {formatUSDC(payee.salary)} USDC
                </div>
                <div className="text-xs text-gray-400">Monthly</div>
              </td>
              <td className="p-4">
                <div className="text-gray-300">{formatDate(payee.lastPayment)}</div>
              </td>
              <td className="p-4 hidden lg:table-cell">
                <div className="text-gray-300">
                  {formatUSDC(payee.accrued)} USDC
                </div>
              </td>
              <td className="p-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                  Active
                </span>
              </td>
              <td className="p-4">
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === payee.address ? null : payee.address)}
                    className="p-1 hover:bg-gray-800 rounded"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                  
                  {activeMenu === payee.address && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-surface border border-border shadow-xl z-10 animate-fade-in">
                      <div className="p-1">
                        <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md">
                          Send Payment
                        </button>
                        <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md">
                          Edit Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}