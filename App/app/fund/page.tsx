// app/fund/page.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { DollarSign, ArrowUpRight, CheckCircle, AlertCircle } from 'lucide-react'
import { CONTRACTS, USDC_ABI } from '@/config/contracts'

export default function FundPage() {
  const { authenticated } = usePrivy()
  const { address } = useAccount()
  const { writeContract, isPending, isSuccess, error } = useWriteContract()

  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'input' | 'approve' | 'transfer'>('input')

  const handleFundTreasury = async () => {
    if (!amount || !address) return

    const amountInWei = parseUnits(amount, 6) // USDC has 6 decimals

    try {
      // First approve
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.TREASURY_MANAGER, amountInWei],
      })
      setStep('approve')

      // In production, you'd wait for approval then transfer
      // This is simplified - you should use useWaitForTransactionReceipt
    } catch (err) {
      console.error('Funding error:', err)
    }
  }

  const handleDirectTransfer = async () => {
    if (!amount || !address) return

    const amountInWei = parseUnits(amount, 6)

    writeContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [CONTRACTS.TREASURY_MANAGER, amountInWei],
    })
    setStep('transfer')
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
              Connect your wallet to fund the treasury
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
          <h1 className="text-3xl font-bold text-white">Fund Treasury</h1>
          <p className="text-gray-400">Add USDC to the treasury for payroll automation</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Funding Card */}
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <DollarSign className="h-10 w-10 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Add Funds</h2>
              <p className="text-gray-400">
                Transfer USDC to the treasury contract for automated payroll
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USDC)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">$</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">USDC</span>
                </div>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {['100', '500', '1000', '5000'].map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  className="py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                >
                  ${quickAmount}
                </button>
              ))}
            </div>

            {/* Contract Info */}
            <div className="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Treasury Contract</div>
              <div className="font-mono text-sm text-white break-all">
                {CONTRACTS.TREASURY_MANAGER}
              </div>
              <a
                href={`https://cronos.org/explorer/testnet3/address/${CONTRACTS.TREASURY_MANAGER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm mt-2"
              >
                View on Explorer
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </div>

            {/* Status Messages */}
            {isPending && (
              <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-warning mr-2" />
                  <div className="text-warning">
                    Transaction pending... Please confirm in your wallet
                  </div>
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success mr-2" />
                  <div className="text-success">
                    Transaction successful! Funds added to treasury.
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error mr-2" />
                  <div className="text-error">
                    Error: {error.message}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleFundTreasury}
                disabled={!amount || isPending}
                className="flex-1 py-3 rounded-lg bg-gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? 'Processing...' : 'Approve & Fund'}
              </button>
              
              <button
                onClick={handleDirectTransfer}
                disabled={!amount || isPending}
                className="flex-1 py-3 rounded-lg bg-surface border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Direct Transfer
              </button>
            </div>

            {/* Demo Info */}
            <div className="mt-8 pt-8 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Demo Instructions</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Connect to Cronos Testnet in your wallet</li>
                <li>• Get test USDC from the Cronos faucet</li>
                <li>• Start with $100-1000 for testing</li>
                <li>• Add payees before running payroll</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}