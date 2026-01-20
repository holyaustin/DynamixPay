// components/dashboard/TreasuryMetrics.tsx
interface TreasuryMetricsProps {
  title: string
  value: string
  change?: string
  icon: React.ReactNode
  loading?: boolean
}

export default function TreasuryMetrics({ 
  title, 
  value, 
  change, 
  icon,
  loading = false 
}: TreasuryMetricsProps) {
  if (loading) {
    return (
      <div className="bg-surface/50 rounded-xl p-5 border border-border animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
          <div className="w-24 h-8 bg-gray-700 rounded"></div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    )
  }

  const isPositive = change?.startsWith('+')
  const isNegative = change?.startsWith('-')

  return (
    <div className="bg-surface/50 rounded-xl p-5 border border-border hover:border-primary-500/30 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-900/30 flex items-center justify-center">
          <div className="text-primary-400">{icon}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{value}</div>
          {change && (
            <div className={`text-sm font-medium ${
              isPositive ? 'text-green-400' : 
              isNegative ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {change}
            </div>
          )}
        </div>
      </div>
      <div className="text-sm font-medium text-gray-400">{title}</div>
    </div>
  )
}