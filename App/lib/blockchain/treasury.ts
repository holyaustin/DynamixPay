// lib/blockchain/treasury.ts
import { ethers } from 'ethers'
import { getTreasuryContract } from './ethers-utils'

export interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
  active: boolean
}

export interface PaymentRequest {
  id: bigint
  payee: string
  amount: bigint
  timestamp: Date
  x402Id: string
  settled: boolean
}

// ==================== READ FUNCTIONS ====================

export async function getTreasuryBalance(): Promise<bigint> {
  try {
    const treasuryContract = getTreasuryContract()
    const balance = await treasuryContract.getTreasuryBalance()
    return BigInt(balance.toString())
  } catch (error) {
    console.error('Failed to get treasury balance:', error)
    return BigInt(0)
  }
}

export async function getActivePayees(): Promise<Payee[]> {
  try {
    const treasuryContract = getTreasuryContract()
    const [addresses, salaries, lastPayments, accrued] = await treasuryContract.getActivePayees()
    
    // Convert to proper format
    const payees: Payee[] = []
    for (let i = 0; i < addresses.length; i++) {
      payees.push({
        address: addresses[i],
        salary: BigInt(salaries[i].toString()),
        lastPayment: new Date(Number(lastPayments[i]) * 1000),
        accrued: BigInt(accrued[i].toString()),
        active: true
      })
    }
    
    return payees
  } catch (error) {
    console.error('Failed to get active payees:', error)
    return []
  }
}

export async function getTotalAccrued(): Promise<bigint> {
  try {
    const treasuryContract = getTreasuryContract()
    const accrued = await treasuryContract.getTotalAccrued()
    return BigInt(accrued.toString())
  } catch (error) {
    console.error('Failed to get total accrued:', error)
    return BigInt(0)
  }
}

export async function getRevenueThreshold(): Promise<bigint> {
  try {
    const treasuryContract = getTreasuryContract()
    const threshold = await treasuryContract.revenueThreshold()
    return BigInt(threshold.toString())
  } catch (error) {
    console.error('Failed to get revenue threshold:', error)
    return ethers.parseUnits('10000', 6) // Default 10,000 USDC
  }
}

export async function shouldTriggerPayroll(currentRevenue: bigint): Promise<boolean> {
  try {
    const treasuryContract = getTreasuryContract()
    const shouldTrigger = await treasuryContract.shouldTriggerPayroll(currentRevenue)
    return shouldTrigger
  } catch (error) {
    console.error('Failed to check payroll trigger:', error)
    
    // Fallback logic
    const threshold = await getRevenueThreshold()
    return currentRevenue >= threshold
  }
}

export async function getPaymentRequest(requestId: bigint): Promise<PaymentRequest | null> {
  try {
    const treasuryContract = getTreasuryContract()
    const [payee, amount, timestamp, x402Id, settled] = await treasuryContract.getPaymentRequest(requestId)
    
    return {
      id: requestId,
      payee,
      amount: BigInt(amount.toString()),
      timestamp: new Date(Number(timestamp) * 1000),
      x402Id,
      settled
    }
  } catch (error) {
    console.error('Failed to get payment request:', error)
    return null
  }
}

export async function getActivePayeeCount(): Promise<number> {
  try {
    const treasuryContract = getTreasuryContract()
    const count = await treasuryContract.getActivePayeeCount()
    return Number(count)
  } catch (error) {
    console.error('Failed to get active payee count:', error)
    return 0
  }
}

// ==================== WRITE FUNCTIONS ====================

export async function addPayee(
  signer: ethers.Signer, 
  payeeAddress: string, 
  salary: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const salaryWei = ethers.parseUnits(salary, 6)
    
    console.log('Adding payee:', { payeeAddress, salary, salaryWei: salaryWei.toString() })
    
    const tx = await treasuryContract.addPayee(payeeAddress, salaryWei)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to add payee:', error)
    
    let errorMessage = 'Failed to add payee'
    
    if (error.code === 'CALL_EXCEPTION') {
      if (error.data) {
        try {
          const iface = getTreasuryContract().interface
          const decodedError = iface.parseError(error.data)
          errorMessage = `Contract error: ${decodedError?.name || 'Unknown error'}`
        } catch {
          errorMessage = 'Contract rejected transaction'
        }
      }
    } else if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'Transaction rejected by user'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for gas'
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}

// FIXED: Simplified createPaymentRequests - let the contract handle all checks
export async function createPaymentRequests(
  signer: ethers.Signer
): Promise<{ success: boolean; requestIds?: bigint[]; transactionHash?: string; error?: string }> {
  try {
    console.log('Creating payment requests...')
    
    const treasuryContract = getTreasuryContract(signer)
    
    // Direct contract call - contract will handle all checks internally
    const tx = await treasuryContract.createPaymentRequests()
    console.log('Transaction sent:', tx.hash)
    
    const receipt = await tx.wait()
    
    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' }
    }
    
    // Parse logs to get created request IDs
    const contractInterface = treasuryContract.interface
    const contractAddress = await treasuryContract.getAddress()
    
    const paymentRequestEvents = receipt.logs
      .filter((log: any) => log.address.toLowerCase() === contractAddress.toLowerCase())
      .map((log: any) => {
        try {
          return contractInterface.parseLog({
            topics: [...log.topics],
            data: log.data
          })
        } catch {
          return null
        }
      })
      .filter((log: any) => log !== null && log.name === 'PaymentRequestCreated')
    
    const requestIds = paymentRequestEvents.map((event: any) => 
      event.args.requestId ? BigInt(event.args.requestId.toString()) : BigInt(0)
    )
    
    console.log('Created request IDs:', requestIds)
    
    return { 
      success: true, 
      requestIds: requestIds.length > 0 ? requestIds : undefined,
      transactionHash: tx.hash
    }
  } catch (error: any) {
    console.error('Failed to create payment requests:', error)
    
    let errorMessage = 'Failed to create payment requests'
    
    if (error.code === 'CALL_EXCEPTION') {
      if (error.data) {
        try {
          const iface = getTreasuryContract().interface
          const decodedError = iface.parseError(error.data)
          
          if (decodedError?.name === 'InsufficientBalance') {
            errorMessage = 'Insufficient treasury balance'
          } else if (decodedError?.name === 'NoDuePayees') {
            errorMessage = 'No payees are due for payment'
          } else if (decodedError?.name === 'NotTimeForPayment') {
            errorMessage = 'Payees have been paid recently (30-day interval)'
          } else {
            errorMessage = `Contract error: ${decodedError?.name || 'Unknown'}`
          }
        } catch {
          errorMessage = 'Contract rejected transaction'
        }
      }
    } else if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'Transaction rejected by user'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for gas'
    } else if (error.message?.includes('user rejected')) {
      errorMessage = 'Transaction rejected by user'
    }
    
    return { success: false, error: errorMessage }
  }
}

export async function updateRevenueThreshold(
  signer: ethers.Signer,
  newThreshold: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const thresholdWei = ethers.parseUnits(newThreshold, 6)
    
    const tx = await treasuryContract.updateRevenueThreshold(thresholdWei)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to update revenue threshold:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update threshold' 
    }
  }
}

export async function updatePayeeSalary(
  signer: ethers.Signer,
  payeeAddress: string,
  newSalary: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const salaryWei = ethers.parseUnits(newSalary, 6)
    
    const tx = await treasuryContract.updatePayeeSalary(payeeAddress, salaryWei)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to update payee salary:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update salary' 
    }
  }
}

export async function deactivatePayee(
  signer: ethers.Signer,
  payeeAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    
    const tx = await treasuryContract.deactivatePayee(payeeAddress)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to deactivate payee:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to deactivate payee' 
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

export function formatUSDC(amount: bigint | string): string {
  try {
    const amountStr = typeof amount === 'bigint' ? amount.toString() : amount
    const amountNum = parseFloat(ethers.formatUnits(amountStr, 6))
    return amountNum.toFixed(2)
  } catch {
    return '0.00'
  }
}

export function isPaymentDue(lastPayment: Date): boolean {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return lastPayment < thirtyDaysAgo
}

export function calculateDuePayees(payees: Payee[]): number {
  return payees.filter(payee => isPaymentDue(payee.lastPayment)).length
}

export function calculateTotalMonthlyOutflow(payees: Payee[]): bigint {
  return payees.reduce((sum, payee) => sum + payee.salary, BigInt(0))
}

// ==================== NEW HELPER FUNCTIONS ====================

export async function getPayee(address: string): Promise<{ 
  salary: bigint; 
  lastPayment: bigint; 
  accrued: bigint; 
  active: boolean 
} | null> {
  try {
    const treasuryContract = getTreasuryContract()
    const [salary, lastPayment, accrued, active] = await treasuryContract.getPayee(address)
    
    return {
      salary: BigInt(salary.toString()),
      lastPayment: BigInt(lastPayment.toString()),
      accrued: BigInt(accrued.toString()),
      active
    }
  } catch (error) {
    console.error('Failed to get payee:', error)
    return null
  }
}

export async function checkPayrollReadiness(): Promise<{
  canTrigger: boolean
  reason?: string
  duePayees: number
  totalDue: string
  treasuryBalance: string
  revenueThreshold: string
  isOwner?: boolean
}> {
  try {
    // Get basic info
    const [payees, treasuryBalance, revenueThreshold] = await Promise.all([
      getActivePayees(),
      getTreasuryBalance(),
      getRevenueThreshold()
    ])
    
    // Filter out system payees (first 2)
    const filteredPayees = payees.slice(2)
    
    if (filteredPayees.length === 0) {
      return {
        canTrigger: false,
        reason: 'No active payees found',
        duePayees: 0,
        totalDue: '0.00',
        treasuryBalance: formatUSDC(treasuryBalance),
        revenueThreshold: formatUSDC(revenueThreshold)
      }
    }
    
    // Check for due payments
    const now = Math.floor(Date.now() / 1000)
    const thirtyDays = 30 * 24 * 60 * 60
    const duePayees = filteredPayees.filter(payee => {
      const lastPayment = Math.floor(payee.lastPayment.getTime() / 1000)
      return lastPayment === 0 || (now - lastPayment >= thirtyDays)
    })
    
    if (duePayees.length === 0) {
      return {
        canTrigger: false,
        reason: 'No payments are currently due',
        duePayees: 0,
        totalDue: '0.00',
        treasuryBalance: formatUSDC(treasuryBalance),
        revenueThreshold: formatUSDC(revenueThreshold)
      }
    }
    
    // Calculate total due
    const totalDue = duePayees.reduce((sum, payee) => sum + payee.salary, BigInt(0))
    
    // Check treasury balance
    if (treasuryBalance < totalDue) {
      return {
        canTrigger: false,
        reason: `Insufficient treasury balance. Need $${formatUSDC(totalDue)} USDC.e`,
        duePayees: duePayees.length,
        totalDue: formatUSDC(totalDue),
        treasuryBalance: formatUSDC(treasuryBalance),
        revenueThreshold: formatUSDC(revenueThreshold)
      }
    }
    
    // Note: Manual trigger doesn't check revenue threshold, only automation does
    return {
      canTrigger: true,
      duePayees: duePayees.length,
      totalDue: formatUSDC(totalDue),
      treasuryBalance: formatUSDC(treasuryBalance),
      revenueThreshold: formatUSDC(revenueThreshold)
    }
  } catch (error) {
    console.error('Failed to check payroll readiness:', error)
    return {
      canTrigger: false,
      reason: 'Error checking conditions',
      duePayees: 0,
      totalDue: '0.00',
      treasuryBalance: '0.00',
      revenueThreshold: '0.00'
    }
  }
}