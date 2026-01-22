// app/payroll/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, Clock, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw,
  Plus, Settings, Wallet, ExternalLink,
  Info, ArrowRight
} from 'lucide-react'
import { CONTRACTS, TREASURY_ABI } from '@/config/contracts'
import { getActivePayees, addPayee, createPaymentRequests, updateRevenueThreshold, getPaymentRequest } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import { x402Agent } from '@/lib/agent/x402-agent'
import toast from 'react-hot-toast'
import { X402PaymentFlow, PaymentChallenge } from '@/lib/x402/payment-flow'

interface PayeeForm {
  address: string
  salary: string
}

export default function PayrollPage() {
  const { authenticated, user } = usePrivy()
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddPayee, setShowAddPayee] = useState(false)
  const [payeeForm, setPayeeForm] = useState<PayeeForm>({ address: '', salary: '' })
  const [activePayees, setActivePayees] = useState<any[]>([])
  const [automationEnabled, setAutomationEnabled] = useState(false)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00')
  const [error, setError] = useState<string>('')
  const [revenueThreshold, setRevenueThreshold] = useState<string>('10000')
  const [updatingThreshold, setUpdatingThreshold] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [processingPayments, setProcessingPayments] = useState<string[]>([])

  useEffect(() => {
    if (authenticated) {
      fetchPayrollData()
      fetchUserBalance()
      checkAgentStatus()
    }
  }, [authenticated])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      
      // Fetch active payees
      const payees = await getActivePayees()
      
      // Filter out first two system payees
      const filteredPayees = payees.slice(2)
      
      setActivePayees(filteredPayees)
      
    } catch (error) {
      console.error('Failed to fetch payroll data:', error)
      toast.error('Failed to load payroll data')
      setError('Failed to load payroll data')
    } finally {
      setLoading(false)
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
    
    // Fetch treasury balance
    try {
      const ethers = await import('ethers')
      const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, ['function balanceOf(address) view returns (uint256)'], provider)
      const balance = await usdcContract.balanceOf(CONTRACTS.TREASURY_MANAGER)
      setTreasuryBalance(ethers.formatUnits(balance, 6))
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error)
    }
  }

  const checkAgentStatus = async () => {
    try {
      const response = await fetch('/api/agent', {
        method: 'GET'
      })
      const data = await response.json()
      if (data.success) {
        setIsRunning(data.data.status.isRunning || false)
        setAutomationEnabled(data.data.status.isRunning || false)
      }
    } catch (error) {
      console.error('Failed to check agent status:', error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchPayrollData(),
        fetchUserBalance(),
        checkAgentStatus()
      ])
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Process individual x402 payment
  const processX402Payment = async (payee: string, amount: bigint, requestId?: string | bigint) => {
    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet');
      return null;
    }

    const requestIdStr = requestId ? requestId.toString() : undefined;

    try {
      const provider = await (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }
      
      const ethers = await import('ethers');
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Create challenge URL
      const params = new URLSearchParams({
        payee,
        amount: amount.toString(),
        description: 'Payroll Payment'
      });
      
      if (requestIdStr) {
        params.append('requestId', requestIdStr);
      }
      
      const challengeUrl = `/api/x402/challenge?${params.toString()}`;
      
      // Add to processing list
      if (requestIdStr) {
        setProcessingPayments(prev => [...prev, requestIdStr]);
      }
      
      // Fetch challenge
      const response = await fetch(challengeUrl);
      
      if (response.status === 402) {
        const challenge: PaymentChallenge = await response.json();
        
        const toastId = toast.loading(`Processing payment for ${payee.substring(0, 10)}...`);
        
        const result = await X402PaymentFlow.processPaymentChallenge(challenge, signer);
        
        if (result.error || !result.txHash) {
          toast.error(`Payment failed: ${result.error}`, { id: toastId });
          return { success: false, error: result.error };
        }
        
        toast.success('Payment settled successfully!', { id: toastId });
        
        // Update contract status via webhook
        if (requestIdStr) {
          await fetch('/api/x402/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.settled',
              paymentId: result.paymentId,
              requestId: requestIdStr,
              payee,
              amount: amount.toString(),
              txHash: result.txHash,
              timestamp: new Date().toISOString()
            })
          }).catch(err => {
            console.error('Failed to update webhook:', err);
          });
        }
        
        return { 
          success: true, 
          paymentId: result.paymentId, 
          txHash: result.txHash 
        };
      } else {
        throw new Error('Unexpected response from challenge endpoint');
      }
    } catch (error: any) {
      console.error('x402 payment error:', error);
      toast.error(`Payment failed: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      if (requestIdStr) {
        setProcessingPayments(prev => prev.filter(id => id !== requestIdStr));
      }
    }
  };

  const triggerPayroll = async () => {
    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = await (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers');
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Call createPaymentRequests
      toast.loading('Creating payment requests...');
      const result = await createPaymentRequests(signer);
      
      if (result.success) {
        toast.success('Payment requests created successfully!');
        
        // Process x402 payments for each request
        if (result.requestIds && result.requestIds.length > 0) {
          toast(`Processing ${result.requestIds.length} payments via x402...`, { duration: 3000 });
          
          const paymentsPromises = result.requestIds.map(async (requestIdBigInt) => {
            const requestId = requestIdBigInt.toString(); // Convert bigint to string
            
            try {
              // Get payment request details from contract
              const paymentRequest = await getPaymentRequest(requestIdBigInt);
              
              if (paymentRequest && !paymentRequest.settled) {
                const paymentResult = await processX402Payment(
                  paymentRequest.payee,
                  paymentRequest.amount,
                  requestId
                );
                
                if (paymentResult?.success) {
                  return { success: true, requestId };
                } else {
                  return { 
                    success: false, 
                    requestId, 
                    error: paymentResult?.error || 'Unknown error' 
                  };
                }
              }
              return { success: false, requestId, error: 'No payment request found' };
            } catch (error: any) {
              console.error(`Failed to process payment for request ${requestId}:`, error);
              return { success: false, requestId, error: error.message };
            }
          });
          
          // Process payments with a small delay between each to avoid rate limiting
          const results = [];
          for (let i = 0; i < paymentsPromises.length; i++) {
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }
            results.push(await paymentsPromises[i]);
          }
          
          const successfulPayments = results.filter(r => r.success).length;
          
          if (successfulPayments > 0) {
            toast.success(`Successfully processed ${successfulPayments} of ${results.length} payments`);
          } else {
            toast.error('No payments were successfully processed');
          }
        }
        
        fetchPayrollData();
      } else {
        throw new Error(result.error || 'Failed to trigger payroll');
      }
    } catch (error: any) {
      console.error('Failed to trigger payroll:', error);
      setError(error.message || 'Failed to trigger payroll');
      toast.error(`Failed to trigger payroll: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  const toggleAutomation = async () => {
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRunning ? 'stop' : 'start'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsRunning(!isRunning);
        setAutomationEnabled(!isRunning);
        toast.success(`Automation ${!isRunning ? 'started' : 'stopped'}`);
      } else {
        throw new Error(data.error || 'Failed to toggle automation');
      }
    } catch (error: any) {
      console.error('Failed to toggle automation:', error);
      toast.error(`Failed to toggle automation: ${error.message || 'Unknown error'}`);
    }
  }

  const handleAddPayee = async () => {
    if (!payeeForm.address || !payeeForm.salary) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(payeeForm.address)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    // Validate salary
    if (parseFloat(payeeForm.salary) <= 0) {
      toast.error('Salary must be greater than 0');
      return;
    }

    try {
      const provider = await (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers');
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Show loading toast
      const loadingToast = toast.loading('Adding payee to blockchain...');
      
      // Add payee
      const result = await addPayee(signer, payeeForm.address, payeeForm.salary);
      
      if (result.success) {
        toast.dismiss(loadingToast);
        toast.success('Payee added successfully!');
        setShowAddPayee(false);
        setPayeeForm({ address: '', salary: '' });
        
        // Refresh data to show new payee
        setTimeout(() => {
          fetchPayrollData();
        }, 3000); // Wait for blockchain confirmation
      } else {
        toast.dismiss(loadingToast);
        throw new Error(result.error || 'Failed to add payee');
      }
    } catch (error: any) {
      console.error('Error adding payee:', error);
      toast.error(`Failed to add payee: ${error.message || 'Unknown error'}`);
    }
  }

  const handleUpdateThreshold = async () => {
    if (!revenueThreshold || parseFloat(revenueThreshold) <= 0) {
      toast.error('Please enter a valid threshold amount');
      return;
    }

    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    setUpdatingThreshold(true);
    setError('');

    try {
      const provider = await (window as any).ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }
      
      // Create ethers provider and signer
      const ethers = await import('ethers');
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      const loadingToast = toast.loading('Updating revenue threshold...');
      
      // Update revenue threshold
      const result = await updateRevenueThreshold(signer, revenueThreshold);
      
      if (result.success) {
        toast.dismiss(loadingToast);
        toast.success('Revenue threshold updated successfully!');
        fetchPayrollData();
      } else {
        toast.dismiss(loadingToast);
        throw new Error(result.error || 'Failed to update threshold');
      }
    } catch (error: any) {
      console.error('Error updating threshold:', error);
      setError(error.message || 'Failed to update threshold');
      toast.error(`Failed to update threshold: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdatingThreshold(false);
    }
  }

  const explainRevenueThreshold = () => {
    toast(
      <div className="max-w-md">
        <p className="font-semibold text-white mb-2">Revenue Threshold Explanation</p>
        <p className="text-sm text-gray-300 mb-2">
          The revenue threshold determines when automated payroll will trigger.
        </p>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• When treasury balance exceeds this amount, x402 agent checks for due payments</li>
          <li>• Creates x402 payment challenges for each due payee</li>
          <li>• Prevents frequent small transactions (saves gas)</li>
          <li>• Recommended: Set to 2-3x your monthly payroll amount</li>
        </ul>
        <p className="text-sm text-gray-300 mt-2">
          Example: If monthly payroll is $5,000, set threshold to $10,000-$15,000
        </p>
      </div>,
      { duration: 10000 }
    );
  };

  // Function to process a single payee payment
  const processSinglePayment = async (payee: any) => {
    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amount = payee.salary;
      const paymentResult = await processX402Payment(payee.address, payee.salary);
      
      if (paymentResult?.success) {
        toast.success(`Payment to ${payee.address.substring(0, 10)}... completed!`);
        // Refresh data
        setTimeout(() => {
          fetchPayrollData();
        }, 2000);
      }
    } catch (error: any) {
      toast.error(`Payment error: ${error.message}`);
    }
  };

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
    );
  }

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">Payroll Automation</h1>
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-gray-400">Manage and automate x402-powered payments</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* User Wallet Balance */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-gray-700">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary-400" />
                  <div>
                    <div className="text-sm text-gray-400">Your Balance</div>
                    <div className="font-semibold text-white">
                      {userWalletBalance} USDC.e
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Treasury Balance */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-gray-700">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <div>
                    <div className="text-sm text-gray-400">Treasury</div>
                    <div className="font-semibold text-white">
                      {treasuryBalance} USDC.e
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Payee Modal */}
        {showAddPayee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Add New Payee</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payee Address
                  </label>
                  <input
                    type="text"
                    value={payeeForm.address}
                    onChange={(e) => setPayeeForm({...payeeForm, address: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter valid Ethereum address (0x...)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Salary (USDC.e)
                  </label>
                  <input
                    type="number"
                    value={payeeForm.salary}
                    onChange={(e) => setPayeeForm({...payeeForm, salary: e.target.value})}
                    placeholder="1000"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Monthly salary in USDC.e (6 decimals)</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPayee(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayee}
                  className="flex-1 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  Add Payee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Automation Controls */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Automated Payroll</h2>
              <div className="space-y-2">
                <p className="text-gray-400">
                  <span className="text-primary-400 font-medium">Start Automation:</span> Enables the x402 agent to monitor revenue and automatically trigger payroll when conditions are met
                </p>
                <p className="text-gray-400">
                  <span className="text-primary-400 font-medium">Run Payroll Now:</span> Manually creates payment requests and initiates x402 payments immediately
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className={`w-2 h-2 rounded-full ${automationEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm text-gray-300">
                    {automationEnabled ? 'Automation active - monitoring for due payments' : 'Automation paused'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <button
                onClick={toggleAutomation}
                className={`px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                  isRunning 
                    ? 'bg-error/20 text-error border border-error/30 hover:bg-error/30' 
                    : 'bg-success/20 text-success border border-success/30 hover:bg-success/30'
                } transition-colors min-w-[160px]`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Stop Automation
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
                disabled={loading || activePayees.length === 0}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all min-w-[160px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5" />
                    Run Payroll Now (x402)
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowAddPayee(true)}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2 transition-all min-w-[140px]"
              >
                <Plus className="h-5 w-5" />
                Add Payee
              </button>
            </div>
          </div>
        </div>

        {/* Active Payees */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold text-white">Active Payees</h2>
            <div className="text-sm text-gray-400">
              {activePayees.length} payee(s) • Excludes system payees
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="mt-2 text-gray-400">Loading payees...</p>
            </div>
          ) : activePayees.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Payees Found</h3>
              <p className="text-gray-400 mb-4">Add payees to start managing payroll</p>
              <button
                onClick={() => setShowAddPayee(true)}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                Add Your First Payee
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="text-left p-3 text-gray-300 font-medium">Address</th>
                    <th className="text-left p-3 text-gray-300 font-medium hidden md:table-cell">Salary</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Last Paid</th>
                    <th className="text-left p-3 text-gray-300 font-medium hidden lg:table-cell">Accrued</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activePayees.map((payee, index) => {
                    const isProcessing = processingPayments.includes(payee.address);
                    const lastPaymentDate = new Date(payee.lastPayment);
                    const isDue = lastPaymentDate.getFullYear() === 1970 || 
                                 (Date.now() - lastPaymentDate.getTime()) > (30 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-800/30">
                        <td className="p-3">
                          <div className="font-mono text-sm text-white">
                            {payee.address.substring(0, 8)}...{payee.address.substring(payee.address.length - 6)}
                          </div>
                          <a
                            href={`https://explorer.cronos.org/testnet/address/${payee.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-gray-400 hover:text-primary-400 mt-1"
                          >
                            View on explorer
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="font-semibold text-white">
                            ${(Number(payee.salary) / 1_000_000).toFixed(2)} USDC.e
                          </div>
                          <div className="text-xs text-gray-400">Monthly</div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {lastPaymentDate.getFullYear() === 1970 ? 'Never' : lastPaymentDate.toLocaleDateString()}
                          </div>
                          {isDue && (
                            <div className="text-xs text-yellow-400">Payment due</div>
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="text-gray-300">
                            ${(Number(payee.accrued) / 1_000_000).toFixed(2)} USDC.e
                          </div>
                        </td>
                        <td className="p-3">
                          {isProcessing ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                              Processing
                            </span>
                          ) : lastPaymentDate.getFullYear() === 1970 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => processSinglePayment(payee)}
                            disabled={isProcessing || loading}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                Processing
                              </>
                            ) : (
                              <>
                                <ArrowRight className="mr-1 h-3 w-3" />
                                Pay Now
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue Threshold Settings */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Revenue Threshold Settings</h2>
            <button
              onClick={explainRevenueThreshold}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Explain Revenue Threshold"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Revenue to Trigger Payroll (USDC.e)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={revenueThreshold}
                  onChange={(e) => setRevenueThreshold(e.target.value)}
                  placeholder="10000"
                  min="0"
                  step="100"
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <button
                  onClick={handleUpdateThreshold}
                  disabled={updatingThreshold}
                  className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors min-w-[120px]"
                >
                  {updatingThreshold ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Payroll will automatically trigger when treasury balance exceeds this amount
              </p>
              
              {error && (
                <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-error mr-2" />
                    <div className="text-error text-sm">{error}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-2">How it works:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• When treasury balance ≥ threshold, x402 agent checks for due payments</li>
                <li>• Creates x402 payment challenges for each due payee</li>
                <li>• Prevents frequent small transactions (saves gas)</li>
                <li>• Recommended: Set to 2-3x monthly payroll amount</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}