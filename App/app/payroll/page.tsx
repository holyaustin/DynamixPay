// app/payroll/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Container } from '@/components/layout/Container'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { 
  DollarSign, Users, Clock, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw,
  Plus, Settings, Wallet, ExternalLink,
  Info, ArrowRight, Loader2, AlertTriangle,
  Calendar, Hash, XCircle, Shield
} from 'lucide-react'
import { CONTRACTS, TREASURY_ABI, USDC_ABI } from '@/config/contracts'
import { getActivePayees, createPaymentRequests, updateRevenueThreshold, getPaymentRequest, getPayee } from '@/lib/blockchain/treasury'
import { getBalance } from '@/lib/blockchain/ethers-utils'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'
import { useX402Payment } from '@/lib/x402/payment-hook'
import { formatUnits, parseUnits } from 'ethers'

interface PayeeForm {
  address: string
  salary: string
}

interface PaymentResult {
  success?: boolean;
  paymentId?: string;
  txHash?: string;
  error?: string;
}

interface BlockchainPayee {
  address: string
  salary: bigint
  lastPayment: bigint
  accrued: bigint
  active: boolean
}

interface X402PaymentSuccess {
  success: true
  paymentId: string
  txHash?: string
}

interface X402PaymentError {
  success: false
  error: any
}

interface X402PaymentData {
  success: boolean
  data: any
}

type X402PaymentResult = X402PaymentSuccess | X402PaymentError | X402PaymentData

const getPaymentResultData = (result: any): {
  success: boolean;
  paymentId?: string;
  txHash?: string;
  error?: any;
} => {
  if (result.success === true && 'paymentId' in result) {
    return {
      success: result.success,
      paymentId: result.paymentId,
      txHash: result.txHash
    }
  }
  else if (result.success === false && 'error' in result) {
    return {
      success: result.success,
      error: result.error
    }
  }
  else if ('data' in result) {
    return {
      success: result.success,
      paymentId: result.data?.paymentId,
      txHash: result.data?.txHash,
      error: result.data?.error
    }
  }
  
  return { success: false, error: 'Unknown payment result type' }
}

export default function PayrollPage() {
  const { authenticated, user } = usePrivy()
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddPayee, setShowAddPayee] = useState(false)
  const [payeeForm, setPayeeForm] = useState<PayeeForm>({ address: '', salary: '' })
  const [activePayees, setActivePayees] = useState<BlockchainPayee[]>([])
  const [automationEnabled, setAutomationEnabled] = useState(false)
  const [userWalletBalance, setUserWalletBalance] = useState<string>('0.00')
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00')
  const [error, setError] = useState<string>('')
  const [revenueThreshold, setRevenueThreshold] = useState<string>('10000')
  const [updatingThreshold, setUpdatingThreshold] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [processingPayments, setProcessingPayments] = useState<string[]>([])
  const [addingPayee, setAddingPayee] = useState(false)
  const [contractOwner, setContractOwner] = useState<string>('')
  const [totalMonthlyPayroll, setTotalMonthlyPayroll] = useState<bigint>(0n)
  const [duePayeesCount, setDuePayeesCount] = useState<number>(0)
  
  const { processing: x402Processing, fetchAndProcessPayment } = useX402Payment({
    onSuccess: (result: PaymentResult) => {
      if (result.success && result.paymentId) {
        toast.success(`Payment settled! ID: ${result.paymentId}`);
      } else if (result.error) {
        toast.error(`Payment failed: ${result.error}`);
      } else {
        toast.error(`Payment failed: Unknown error`);
      }
    },
    onError: (error: Error | string) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      toast.error(`Payment failed: ${errorMessage}`);
    }
  });

  const fetchRevenueThreshold = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;
    
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACTS.TREASURY_MANAGER,
          ['function revenueThreshold() view returns (uint256)'],
          provider
        );
        const threshold = await contract.revenueThreshold();
        const formattedThreshold = formatUnits(threshold, 6);
        setRevenueThreshold(formattedThreshold);
      }
    } catch (error) {
      console.error('Failed to fetch revenue threshold:', error);
    }
  }, [authenticated, user]);

  const fetchPayrollData = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;
    
    try {
      setLoading(true)
      setError('')
      
      const payees = await getActivePayees()
      
      const transformedPayees: BlockchainPayee[] = payees.map((payee: any) => ({
        address: payee.address,
        salary: BigInt(payee.salary || 0),
        lastPayment: BigInt(Math.floor(payee.lastPayment.getTime() / 1000)),
        accrued: BigInt(payee.accrued || 0),
        active: Boolean(payee.active)
      }));
      
      const filteredPayees = transformedPayees.slice(2).filter(p => p.active);
      
      setActivePayees(filteredPayees)
      
      const totalPayroll = filteredPayees.reduce((sum, p) => sum + p.salary, 0n)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
      const duePayees = filteredPayees.filter(p => {
        return p.lastPayment === 0n || Number(p.lastPayment) < thirtyDaysAgo
      }).length
      
      setTotalMonthlyPayroll(totalPayroll)
      setDuePayeesCount(duePayees)
      
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(
            CONTRACTS.TREASURY_MANAGER,
            ['function owner() view returns (address)'],
            provider
          );
          const owner = await contract.owner();
          setContractOwner(owner);
        }
      } catch (err) {
        console.log('Could not fetch contract owner:', err);
      }
      
    } catch (error: any) {
      console.error('Failed to fetch payroll data:', error)
      setError(error.message || 'Failed to load payroll data')
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }, [authenticated, user])

  const fetchBalances = useCallback(async () => {
    if (!user?.wallet?.address) return;
    
    try {
      const balance = await getBalance(user.wallet.address)
      setUserWalletBalance(balance)
      
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const usdcContract = new ethers.Contract(
          CONTRACTS.USDC, 
          ['function balanceOf(address) view returns (uint256)'],
          provider
        )
        const balance = await usdcContract.balanceOf(CONTRACTS.TREASURY_MANAGER)
        setTreasuryBalance(formatUnits(balance, 6))
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    }
  }, [user])

  const checkAgentStatus = useCallback(async () => {
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
  }, [])

  const checkTreasurySufficiency = async (): Promise<{ sufficient: boolean; message: string }> => {
    try {
      const treasuryBalanceBigInt = parseUnits(treasuryBalance, 6)
      const requiredAmount = totalMonthlyPayroll
      
      if (treasuryBalanceBigInt < requiredAmount) {
        return {
          sufficient: false,
          message: `Insufficient treasury balance. Required: $${formatUnits(requiredAmount, 6)} USDC, Available: $${treasuryBalance} USDC`
        }
      }
      
      return { sufficient: true, message: 'Treasury balance sufficient' }
    } catch (error) {
      console.error('Error checking treasury sufficiency:', error)
      return { sufficient: false, message: 'Error checking treasury balance' }
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchPayrollData()
      fetchBalances()
      checkAgentStatus()
      fetchRevenueThreshold()
    }
  }, [authenticated, fetchPayrollData, fetchBalances, checkAgentStatus, fetchRevenueThreshold])

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchPayrollData(),
        fetchBalances(),
        checkAgentStatus(),
        fetchRevenueThreshold()
      ])
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleAddPayee = async () => {
    if (!payeeForm.address || !payeeForm.salary) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(payeeForm.address)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    const salaryNum = parseFloat(payeeForm.salary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      toast.error('Salary must be a positive number');
      return;
    }

    const salaryBaseUnits = parseUnits(payeeForm.salary, 6).toString();

    setAddingPayee(true);
    setError('');

    try {
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const loadingToast = toast.loading('Adding payee to blockchain...');

      try {
        const contract = new ethers.Contract(
          CONTRACTS.TREASURY_MANAGER,
          ['function owner() view returns (address)'],
          provider
        );
        const owner = await contract.owner();
        
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
          toast.dismiss(loadingToast);
          toast.error('Only contract owner can add payees');
          setError('You are not the contract owner');
          return;
        }

        const treasuryContract = new ethers.Contract(
          CONTRACTS.TREASURY_MANAGER,
          TREASURY_ABI,
          provider
        );

        try {
          const existingPayee = await getPayee(payeeForm.address);
          if (existingPayee && existingPayee.active) {
            toast.dismiss(loadingToast);
            toast.error('Payee already exists in the system');
            setError('Payee already exists');
            return;
          }
        } catch (viewError) {
          console.log('Payee might not exist yet:', viewError);
        }

        const contractWithSigner = treasuryContract.connect(signer) as any;
        const gasEstimate = await contractWithSigner.addPayee.estimateGas(
          payeeForm.address,
          salaryBaseUnits
        );

        const tx = await contractWithSigner.addPayee(
          payeeForm.address,
          salaryBaseUnits,
          {
            gasLimit: gasEstimate * 120n / 100n
          }
        );

        toast.dismiss(loadingToast);
        toast.loading('Waiting for transaction confirmation...', { id: 'payee-add' });

        const receipt = await tx.wait();
        
        if (receipt && receipt.status === 1) {
          toast.dismiss('payee-add');
          toast.success('Payee added successfully!');
          
          setShowAddPayee(false);
          setPayeeForm({ address: '', salary: '' });
          
          setTimeout(() => {
            fetchPayrollData();
          }, 3000);
        } else {
          throw new Error('Transaction failed');
        }

      } catch (contractError: any) {
        toast.dismiss(loadingToast);
        
        let errorMessage = 'Failed to add payee';
        
        if (contractError.message?.includes('PayeeAlreadyExists')) {
          errorMessage = 'Payee already exists in the contract';
        } else if (contractError.message?.includes('NotAuthorized') || 
                   contractError.message?.includes('Ownable: caller is not the owner')) {
          errorMessage = 'Only contract owner can add payees';
        } else if (contractError.message?.includes('InvalidSalary') || 
                   contractError.message?.includes('ZeroAmount')) {
          errorMessage = 'Salary must be greater than 0';
        } else if (contractError.message?.includes('InvalidAddress')) {
          errorMessage = 'Invalid Ethereum address';
        } else if (contractError.code === 'INSUFFICIENT_FUNDS') {
          errorMessage = 'Insufficient funds for gas. Please add CRO to your wallet.';
        } else if (contractError.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction rejected by user';
        } else if (contractError.code === 'CALL_EXCEPTION') {
          errorMessage = 'Contract call failed. Check if you are the owner.';
        } else if (contractError.message?.includes('gas required exceeds allowance')) {
          errorMessage = 'Gas estimation failed. Please try with higher gas limit.';
        }
        
        toast.error(errorMessage);
        setError(errorMessage);
      }

    } catch (error: any) {
      console.error('Error adding payee:', error);
      const errorMessage = error.message || 'Failed to add payee. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setAddingPayee(false);
    }
  }

  const processX402Payment = async (payee: string, amount: bigint, requestId?: string | bigint) => {
    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet');
      return null;
    }

    const requestIdStr = requestId ? requestId.toString() : undefined;

    try {
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const params = new URLSearchParams({
        payee,
        amount: amount.toString(),
        description: 'Payroll Payment'
      });
      
      if (requestIdStr) {
        params.append('requestId', requestIdStr);
      }
      
      const challengeUrl = `/api/x402/challenge?${params.toString()}`;
      
      if (requestIdStr) {
        setProcessingPayments(prev => [...prev, requestIdStr]);
      }
      
      const result = await fetchAndProcessPayment(challengeUrl, signer) as any;
      
      const resultData = getPaymentResultData(result);
      
      if (resultData.success && resultData.paymentId) {
        if (requestIdStr) {
          await fetch('/api/x402/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.settled',
              paymentId: resultData.paymentId,
              requestId: requestIdStr,
              payee,
              amount: amount.toString(),
              txHash: resultData.txHash,
              timestamp: new Date().toISOString()
            })
          }).catch(err => {
            console.error('Failed to update webhook:', err);
          });
        }
        
        return { 
          success: true as const, 
          paymentId: resultData.paymentId, 
          txHash: resultData.txHash 
        };
      } else {
        return { 
          success: false as const, 
          error: resultData.error || 'Payment failed' 
        };
      }
    } catch (error: any) {
      console.error('x402 payment error:', error);
      toast.error(`Payment failed: ${error.message}`);
      return { 
        success: false as const, 
        error: error.message || 'Payment processing error' 
      };
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
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const contract = new ethers.Contract(
        CONTRACTS.TREASURY_MANAGER,
        ['function owner() view returns (address)'],
        provider
      );
      const owner = await contract.owner();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        toast.error('Only contract owner can trigger payroll');
        setError('You are not the contract owner');
        setLoading(false);
        return;
      }
      
      if (duePayeesCount === 0) {
        toast.error('No payees are due for payment');
        setError('All payees have been paid within the last 30 days');
        setLoading(false);
        return;
      }
      
      const balanceCheck = await checkTreasurySufficiency();
      if (!balanceCheck.sufficient) {
        toast.error(balanceCheck.message);
        setError(balanceCheck.message);
        setLoading(false);
        return;
      }
      
      const loadingToast = toast.loading('Creating payment requests...');
      
      try {
        const result = await createPaymentRequests(signer);
        
        if (result.success) {
          toast.dismiss(loadingToast);
          
          if (result.requestIds && result.requestIds.length > 0) {
            toast.success(`Created ${result.requestIds.length} payment requests!`, { duration: 3000 });
            
            toast.success(`Processing ${result.requestIds.length} payments via x402...`, { duration: 3000 });
            
            const results = [];
            for (let i = 0; i < result.requestIds.length; i++) {
              const requestId = result.requestIds[i];
              const requestIdStr = requestId.toString();
              
              try {
                const paymentRequest = await getPaymentRequest(requestId);
                
                if (paymentRequest && !paymentRequest.settled) {
                  const paymentResult = await processX402Payment(
                    paymentRequest.payee,
                    paymentRequest.amount,
                    requestId
                  );
                  
                  if (paymentResult?.success) {
                    results.push({ success: true, requestId: requestIdStr });
                    toast.success(`Payment ${i + 1}/${result.requestIds.length} processed!`);
                  } else {
                    results.push({ 
                      success: false, 
                      requestId: requestIdStr, 
                      error: paymentResult?.error || 'Unknown error' 
                    });
                  }
                }
              } catch (error: any) {
                console.error(`Failed to process payment for request ${requestIdStr}:`, error);
                results.push({ success: false, requestId: requestIdStr, error: error.message });
              }
              
              if (i < result.requestIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            const successfulPayments = results.filter(r => r.success).length;
            
            if (successfulPayments > 0) {
              toast.success(`Successfully processed ${successfulPayments} of ${results.length} payments`);
            } else {
              toast.error('No payments were successfully processed');
            }
          } else {
            toast('No payment requests were created (possibly no due payees)', { duration: 3000 });
          }
          
          setTimeout(() => {
            fetchPayrollData();
            fetchBalances();
          }, 3000);
          
        } else {
          throw new Error(result.error || 'Failed to create payment requests');
        }
      } catch (contractError: any) {
        toast.dismiss(loadingToast);
        throw contractError;
      }
      
    } catch (error: any) {
      console.error('Failed to trigger payroll:', error);
      setError(error.message || 'Failed to trigger payroll');
      toast.error(`Payroll trigger failed: ${error.message || 'Unknown error'}`);
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

    let loadingToast: string | undefined;
    
    try {
      if (!window.ethereum) {
        throw new Error('No wallet provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const contract = new ethers.Contract(
        CONTRACTS.TREASURY_MANAGER,
        ['function owner() view returns (address)'],
        provider
      );
      const owner = await contract.owner();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        toast.error('Only contract owner can update threshold');
        setUpdatingThreshold(false);
        return;
      }
      
      const thresholdBaseUnits = parseUnits(revenueThreshold, 6);
      
      loadingToast = toast.loading('Updating revenue threshold on blockchain...');
      
      const treasuryContract = new ethers.Contract(
        CONTRACTS.TREASURY_MANAGER,
        TREASURY_ABI,
        signer
      );
      
      const gasEstimate = await treasuryContract.updateRevenueThreshold.estimateGas(
        thresholdBaseUnits
      );
      
      const tx = await treasuryContract.updateRevenueThreshold(
        thresholdBaseUnits,
        {
          gasLimit: gasEstimate * 120n / 100n
        }
      );
      
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      loadingToast = toast.loading('Waiting for transaction confirmation...', { id: 'threshold-update' });
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed (status: 0)');
      }
      
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      toast.success('Revenue threshold updated successfully on blockchain!');
      
      const newThresholdFromContract = await contract.revenueThreshold();
      const formattedThreshold = formatUnits(newThresholdFromContract, 6);
      
      setRevenueThreshold(formattedThreshold);
      setError('');
      
      toast.success(`New threshold set to $${formattedThreshold} USDC`, { 
        duration: 4000,
        icon: '✅'
      });
      
    } catch (error: any) {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      let errorMessage = 'Failed to update threshold';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas. Please add CRO to your wallet.';
      } else if (error.code === 'CALL_EXCEPTION') {
        errorMessage = 'Contract call failed. Check if you are the owner.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Contract rejected transaction';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
           
    } finally {
      setUpdatingThreshold(false);
    }
  }

  const processSinglePayment = async (payee: BlockchainPayee) => {
    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
      if (payee.lastPayment !== 0n && Number(payee.lastPayment) >= thirtyDaysAgo) {
        toast.error('This payee has been paid within the last 30 days');
        return;
      }
      
      const treasuryBalanceBigInt = parseUnits(treasuryBalance, 6)
      if (treasuryBalanceBigInt < payee.salary) {
        toast.error(`Insufficient treasury balance. Required: $${formatUnits(payee.salary, 6)} USDC`);
        return;
      }
      
      const paymentResult = await processX402Payment(payee.address, payee.salary);
      
      if (paymentResult?.success) {
        toast.success(`Payment to ${payee.address.substring(0, 10)}... completed!`);
        setTimeout(() => {
          fetchPayrollData();
        }, 2000);
      }
    } catch (error: any) {
      toast.error(`Payment error: ${error.message}`);
    }
  };

  const isPayeeDue = (payee: BlockchainPayee) => {
    if (payee.lastPayment === 0n) return true;
    
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
    return Number(payee.lastPayment) < thirtyDaysAgo;
  };

  const formatSalary = (salary: bigint) => {
    return formatUnits(salary, 6);
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === 0n) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  };

  const formatAccrued = (accrued: bigint) => {
    return formatUnits(accrued, 6);
  };

  const isUserContractOwner = contractOwner.toLowerCase() === user?.wallet?.address?.toLowerCase();
  const totalMonthlyPayrollUSD = formatUnits(totalMonthlyPayroll, 6);

  if (!authenticated) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
              <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-primary-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8 px-4">
              Connect your wallet to access payroll automation features
            </p>
            <ConnectButton  />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <div className="w-full overflow-x-hidden min-h-screen bg-background">
      <Container>
        <div className="py-4 sm:py-6 lg:py-8 w-full">
          
          {/* Header */}
          <div className="mb-6 sm:mb-8 w-full">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <div className="w-full sm:w-auto">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Payroll Automation</h1>
                  <button
                    onClick={refreshData}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-gray-400 text-sm sm:text-base mt-1">Manage and automate x402-powered payments</p>
                
                {isUserContractOwner && (
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-green-500/20 text-green-400 text-xs sm:text-sm">
                    <Shield className="h-3 w-3 mr-1" />
                    Contract Owner
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-surface border border-gray-700 flex-1 sm:flex-none min-w-0 sm:min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary-400" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-gray-400 truncate">Your Balance</div>
                      <div className="font-semibold text-white text-sm sm:text-base truncate">
                        {userWalletBalance} USDC.e
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-surface border border-gray-700 flex-1 sm:flex-none min-w-0 sm:min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-gray-400 truncate">Treasury</div>
                      <div className="font-semibold text-white text-sm sm:text-base truncate">
                        {treasuryBalance} USDC.e
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && !error.toLowerCase().includes('threshold') && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error/10 border border-error/30 rounded-lg w-full">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-error mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-error text-sm sm:text-base break-words">{error}</div>
              </div>
            </div>
          )}

          {/* Payroll Summary Card */}
          <div className="glass rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/30 w-full">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 w-full">
              <div className="flex-1 w-full">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Payroll Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
                  <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">Total Payees</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">{activePayees.length}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">Due for Payment</div>
                    <div className="text-xl sm:text-2xl font-bold text-warning">{duePayeesCount}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">Monthly Payroll</div>
                    <div className="text-xl sm:text-2xl font-bold text-primary-400">
                      ${totalMonthlyPayrollUSD}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">Treasury Status</div>
                    <div className={`text-lg sm:text-lg font-bold ${
                      parseFloat(treasuryBalance) >= parseFloat(totalMonthlyPayrollUSD) 
                        ? 'text-success' 
                        : 'text-error'
                    }`}>
                      {parseFloat(treasuryBalance) >= parseFloat(totalMonthlyPayrollUSD) 
                        ? 'Sufficient' 
                        : 'Insufficient'}
                    </div>
                  </div>
                </div>
              </div>
              
              {duePayeesCount > 0 && (
                <div className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-warning/30 w-full sm:w-auto">
                  <div className="text-xs sm:text-sm text-warning mb-1 sm:mb-2">⚠️ Payroll Alert</div>
                  <p className="text-white text-xs sm:text-sm">
                    {duePayeesCount} payee{duePayeesCount > 1 ? 's' : ''} due for payment
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Total required: ${totalMonthlyPayrollUSD} USDC
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Owner Warning */}
          {!isUserContractOwner && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg w-full">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-yellow-500 text-sm sm:text-base">
                  You are not the contract owner. Only the owner can add payees, update thresholds, or trigger payroll.
                  <div className="text-xs sm:text-sm mt-1">
                    Contract owner: {contractOwner.substring(0, 8)}...{contractOwner.substring(contractOwner.length - 6)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Payee Modal */}
          {showAddPayee && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-surface rounded-2xl p-4 sm:p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Add New Payee</h3>
                  <button
                    onClick={() => setShowAddPayee(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg"
                  >
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                
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
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm sm:text-base"
                    />
                    <p className="text-xs text-gray-400 mt-1">Enter valid Ethereum address (0x...)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Salary (USDC)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">$</span>
                      </div>
                      <input
                        type="number"
                        value={payeeForm.salary}
                        onChange={(e) => setPayeeForm({...payeeForm, salary: e.target.value})}
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm sm:text-base"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Monthly salary in USDC (e.g., 1000 = $1000)</p>
                    <p className="text-xs text-blue-400 mt-1">
                      Will be converted to {payeeForm.salary ? (parseFloat(payeeForm.salary) * 1000000).toLocaleString() : '0'} base units (6 decimals)
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                  <button
                    onClick={() => setShowAddPayee(false)}
                    disabled={addingPayee}
                    className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayee}
                    disabled={addingPayee || !payeeForm.address || !payeeForm.salary || !isUserContractOwner}
                    className="flex-1 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {addingPayee ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Payee'
                    )}
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Ensure the address is correct and hasn't been added before. 
                    Transaction requires gas fees and may take a few seconds to confirm.
                    {!isUserContractOwner && (
                      <span className="text-yellow-300 block mt-1">
                        Only contract owner can add payees.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Automation Controls */}
          <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 w-full">
            <div className="flex flex-col space-y-6 sm:space-y-0 lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 w-full">
              <div className="flex-1 w-full">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Automated Payroll</h2>
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-gray-400 text-sm sm:text-base">
                    <span className="text-primary-400 font-medium">Start Automation:</span> Enables the x402 agent to monitor revenue and automatically trigger payroll when conditions are met
                  </p>
                  <p className="text-gray-400 text-sm sm:text-base">
                    <span className="text-primary-400 font-medium">Run Payroll Now:</span> Manually creates payment requests and initiates x402 payments immediately
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className={`w-2 h-2 rounded-full ${automationEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-300">
                      {automationEnabled ? 'Automation active - monitoring for due payments' : 'Automation paused'}
                    </span>
                  </div>
                  
                  {/* Payroll Requirements */}
                  <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Payroll Requirements:</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className={`h-3 w-3 mr-2 ${isUserContractOwner ? 'text-success' : 'text-error'}`} />
                        Must be contract owner: {isUserContractOwner ? '✓' : '✗'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className={`h-3 w-3 mr-2 ${duePayeesCount > 0 ? 'text-success' : 'text-error'}`} />
                        Due payees available: {duePayeesCount} {duePayeesCount > 0 ? '✓' : '✗'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className={`h-3 w-3 mr-2 ${
                          parseFloat(treasuryBalance) >= parseFloat(totalMonthlyPayrollUSD) ? 'text-success' : 'text-error'
                        }`} />
                        Treasury balance sufficient: {parseFloat(treasuryBalance) >= parseFloat(totalMonthlyPayrollUSD) ? '✓' : '✗'}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 text-blue-400" />
                        <span className="text-blue-400">Note: Manual trigger ignores revenue threshold</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-col xl:flex-row items-stretch gap-2 sm:gap-3 w-full lg:w-auto">
                <button
                  onClick={toggleAutomation}
                  className={`px-4 py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    isRunning 
                      ? 'bg-error/20 text-error border border-error/30 hover:bg-error/30' 
                      : 'bg-success/20 text-success border border-success/30 hover:bg-success/30'
                  } transition-colors text-sm sm:text-base w-full`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                      Stop Automation
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      Start Automation
                    </>
                  )}
                </button>
                
                <button
                  onClick={triggerPayroll}
                  disabled={loading || duePayeesCount === 0 || x402Processing || !isUserContractOwner || parseFloat(treasuryBalance) < parseFloat(totalMonthlyPayrollUSD)}
                  className="px-4 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all text-sm sm:text-base w-full"
                  title={!isUserContractOwner ? 'Only contract owner can trigger payroll' : 
                         duePayeesCount === 0 ? 'No payees due for payment' : 
                         parseFloat(treasuryBalance) < parseFloat(totalMonthlyPayrollUSD) ? 'Insufficient treasury balance' : ''}
                >
                  {loading || x402Processing ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                      Run Payroll Now (x402)
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowAddPayee(true)}
                  disabled={!isUserContractOwner}
                  className="px-4 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all text-sm sm:text-base w-full"
                  title={!isUserContractOwner ? 'Only contract owner can add payees' : ''}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  Add Payee
                </button>
              </div>
            </div>
          </div>

          {/* Active Payees */}
          <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 w-full">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 w-full">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Active Payees</h2>
              <div className="text-sm text-gray-400 text-right sm:text-left">
                {activePayees.length} payee(s) • {duePayeesCount} due for payment • Total monthly: ${totalMonthlyPayrollUSD}
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <p className="mt-2 text-gray-400">Loading payees...</p>
              </div>
            ) : activePayees.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Payees Found</h3>
                <p className="text-gray-400 text-sm sm:text-base mb-4">Add payees to start managing payroll</p>
                <button
                  onClick={() => setShowAddPayee(true)}
                  disabled={!isUserContractOwner}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors text-sm sm:text-base"
                >
                  Add Your First Payee
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <div className="min-w-[800px] sm:min-w-0 w-full">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm">Address</th>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm">Salary</th>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm hidden md:table-cell">Last Paid</th>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm">Accrued</th>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm">Status</th>
                        <th className="text-left p-2 sm:p-3 text-gray-300 font-medium text-xs sm:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {activePayees.map((payee, index) => {
                        const isProcessing = processingPayments.includes(payee.address);
                        const isDue = isPayeeDue(payee);
                        const hasSufficientBalance = parseFloat(treasuryBalance) >= parseFloat(formatSalary(payee.salary));
                        
                        return (
                          <tr key={index} className="hover:bg-gray-800/30">
                            <td className="p-2 sm:p-3">
                              <div className="font-mono text-xs sm:text-sm text-white break-all sm:break-normal">
                                <span className="hidden sm:inline">
                                  {payee.address.substring(0, 8)}...{payee.address.substring(payee.address.length - 6)}
                                </span>
                                <span className="sm:hidden">
                                  {payee.address.substring(0, 6)}...{payee.address.substring(payee.address.length - 4)}
                                </span>
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
                            <td className="p-2 sm:p-3">
                              <div className="font-semibold text-white text-sm sm:text-base">
                                ${formatSalary(payee.salary)}
                              </div>
                              <div className="text-xs text-gray-400">Monthly</div>
                            </td>
                            <td className="p-2 sm:p-3 hidden md:table-cell">
                              <div className="text-gray-300 text-sm">
                                {formatDate(payee.lastPayment)}
                              </div>
                              {isDue && payee.lastPayment !== 0n && (
                                <div className="text-xs text-yellow-400">Overdue</div>
                              )}
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="text-gray-300 text-sm sm:text-base">
                                ${formatAccrued(payee.accrued)}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3">
                              {isProcessing ? (
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Processing
                                </span>
                              ) : payee.lastPayment === 0n ? (
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  New
                                </span>
                              ) : isDue ? (
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Due
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="p-2 sm:p-3">
                              <button
                                onClick={() => processSinglePayment(payee)}
                                disabled={isProcessing || !isDue || !hasSufficientBalance}
                                className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-primary-500/30 flex items-center gap-1 whitespace-nowrap"
                                title={!isDue ? 'Not due for payment' : !hasSufficientBalance ? 'Insufficient treasury balance' : ''}
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Processing
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight className="h-3 w-3" />
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
              </div>
            )}
          </div>

          {/* Revenue Threshold Settings */}
          <div className="glass rounded-2xl p-4 sm:p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Revenue Threshold Settings</h2>
              <button
                onClick={() => {
                  toast('Set the minimum treasury balance required to trigger automated payroll. Only contract owner can update this.', {
                    duration: 4000,
                  })
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Explain Revenue Threshold"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Revenue to Trigger Payroll (USDC)
                </label>
                <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">$</span>
                    </div>
                    <input
                      type="number"
                      value={revenueThreshold}
                      onChange={(e) => setRevenueThreshold(e.target.value)}
                      placeholder="10000"
                      min="0"
                      step="100"
                      className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none text-sm sm:text-base"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">USDC</span>
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateThreshold}
                    disabled={updatingThreshold || !isUserContractOwner}
                    className="px-4 sm:px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                    title={!isUserContractOwner ? 'Only contract owner can update threshold' : 'Update threshold on blockchain'}
                  >
                    {updatingThreshold ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update on Chain'
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Payroll automation will trigger when treasury balance exceeds this amount
                  {!isUserContractOwner && (
                    <span className="text-yellow-400 block mt-1 text-xs sm:text-sm">
                      ⚠️ Only contract owner can update threshold
                    </span>
                  )}
                </p>
                
                {/* Show threshold-specific errors here */}
                {error && error.toLowerCase().includes('threshold') && (
                  <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-error mr-2" />
                      <div className="text-error text-sm">{error}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 sm:p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Hash className="h-4 w-4" />
                  How it works:
                </h4>
                <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
                  <li>• When treasury balance ≥ threshold, x402 agent checks for due payments</li>
                  <li>• Creates x402 payment challenges for each due payee</li>
                  <li>• Prevents frequent small transactions (saves gas)</li>
                  <li>• Recommended: Set to 2-3x monthly payroll amount</li>
                  <li className="text-blue-400">
                    • Current threshold: ${revenueThreshold} USDC ({parseUnits(revenueThreshold, 6).toLocaleString()} base units)
                  </li>
                  <li className="text-warning">
                    • Monthly payroll: ${totalMonthlyPayrollUSD} USDC
                  </li>
                  <li className={`${parseFloat(treasuryBalance) >= parseFloat(revenueThreshold) ? 'text-success' : 'text-error'}`}>
                    • Treasury status: ${treasuryBalance} USDC ({parseFloat(treasuryBalance) >= parseFloat(revenueThreshold) ? 'Above' : 'Below'} threshold)
                  </li>
                  <li className="text-yellow-400">
                    • Manual trigger ignores threshold, automation requires it
                  </li>
                  <li className="text-green-400">
                    • Click "Update on Chain" to save changes to blockchain
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}