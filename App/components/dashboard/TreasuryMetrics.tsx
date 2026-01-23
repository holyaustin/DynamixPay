// components/dashboard/TreasuryMetrics.tsx

interface TreasuryMetricsProps {
  title: string
  value: string
  change?: string
  icon: React.ReactNode
  loading?: boolean
  status?: 'normal' | 'warning' | 'success' | 'pending' | 'error'
}

export default function TreasuryMetrics({ 
  title, 
  value, 
  change, 
  icon,
  loading = false,
  status = 'normal'
}: TreasuryMetricsProps) {
  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-gray-800 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-gray-800 rounded-lg"></div>
          <div className="w-24 h-8 bg-gray-800 rounded"></div>
        </div>
        <div className="h-4 bg-gray-800 rounded w-3/4"></div>
      </div>
    )
  }

  const isPositive = change?.startsWith('+')
  const isNegative = change?.startsWith('-')
  
  const statusColors = {
    normal: 'border-gray-800',
    warning: 'border-yellow-500/30',
    success: 'border-green-500/30',
    pending: 'border-blue-500/30',
    error: 'border-red-500/30'
  }

  const statusBg = {
    normal: 'bg-gray-900/50',
    warning: 'bg-yellow-500/10',
    success: 'bg-green-500/10',
    pending: 'bg-blue-500/10',
    error: 'bg-red-500/10'
  }

  const statusIconColor = {
    normal: 'text-primary-400',
    warning: 'text-yellow-400',
    success: 'text-green-400',
    pending: 'text-blue-400',
    error: 'text-red-400'
  }

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-xl p-5 border ${statusColors[status]} hover:border-primary-500/30 transition-colors ${statusBg[status]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          status === 'warning' ? 'bg-yellow-500/20' :
          status === 'success' ? 'bg-green-500/20' :
          status === 'pending' ? 'bg-blue-500/20' :
          status === 'error' ? 'bg-red-500/20' :
          'bg-primary-500/20'
        }`}>
          <div className={statusIconColor[status]}>
            {icon}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{value}</div>
          {change && (
            <div className={`text-sm font-medium ${
              isPositive ? 'text-green-400' : 
              isNegative ? 'text-red-400' : 
              status === 'pending' ? 'text-blue-400' :
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