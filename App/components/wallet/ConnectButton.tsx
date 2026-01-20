// components/wallet/ConnectButton.tsx
'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useDisconnect } from 'wagmi'
import { ChevronDown, LogOut, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { formatAddress } from '@/lib/utils/format'

export function ConnectButton() {
  const { login, logout, authenticated, user } = usePrivy()
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { wallets } = useWallets()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    await logout()
    setIsDropdownOpen(false)
  }

  if (!authenticated || !address) {
    return (
      <button
        onClick={() => login()}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-surface border border-gray-700 text-white font-medium hover:bg-gray-800 transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
        <span className="font-mono text-sm">{formatAddress(address)}</span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-surface border border-gray-700 shadow-xl z-50 animate-slide-up">
          <div className="p-3 border-b border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Connected with Privy</div>
            <div className="font-mono text-sm text-white truncate">
              {formatAddress(address)}
            </div>
          </div>
          
          <div className="p-1">
            <button
              onClick={handleCopy}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Address
                </>
              )}
            </button>
            
            <button
              onClick={handleDisconnect}
              className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}