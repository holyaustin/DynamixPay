// app/fund/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, ArrowUpRight, CheckCircle, 
  AlertCircle, ExternalLink, Wallet 
} from 'lucide-react'
import { getTreasuryBalance } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import { CONTRACTS, USDC_ABI } from '@/config/contracts'

export default function FundPage() {
  const { authenticated, user } = usePrivy()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'input' | 'approve' | 'transfer' | 'complete'>('input')
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(BigInt(0))
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [loading, setLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (authenticated) {
      fetchTreasuryBalance()
      fetchUserBalance()
    }
  }, [authenticated])

  const fetchTreasuryBalance = async () => {
    try {
      const balance = await getTreasuryBalance()
      setTreasuryBalance(balance)
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error)
    }
  }

  const fetchUserBalance = async () => {
    if (user?.wallet?.address) {
      try {
        const balance = await getBalance(user.wallet.address)
        setUserWalletBalance(balance)
      } catch (error) {
        console.error('Failed to fetch user balance:', error)
      }
    }
  }

  const handleApproveAndFund = async () => {
    if (!amount || !user?.wallet?.address) {
      alert('Please enter an amount and connect wallet')
      return
    }

    const provider = await (window as any).ethereum
    if (!provider) {
      alert('No wallet provider found')
      return
    }

    setLoading(true)
    setError('')
    setStep('approve')

    try {
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Create USDC contract instance with signer
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signer)
      
      // Parse amount
      const amountWei = ethers.parseUnits(amount, 6)
      
      // Check balance
      const balance = await usdcContract.balanceOf(user.wallet.address)
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, 6)} USDC`)
      }
      
      // Approve
      const approveTx = await usdcContract.approve(CONTRACTS.TREASURY_MANAGER, amountWei)
      await approveTx.wait()
      
      // Now transfer
      setStep('transfer')
      const transferTx = await usdcContract.transfer(CONTRACTS.TREASURY_MANAGER, amountWei)
      await transferTx.wait()
      
      setTransactionHash(transferTx.hash)
      setStep('complete')
      
      // Refresh balances
      fetchTreasuryBalance()
      fetchUserBalance()
      
    } catch (err: any) {
      console.error('Funding error:', err)
      setError(err.message || 'Transaction failed')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const handleDirectTransfer = async () => {
    if (!amount || !user?.wallet?.address) {
      alert('Please enter an amount and connect wallet')
      return
    }

    const provider = await (window as any).ethereum
    if (!provider) {
      alert('No wallet provider found')
      return
    }

    setLoading(true)
    setError('')
    setStep('transfer')

    try {
      const ethers = await import('ethers')
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      
      // Create USDC contract instance with signer
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signer)
      
      // Parse amount
      const amountWei = ethers.parseUnits(amount, 6)
      
      // Check balance
      const balance = await usdcContract.balanceOf(user.wallet.address)
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, 6)} USDC`)
      }
      
      // Transfer directly
      const transferTx = await usdcContract.transfer(CONTRACTS.TREASURY_MANAGER, amountWei)
      await transferTx.wait()
      
      setTransactionHash(transferTx.hash)
      setStep('complete')
      
      // Refresh balances
      fetchTreasuryBalance()
      fetchUserBalance()
      
    } catch (err: any) {
      console.error('Transfer error:', err)
      setError(err.message || 'Transaction failed')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = ['0.1', '0.2', '0.5', '1']

  const handleQuickAmount = (quickAmount: string) => {
    setAmount(quickAmount)
  }

  const resetForm = () => {
    setAmount('')
    setStep('input')
    setLoading(false)
    setError('')
    setTransactionHash('')
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

  const formattedTreasuryBalance = Number(treasuryBalance) / 1_000_000

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Fund Treasury</h1>
          <p className="text-gray-400">Add USDC to the treasury for payroll automation</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Current Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Your Balance</div>
                  <div className="text-xl font-bold text-white">
                    {userWalletBalance} USDC
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Treasury Balance</div>
                  <div className="text-xl font-bold text-white">
                    ${formattedTreasuryBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Card */}
          <div className="glass rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Add Funds to Treasury</h2>
              <p className="text-gray-400">
                Transfer USDC to the treasury contract for automated payroll
              </p>
            </div>

            {/* Status Indicators */}
            {error && (
              <div className="mb-4 p-4 bg-error/10 border border-error/30 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error mr-2" />
                  <div className="text-error">{error}</div>
                </div>
              </div>
            )}

            {step === 'approve' && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center">
                  <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin mr-2"></div>
                  <div className="text-warning">Approving USDC transfer...</div>
                </div>
              </div>
            )}

            {step === 'transfer' && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center">
                  <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin mr-2"></div>
                  <div className="text-warning">Transferring USDC to treasury...</div>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success mr-2" />
                  <div className="text-success">
                    Success! {amount} USDC transferred to treasury.
                  </div>
                </div>
                {transactionHash && (
                  <a
                    href={`https://cronos.org/explorer/testnet3/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-success/80 hover:text-success mt-2"
                  >
                    View transaction <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount to Transfer (USDC)
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
                  min="0"
                  step="0.01"
                  disabled={loading}
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">USDC</span>
                </div>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleQuickAmount(quickAmount)}
                  disabled={loading}
                  className="py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${quickAmount}
                </button>
              ))}
            </div>

            {/* Contract Info */}
            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Treasury Contract</div>
              <div className="font-mono text-sm text-white break-all mb-2">
                {CONTRACTS.TREASURY_MANAGER}
              </div>
              <a
                href={`https://explorer.cronos.org/testnet/address/${CONTRACTS.TREASURY_MANAGER}#tokentxns`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm"
              >
                View on Explorer
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {step !== 'complete' ? (
                <>
                  <button
                    onClick={handleApproveAndFund}
                    disabled={!amount || loading || parseFloat(amount) <= 0}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    {loading && step === 'approve' ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      'Approve & Fund'
                    )}
                  </button>
                  
                  <button
                    onClick={handleDirectTransfer}
                    disabled={!amount || loading || parseFloat(amount) <= 0}
                    className="flex-1 py-3 rounded-lg bg-surface border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading && step === 'transfer' ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Transferring...
                      </>
                    ) : (
                      'Direct Transfer'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600"
                >
                  Fund More
                </button>
              )}
            </div>

            {/* Safety Notes */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Important Notes</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• USDC on Cronos Testnet has 6 decimals</li>
                <li>• Transfers are irreversible once confirmed</li>
                <li>• Test with small amounts first (0.1-1 USDC)</li>
                <li>• Ensure you have enough CRO for gas fees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}