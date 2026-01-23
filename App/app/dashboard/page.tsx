// app/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, TrendingUp, Clock, Plus, 
  Settings, Play, Bell, Wallet, RefreshCw, Activity,
  ExternalLink, AlertCircle, CheckCircle, Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { 
  getTreasuryBalance, 
  getActivePayees, 
  getTotalAccrued,
  createPaymentRequests,
  calculateDuePayees,
  calculateTotalMonthlyOutflow,
  Payee,
  getRevenueThreshold,
  shouldTriggerPayroll,
  getPaymentRequest,
  formatUSDC
} from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import { transactionStore, Transaction } from '@/lib/storage/transaction-store'
import { CONTRACTS } from '@/config/contracts'
import toast from 'react-hot-toast'
import { X402PaymentFlow } from '@/lib/x402/payment-flow'
import { ethers } from 'ethers'

interface DashboardData {
  treasuryBalance: bigint
  payees: Payee[]
  totalAccrued: bigint
  totalMonthlyOutflow: bigint
  duePayeesCount: number
  userBalance: string
  revenueThreshold: bigint
  shouldTrigger: boolean
  lastUpdated: Date
}

// Payment result interface
interface PaymentResult {
  success: boolean;
  paymentId?: string;
  txHash?: string;
  error?: string;
  alreadyPaid?: boolean;
  data?: any;
}

// Metrics Card Component
const TreasuryMetrics = ({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false,
  status = 'normal'
}: {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  loading?: boolean;
  status?: 'normal' | 'success' | 'warning' | 'error' | 'pending';
}) => {
  const statusColors = {
    normal: 'border-gray-700',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
    pending: 'border-blue-500'
  };

  const statusIcons = {
    normal: null,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    pending: <Clock className="h-4 w-4 text-blue-500" />
  };

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 border ${statusColors[status]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary-500/20">
          {icon}
        </div>
        {statusIcons[status] && (
          <div className="p-1">
            {statusIcons[status]}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {loading ? (
          <div className="h-8 w-32 bg-gray-800 rounded animate-pulse"></div>
        ) : (
          <div className="text-2xl font-bold text-white">{value}</div>
        )}
        {change && (
          <div className="text-sm text-gray-400">{change}</div>
        )}
      </div>
    </div>
  );
};

// Payee Table Component
const PayeeTable = ({ 
  payees, 
  loading,
  onSendPayment,
  onEditDetails
}: {
  payees: Payee[];
  loading: boolean;
  onSendPayment: (address: string) => void;
  onEditDetails: (address: string) => void;
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p className="mt-2 text-gray-400">Loading payees...</p>
      </div>
    );
  }

  if (payees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Active Payees</h3>
        <p className="text-gray-400 mb-4">Add payees to start managing payroll</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-900/50">
          <tr>
            <th className="text-left p-4 text-gray-300 font-medium">Address</th>
            <th className="text-left p-4 text-gray-300 font-medium">Salary</th>
            <th className="text-left p-4 text-gray-300 font-medium hidden md:table-cell">Last Paid</th>
            <th className="text-left p-4 text-gray-300 font-medium">Accrued</th>
            <th className="text-left p-4 text-gray-300 font-medium">Status</th>
            <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {payees.map((payee, index) => {
            const isDue = new Date(payee.lastPayment).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000);
            const isNew = new Date(payee.lastPayment).getFullYear() === 1970;
            
            return (
              <tr key={index} className="hover:bg-gray-800/30">
                <td className="p-4">
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
                <td className="p-4">
                  <div className="font-semibold text-white">
                    ${formatUSDC(payee.salary)}
                  </div>
                  <div className="text-xs text-gray-400">Monthly</div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <div className="text-gray-300">
                    {isNew ? 'Never' : new Date(payee.lastPayment).toLocaleDateString()}
                  </div>
                  {isDue && !isNew && (
                    <div className="text-xs text-yellow-400">Overdue</div>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-gray-300">
                    ${formatUSDC(payee.accrued)}
                  </div>
                </td>
                <td className="p-4">
                  {isNew ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800">
                      New
                    </span>
                  ) : isDue ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                      Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSendPayment(payee.address)}
                      className="px-3 py-1 text-sm rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30"
                    >
                      Pay
                    </button>
                    <button
                      onClick={() => onEditDetails(payee.address)}
                      className="px-3 py-1 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function DashboardPage() {
  const { authenticated, user, ready } = usePrivy()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [pendingTransactions, setPendingTransactions] = useState(0)
  const [userFundedAmount, setUserFundedAmount] = useState<string>('0.00')

  // Subscribe to transaction store updates
  useEffect(() => {
    const unsubscribe = transactionStore.subscribe((transactions: Transaction[]) => {
      const pending = transactions.filter(tx => tx.status === 'pending').length
      setPendingTransactions(pending)
    })
    
    return unsubscribe
  }, [])

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    if (!authenticated || !user?.wallet?.address) return;
    
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching dashboard data...');

      // Fetch all data in parallel with error handling
      const [
        treasuryBalance,
        payeesData,
        totalAccrued,
        userBalanceResult,
        revenueThreshold,
        shouldTriggerResult
      ] = await Promise.allSettled([
        getTreasuryBalance(),
        getActivePayees(),
        getTotalAccrued(),
        getBalance(user.wallet.address),
        getRevenueThreshold(),
        getTreasuryBalance().then(balance => shouldTriggerPayroll(balance))
      ]);

      console.log('Data fetched:', {
        treasuryBalance,
        payeesData,
        totalAccrued,
        userBalanceResult,
        revenueThreshold,
        shouldTriggerResult
      });

      // Handle results
      const treasuryBalanceValue = treasuryBalance.status === 'fulfilled' ? treasuryBalance.value : BigInt(0);
      const payeesDataValue = payeesData.status === 'fulfilled' ? payeesData.value : [];
      const totalAccruedValue = totalAccrued.status === 'fulfilled' ? totalAccrued.value : BigInt(0);
      const userBalanceValue = userBalanceResult.status === 'fulfilled' ? userBalanceResult.value : '0.00';
      const revenueThresholdValue = revenueThreshold.status === 'fulfilled' ? revenueThreshold.value : BigInt(0);
      const shouldTriggerValue = shouldTriggerResult.status === 'fulfilled' ? shouldTriggerResult.value : false;

      // Filter out the first two payees (system payees)
      const filteredPayees = payeesDataValue.slice(2);
      
      const duePayeesCount = calculateDuePayees(filteredPayees);
      const totalMonthlyOutflow = calculateTotalMonthlyOutflow(filteredPayees);

      console.log('Processed data:', {
        filteredPayees: filteredPayees.length,
        duePayeesCount,
        totalMonthlyOutflow: totalMonthlyOutflow.toString()
      });

      setData({
        treasuryBalance: treasuryBalanceValue,
        payees: filteredPayees,
        totalAccrued: totalAccruedValue,
        totalMonthlyOutflow,
        duePayeesCount,
        userBalance: userBalanceValue as string,
        revenueThreshold: revenueThresholdValue,
        shouldTrigger: Boolean(shouldTriggerValue),
        lastUpdated: new Date()
      });
      
      setUserWalletBalance(userBalanceValue as string);
      setLastUpdateTime(new Date());
      
      // Fetch user funded amount
      if (user?.wallet?.address) {
        try {
          // For now, use a mock value - in production, query contract events
          setUserFundedAmount('500.00'); // Example: $500 funded
        } catch (error) {
          console.error('Failed to fetch user funded amount:', error);
        }
      }

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [authenticated, user]);

  // Helper function to process x402 payment
  const processX402Payment = async (
    challengeUrl: string,
    signer: any,
    requestId?: string
  ): Promise<PaymentResult> => {
    try {
      // Fetch challenge from API
      const response = await fetch(challengeUrl);
      
      if (response.status === 402) {
        const challenge = await response.json();
        
        const toastId = toast.loading('Processing x402 payment...');
        
        const result = await X402PaymentFlow.processPaymentChallenge(challenge, signer);
        
        if (result.error || !result.txHash) {
          toast.error(`Payment failed: ${result.error}`, { id: toastId });
          return { success: false, error: result.error };
        }
        
        toast.success('Payment settled successfully!', { id: toastId });
        
        // Update contract status via webhook if requestId exists
        if (requestId) {
          await fetch('/api/x402/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.settled',
              paymentId: result.paymentId,
              requestId: requestId,
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
      } else if (response.ok) {
        const data = await response.json();
        if (data.alreadyPaid || data.settled) {
          toast.success('Payment already completed!');
          return { 
            success: true, 
            alreadyPaid: true,
            data: data
          };
        }
        // Return any other successful response
        return { 
          success: true, 
          data: data 
        };
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error: any) {
      console.error('x402 payment error:', error);
      toast.error(`Payment error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (!authenticated && ready) {
      router.push('/')
      return
    }
    
    if (authenticated) {
      fetchDashboardData()
      
      // Set up polling for updates
      const pollInterval = setInterval(fetchDashboardData, 60000) // 1 minute
      
      return () => clearInterval(pollInterval)
    }
  }, [authenticated, ready, router, fetchDashboardData])

  const triggerPayroll = async (): Promise<void> => {
    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    setPayrollLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      // Create ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Track transaction
      const txId = transactionStore.addTransaction({
        hash: 'pending',
        type: 'create_payments',
        status: 'pending',
        from: userAddress,
        to: CONTRACTS.TREASURY_MANAGER,
      });
      
      // First, create payment requests (this creates x402 challenges)
      toast.loading('Creating payment requests...');
      const result = await createPaymentRequests(signer);
      
      if (result.success && result.transactionHash) {
        // Update transaction record
        transactionStore.updateTransaction(txId, {
          hash: result.transactionHash,
          status: 'confirmed',
          confirmedAt: new Date(),
          blockNumber: result.requestIds?.length
        });
        
        toast.success('Payment requests created! Processing x402 payments...');
        
        // Process x402 payments for each request
        if (result.requestIds && result.requestIds.length > 0) {
          const paymentsPromises = result.requestIds.map(async (requestIdBigInt) => {
            const requestId = requestIdBigInt.toString();
            
            try {
              // Get payment request details from contract
              const paymentRequest = await getPaymentRequest(requestIdBigInt);
              
              if (paymentRequest && !paymentRequest.settled) {
                // Create x402 challenge URL
                const challengeUrl = `/api/x402/challenge?payee=${paymentRequest.payee}&amount=${paymentRequest.amount.toString()}&requestId=${requestId}&description=Payroll+Payment`;
                
                // Process payment
                const paymentResult = await processX402Payment(challengeUrl, signer, requestId);
                
                if (paymentResult.success) {
                  // Check if already paid
                  if (paymentResult.alreadyPaid) {
                    toast.success(`Payment already completed for ${paymentRequest.payee.substring(0, 10)}...`);
                  } else {
                    toast.success(`Payment completed for ${paymentRequest.payee.substring(0, 10)}...`);
                  }
                  return { success: true, requestId };
                } else {
                  toast.error(`Payment failed for request ${requestId}`);
                  return { success: false, requestId, error: paymentResult.error };
                }
              }
            } catch (error: any) {
              console.error(`Failed to process payment for request ${requestId}:`, error);
              toast.error(`Payment error for request ${requestId}: ${error.message}`);
              return { success: false, requestId, error: error.message };
            }
            return { success: false, requestId };
          });
          
          // Wait for all payments to complete
          const paymentResults = await Promise.all(paymentsPromises);
          const successfulPayments = paymentResults.filter(r => r.success).length;
          
          if (successfulPayments > 0) {
            toast.success(`Successfully processed ${successfulPayments} of ${result.requestIds.length} payments`);
          } else {
            toast.error('No payments were successfully processed');
          }
        }
        
        // Refresh data
        await fetchDashboardData();
      } else {
        throw new Error(result.error || 'Failed to trigger payroll');
      }
    } catch (error: any) {
      // Update transaction as failed
      const transactions = transactionStore.getAllTransactions();
      const lastTx = transactions[0];
      if (lastTx) {
        transactionStore.updateTransaction(lastTx.id, {
          status: 'failed',
          error: error.message
        });
      }
      
      toast.error(`Payroll trigger failed: ${error.message}`);
      console.error('Payroll trigger error:', error);
    } finally {
      setPayrollLoading(false);
    }
  };

  const refreshData = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const addPayee = (): void => {
    router.push('/payroll?action=add');
  };

  const manageSettings = (): void => {
    router.push('/payroll?action=settings');
  };

  const viewTransactions = (): void => {
    router.push('/transactions');
  };

  const sendPaymentToPayee = async (payeeAddress: string): Promise<void> => {
    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }
    
    try {
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // For manual payments, use a fixed amount or get from payee data
      const payee = data?.payees.find(p => p.address === payeeAddress);
      const amount = payee?.salary || "1000000"; // Default to 1 USDC
      const challengeUrl = `/api/x402/challenge?payee=${payeeAddress}&amount=${amount}&description=Manual+Payment`;
      
      toast.loading('Processing manual payment...');
      const result = await processX402Payment(challengeUrl, signer);
      
      if (result.success) {
        if (result.alreadyPaid) {
          toast.success('Payment was already completed!');
        } else {
          toast.success('Manual payment completed successfully!');
        }
        await fetchDashboardData(); // Refresh data
      } else {
        toast.error(`Manual payment failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Payment error: ${error.message}`);
    }
  };

  const editPayeeDetails = (payeeAddress: string): void => {
    // Navigate to edit page with payee address
    router.push(`/payroll?action=edit&address=${payeeAddress}`);
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
              Connect your wallet to access the treasury dashboard and manage payroll
            </p>
            <ConnectButton />
          </div>
        </div>
      </Container>
    )
  }

  if (loading && !data) {
    return (
      <Container>
        <div className="py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-800 rounded-xl mb-8"></div>
            <div className="h-32 bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
          <div className="p-4 bg-error/10 border border-error/30 rounded-lg mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-error mr-2" />
              <div className="text-error">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </Container>
    )
  }

  // Calculate formatted values
  const formattedTreasuryBalance = data ? formatUSDC(data.treasuryBalance) : '0.00';
  const formattedTotalMonthlyOutflow = data ? formatUSDC(data.totalMonthlyOutflow) : '0.00';
  const formattedTotalAccrued = data ? formatUSDC(data.totalAccrued) : '0.00';
  const duePayeesCount = data?.duePayeesCount || 0;
  const formattedRevenueThreshold = data ? formatUSDC(data.revenueThreshold) : '0.00';
  const shouldTriggerPayrollValue = data?.shouldTrigger || false;
  const payeesCount = data?.payees.length || 0;

  // Determine status for metrics
  const treasuryStatus = data && data.treasuryBalance > data.revenueThreshold ? 'success' : 'warning';
  const payeesStatus = duePayeesCount > 0 ? 'warning' : 'normal';
  const accruedStatus = data && data.totalAccrued > 0 ? 'pending' : 'normal';

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">Treasury Dashboard</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Real-time treasury management with x402 payments</span>
                <span className="text-gray-500">•</span>
                <span>Updated {lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
              
              {/* User Funded Amount */}
              <div className="px-4 py-2 rounded-lg bg-surface border border-green-700">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <div>
                    <div className="text-sm text-gray-400">Funded</div>
                    <div className="font-semibold text-white">
                      {userFundedAmount} USDC.e
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pending Transactions Badge */}
              {pendingTransactions > 0 && (
                <button
                  onClick={viewTransactions}
                  className="relative p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  <Activity className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingTransactions}
                  </span>
                </button>
              )}
              
              <button
                onClick={manageSettings}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid - FIXED with actual data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <TreasuryMetrics
            title="Treasury Balance"
            value={`$${formattedTreasuryBalance}`}
            change={data && data.treasuryBalance > data.revenueThreshold ? 'Above Threshold' : 'Below Threshold'}
            icon={<DollarSign className="h-5 w-5 text-primary-400" />}
            loading={loading}
            status={treasuryStatus}
          />
          
          <TreasuryMetrics
            title="Active Payees"
            value={payeesCount.toString()}
            change={duePayeesCount > 0 ? `${duePayeesCount} due` : 'All up to date'}
            icon={<Users className="h-5 w-5 text-blue-400" />}
            loading={loading}
            status={payeesStatus}
          />
          
          <TreasuryMetrics
            title="Monthly Outflow"
            value={`$${formattedTotalMonthlyOutflow}`}
            change="Estimated monthly"
            icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
            loading={loading}
          />
          
          <TreasuryMetrics
            title="Total Accrued"
            value={`$${formattedTotalAccrued}`}
            change="Unpaid balance"
            icon={<Clock className="h-5 w-5 text-yellow-400" />}
            loading={loading}
            status={accruedStatus}
          />
        </div>

        {/* Actions */}
        <div className="mb-8 p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">Payroll Automation</h3>
              <p className="text-gray-400">
                Run Payroll button creates payment requests and initiates x402 payment challenges
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs text-gray-400">Revenue Threshold:</div>
                <div className="text-sm font-semibold text-white">
                  ${formattedRevenueThreshold} USDC.e
                </div>
                <a
                  href={`https://explorer.cronos.org/testnet/address/${CONTRACTS.TREASURY_MANAGER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 text-xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Contract
                </a>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <button
                onClick={triggerPayroll}
                disabled={payrollLoading || payeesCount === 0}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {payrollLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Payroll (x402)
                  </>
                )}
              </button>
              
              <button
                onClick={addPayee}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold hover:from-secondary-600 hover:to-secondary-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Payee
              </button>
              
              <button
                onClick={() => router.push('/fund')}
                className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 font-semibold hover:bg-gray-700 hover:text-white transition-colors"
              >
                Fund Treasury
              </button>
            </div>
          </div>
          
          {/* Due Payments Alert */}
          {duePayeesCount > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-yellow-500 mr-2" />
                  <div className="text-yellow-500">
                    <span className="font-semibold">{duePayeesCount} payee(s)</span> have payments due. Run payroll to process.
                  </div>
                </div>
                <button
                  onClick={triggerPayroll}
                  className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 whitespace-nowrap"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payees Table */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Active Payees</h2>
                <p className="text-gray-400">Manage payroll recipients (excludes system payees)</p>
              </div>
              <div className="text-sm text-gray-400">
                Total: {payeesCount} payees • {duePayeesCount} due for payment
              </div>
            </div>
          </div>
          <PayeeTable 
            payees={data?.payees || []} 
            loading={loading}
            onSendPayment={sendPaymentToPayee}
            onEditDetails={editPayeeDetails}
          />
        </div>

        {/* System Status */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Network</span>
              <span className="text-white">Cronos Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Updated</span>
              <span className="text-white">{lastUpdateTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pending Transactions</span>
              <span className={`font-medium ${pendingTransactions > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {pendingTransactions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payroll Trigger Status</span>
              <span className={`font-medium ${shouldTriggerPayrollValue ? 'text-green-400' : 'text-yellow-400'}`}>
                {shouldTriggerPayrollValue ? 'Ready to Trigger' : 'Conditions Not Met'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Contract Address</span>
              <span className="text-white text-xs truncate max-w-[200px]">
                {CONTRACTS.TREASURY_MANAGER.substring(0, 20)}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}