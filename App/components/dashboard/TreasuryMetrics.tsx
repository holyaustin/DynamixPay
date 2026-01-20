// components/dashboard/TreasuryMetrics.tsx (Enhanced)
import React, { useState } from 'react'
import { AlertCircle, Info } from 'lucide-react'

interface TreasuryMetricsProps {
  title: string
  value: string
  change?: string
  icon: React.ReactNode
  loading?: boolean
  error?: boolean
  description?: string
  tooltip?: string
}

export default function TreasuryMetrics({ 
  title, 
  value, 
  change, 
  icon,
  loading = false,
  error = false,
  description,
  tooltip
}: TreasuryMetricsProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (loading) {
    return (
      <div className="bg-surface/50 rounded-xl p-5 border border-border animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
            <div className="flex-1">
              <div className="w-32 h-8 bg-gray-700 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface/50 rounded-xl p-5 border border-red-500/30 transition-colors hover:border-red-500/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <div className="text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">Error</div>
              <div className="text-sm font-medium text-red-400/70">
                Failed to load
              </div>
            </div>
          </div>
          {tooltip && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <Info className="h-4 w-4" />
              </button>
              {showTooltip && (
                <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="text-xs text-gray-300">{tooltip}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-sm font-medium text-gray-400">{title}</div>
        {description && (
          <div className="text-xs text-gray-500 mt-1">{description}</div>
        )}
      </div>
    )
  }

  const isPositive = change?.startsWith('+')
  const isNegative = change?.startsWith('-')
  const hasValidChange = change && !['N/A', 'Error', 'Pending', 'Unknown'].some(x => change.includes(x))

  return (
    <div className="bg-surface/50 rounded-xl p-5 border border-border hover:border-primary-500/30 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-900/30 flex items-center justify-center group-hover:bg-primary-900/50 transition-colors">
            <div className="text-primary-400 group-hover:text-primary-300 transition-colors">
              {icon}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {hasValidChange && (
              <div className={`text-sm font-medium ${
                isPositive ? 'text-green-400' : 
                isNegative ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {change}
              </div>
            )}
            {change && !hasValidChange && (
              <div className="text-sm font-medium text-gray-500">
                {change}
              </div>
            )}
          </div>
        </div>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <div className="text-xs text-gray-300">{tooltip}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-sm font-medium text-gray-400">{title}</div>
      {description && (
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      )}
      {change && !hasValidChange && (
        <div className="text-xs text-gray-500 mt-1">
          {change.includes('N/A') ? 'Data unavailable' : 
           change.includes('Error') ? 'Failed to fetch' : 
           change.includes('Pending') ? 'Waiting for update' : 
           change.includes('Unknown') ? 'Status unknown' : change}
        </div>
      )}
    </div>
  )
}