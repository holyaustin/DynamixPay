// lib/blockchain/treasury.ts - Fixed version

import { ethers } from 'ethers'
import { getTreasuryContract, getUsdcContract } from './ethers-utils'

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
    
    return addresses.map((address: string, index: number) => ({
      address,
      salary: BigInt(salaries[index].toString()),
      lastPayment: new Date(Number(lastPayments[index]) * 1000),
      accrued: BigInt(accrued[index].toString()),
      active: true
    }))
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
    
    const tx = await treasuryContract.addPayee(payeeAddress, salaryWei)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to add payee:', error)
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error'
    
    if (errorMessage.includes('PayeeAlreadyExists')) {
      errorMessage = 'Payee already exists in the system'
    } else if (errorMessage.includes('InvalidAddress')) {
      errorMessage = 'Invalid Ethereum address'
    } else if (errorMessage.includes('ZeroAmount')) {
      errorMessage = 'Salary must be greater than 0'
    } else if (errorMessage.includes('revert')) {
      errorMessage = 'Contract rejected transaction. Payee may already exist.'
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}

export async function createPaymentRequests(
  signer: ethers.Signer
): Promise<{ success: boolean; requestIds?: bigint[]; transactionHash?: string; error?: string }> {
  try {
    // First, check if there are any due payments
    const payees = await getActivePayees()
    
    // Filter out the first two system payees
    const filteredPayees = payees.slice(2)
    
    if (filteredPayees.length === 0) {
      return { 
        success: false, 
        error: 'No active payees found. Add payees first.' 
      }
    }
    
    // Check for due payments
    const now = Math.floor(Date.now() / 1000)
    const thirtyDays = 30 * 24 * 60 * 60
    const duePayees = filteredPayees.filter(payee => {
      const lastPayment = Math.floor(payee.lastPayment.getTime() / 1000)
      // If never paid (lastPayment is 0) or it's been more than 30 days
      return lastPayment === 0 || (now - lastPayment >= thirtyDays)
    })
    
    if (duePayees.length === 0) {
      return { 
        success: false, 
        error: 'No payments are currently due. Payments are made every 30 days.' 
      }
    }
    
    // Calculate total due amount
    const totalDue = duePayees.reduce((sum, payee) => sum + payee.salary, BigInt(0))
    
    // Check treasury balance
    const treasuryBalance = await getTreasuryBalance()
    
    if (treasuryBalance < totalDue) {
      const needed = formatUSDC(totalDue)
      const available = formatUSDC(treasuryBalance)
      return { 
        success: false, 
        error: `Insufficient treasury balance. Need $${needed} USDC.e, have $${available} USDC.e. Please fund the treasury first.` 
      }
    }
    
    // Check if revenue threshold is met
    const revenueThreshold = await getRevenueThreshold()
    
    if (treasuryBalance < revenueThreshold) {
      const needed = formatUSDC(revenueThreshold)
      const available = formatUSDC(treasuryBalance)
      return { 
        success: false, 
        error: `Revenue threshold not met. Need $${needed} USDC.e, have $${available} USDC.e. The threshold can be adjusted in settings.` 
      }
    }
    
    // All conditions met, proceed with creating payment requests
    const treasuryContract = getTreasuryContract(signer)
    const tx = await treasuryContract.createPaymentRequests()
    const receipt = await tx.wait()
    
    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' }
    }
    
    // Parse logs to get event data
    const contractInterface = treasuryContract.interface
    const contractAddress = await treasuryContract.getAddress()
    
    // Parse logs to get event data
    const parsedLogs = receipt.logs
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
      .filter((log: any) => log !== null)
    
    // Extract PaymentRequestCreated events
    const paymentRequestEvents = parsedLogs.filter(
      (log: any) => log?.name === 'PaymentRequestCreated'
    )
    
    // Extract request IDs from events
    const requestIds = paymentRequestEvents.map((event: any) => 
      event.args.requestId ? BigInt(event.args.requestId.toString()) : BigInt(0)
    )
    
    // Also check for PayrollTriggered event
    const payrollTriggeredEvents = parsedLogs.filter(
      (log: any) => log?.name === 'PayrollTriggered'
    )
    
    if (payrollTriggeredEvents.length > 0) {
      console.log('Payroll triggered successfully:', payrollTriggeredEvents[0].args)
    }
    
    return { 
      success: true, 
      requestIds: requestIds.length > 0 ? requestIds : undefined,
      transactionHash: tx.hash
    }
  } catch (error: any) {
    console.error('Failed to create payment requests:', error)
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error'
    
    if (errorMessage.includes('InsufficientBalance')) {
      errorMessage = 'Insufficient funds in treasury'
    } else if (errorMessage.includes('NotTimeForPayment')) {
      errorMessage = 'Not enough time has passed since last payment (30-day interval)'
    } else if (errorMessage.includes('revert')) {
      // Try to extract revert reason
      try {
        if (error.data && error.data !== '0x') {
          // Check for common error selectors
          const errorData = error.data
          
          if (errorData.startsWith('0x08c379a0')) { // Error(string)
            const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + errorData.slice(10))
            errorMessage = `Contract error: ${reason[0]}`
          } else if (errorData.startsWith('0x1e6f2836')) { // InsufficientBalance()
            errorMessage = 'Insufficient balance in treasury'
          } else if (errorData.startsWith('0x0f4cf0a6')) { // NotTimeForPayment()
            errorMessage = 'Not enough time has passed since last payment'
          }
        }
      } catch (decodeError) {
        console.error('Failed to decode error:', decodeError)
      }
    } else if (errorMessage.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by your wallet'
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for gas fee'
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
      error: error.message || 'Unknown error' 
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
      error: error.message || 'Unknown error' 
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
      error: error.message || 'Unknown error' 
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

// ==================== BATCH OPERATIONS ====================

export async function addMultiplePayees(
  signer: ethers.Signer,
  payees: { address: string; salary: string }[]
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    
    const addresses = payees.map(p => p.address)
    const salaries = payees.map(p => ethers.parseUnits(p.salary, 6))
    
    const tx = await treasuryContract.addPayees(addresses, salaries)
    const receipt = await tx.wait()
    
    return { 
      success: true, 
      transactionHash: tx.hash 
    }
  } catch (error: any) {
    console.error('Failed to add multiple payees:', error)
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    }
  }
}

// ==================== EVENT LISTENING ====================

export interface ContractEvent {
  event: string
  blockNumber: number
  transactionHash: string
  args: any
  timestamp: Date
}

export async function getRecentEvents(
  fromBlock?: number,
  toBlock?: number
): Promise<ContractEvent[]> {
  try {
    const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
    const treasuryContract = getTreasuryContract()
    const contractAddress = await treasuryContract.getAddress()
    
    const currentBlock = await provider.getBlockNumber()
    const startBlock = fromBlock || currentBlock - 10000
    const endBlock = toBlock || currentBlock
    
    // Get logs for all events
    const filter = {
      address: contractAddress,
      fromBlock: startBlock,
      toBlock: endBlock
    }
    
    const logs = await provider.getLogs(filter)
    
    // Parse logs
    const events: ContractEvent[] = []
    const contractInterface = treasuryContract.interface
    
    for (const log of logs) {
      try {
        const parsedLog = contractInterface.parseLog({
          topics: [...log.topics],
          data: log.data
        })
        
        // FIXED: Add null check before accessing parsedLog properties
        if (!parsedLog) {
          continue
        }
        
        const block = await provider.getBlock(log.blockNumber)
        
        events.push({
          event: parsedLog.name, // Now safe to access
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: parsedLog.args,
          timestamp: new Date(Number(block?.timestamp || 0) * 1000)
        })
      } catch (error) {
        console.warn('Failed to parse log:', error)
      }
    }
    
    return events
  } catch (error) {
    console.error('Failed to get recent events:', error)
    return []
  }
}

// ==================== ADDITIONAL HELPER FUNCTIONS ====================

export async function checkPayrollConditions(): Promise<{
  canTrigger: boolean
  reason?: string
  duePayees: number
  totalDue: string
  treasuryBalance: string
  revenueThreshold: string
}> {
  try {
    const payees = await getActivePayees()
    const filteredPayees = payees.slice(2) // Exclude system payees
    
    if (filteredPayees.length === 0) {
      return {
        canTrigger: false,
        reason: 'No active payees found',
        duePayees: 0,
        totalDue: '0.00',
        treasuryBalance: '0.00',
        revenueThreshold: '0.00'
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
        treasuryBalance: '0.00',
        revenueThreshold: '0.00'
      }
    }
    
    // Calculate total due
    const totalDue = duePayees.reduce((sum, payee) => sum + payee.salary, BigInt(0))
    
    // Check treasury balance
    const treasuryBalance = await getTreasuryBalance()
    
    if (treasuryBalance < totalDue) {
      return {
        canTrigger: false,
        reason: `Insufficient treasury balance. Need $${formatUSDC(totalDue)} USDC.e`,
        duePayees: duePayees.length,
        totalDue: formatUSDC(totalDue),
        treasuryBalance: formatUSDC(treasuryBalance),
        revenueThreshold: formatUSDC(await getRevenueThreshold())
      }
    }
    
    // Check revenue threshold
    const revenueThreshold = await getRevenueThreshold()
    
    if (treasuryBalance < revenueThreshold) {
      return {
        canTrigger: false,
        reason: `Revenue threshold not met. Need $${formatUSDC(revenueThreshold)} USDC.e`,
        duePayees: duePayees.length,
        totalDue: formatUSDC(totalDue),
        treasuryBalance: formatUSDC(treasuryBalance),
        revenueThreshold: formatUSDC(revenueThreshold)
      }
    }
    
    return {
      canTrigger: true,
      duePayees: duePayees.length,
      totalDue: formatUSDC(totalDue),
      treasuryBalance: formatUSDC(treasuryBalance),
      revenueThreshold: formatUSDC(revenueThreshold)
    }
  } catch (error) {
    console.error('Failed to check payroll conditions:', error)
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