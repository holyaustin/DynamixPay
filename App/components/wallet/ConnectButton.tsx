// components/wallet/ConnectButton.tsx
'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ChevronDown, LogOut, Copy, Check, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatAddress } from '@/lib/utils/format'
import { getBalance } from '@/lib/blockchain/ethers-utils'

export function ConnectButton() {
  const { login, logout, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [userBalance, setUserBalance] = useState<string>('0.00')

  useEffect(() => {
    if (user?.wallet?.address) {
      fetchUserBalance()
    }
  }, [user])

  const fetchUserBalance = async () => {
    if (user?.wallet?.address) {
      try {
        const balance = await getBalance(user.wallet.address)
        setUserBalance(balance)
      } catch (error) {
        console.error('Failed to fetch user balance:', error)
      }
    }
  }

  const handleCopy = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDisconnect = async () => {
    await logout()
    setIsDropdownOpen(false)
  }

  if (!authenticated || !user?.wallet?.address) {
    return (
      <button
        onClick={() => login()}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-primary-500/25"
      >
        Connect Wallet
      </button>
    )
  }

  // Get user name from social login or email
  const userName = user?.twitter?.username || 
                   user?.google?.name || 
                   user?.email?.address?.split('@')[0] || 
                   'User'

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-surface border border-gray-700 text-white font-medium hover:bg-gray-800 transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">{userName}</span>
          <span className="font-mono text-xs text-gray-300">
            {formatAddress(user.wallet.address)}
          </span>
        </div>
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-surface border border-gray-700 shadow-xl z-50 animate-slide-up">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <div className="font-medium text-white">{userName}</div>
                <div className="font-mono text-xs text-gray-300 truncate max-w-[160px]">
                  {user.wallet.address}
                </div>
                <div className="text-sm text-green-400 mt-1">
                  {userBalance} USDC
                </div>
              </div>
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