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
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    }
  }
}

export async function createPaymentRequests(
  signer: ethers.Signer
): Promise<{ success: boolean; requestIds?: bigint[]; transactionHash?: string; error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const tx = await treasuryContract.createPaymentRequests()
    const receipt = await tx.wait()
    
    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' }
    }
    
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
    
    return { 
      success: true, 
      requestIds: requestIds.length > 0 ? requestIds : undefined,
      transactionHash: tx.hash
    }
  } catch (error: any) {
    console.error('Failed to create payment requests:', error)
    return { success: false, error: error.message }
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


/*
// lib/blockchain/treasury.ts
import { publicClient } from './provider'
import { CONTRACTS } from '@/config/contracts'

// Properly typed ABIs
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const TREASURY_ABI = [
  {
    name: 'getActivePayees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '', type: 'address[]' },
      { name: '', type: 'uint256[]' },
      { name: '', type: 'uint256[]' },
      { name: '', type: 'uint256[]' },
    ],
  },
  {
    name: 'getTotalAccrued',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'revenueThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'shouldTriggerPayroll',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'currentRevenue', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
  active: boolean
}

export async function getTreasuryBalance(): Promise<bigint> {
  try {
    console.log('Fetching treasury balance from:', CONTRACTS.USDC)
    console.log('Treasury manager address:', CONTRACTS.TREASURY_MANAGER)
    
    const balance = await publicClient.readContract({
      address: CONTRACTS.USDC as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [CONTRACTS.TREASURY_MANAGER as `0x${string}`],
    })
    
    console.log('Balance result:', balance)
    
    // Return directly - Viem already returns the correct type
    return balance as bigint
  } catch (error) {
    console.error('Failed to get treasury balance:', error)
    // Return 0 instead of throwing to prevent breaking the UI
    return BigInt(0)
  }
}

export async function getActivePayees(): Promise<Payee[]> {
  try {
    console.log('Fetching active payees from:', CONTRACTS.TREASURY_MANAGER)
    
    const result = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'getActivePayees',
    }) as readonly [`0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]]
    
    console.log('Payees result:', result)
    
    if (!result || result.length !== 4) {
      console.warn('Unexpected payees result format:', result)
      return []
    }
    
    const [addresses, salaries, lastPayments, accrued] = result
    
    return addresses.map((address, index) => ({
      address,
      salary: salaries[index] || BigInt(0),
      lastPayment: new Date(Number(lastPayments[index] || BigInt(0)) * 1000),
      accrued: accrued[index] || BigInt(0),
      active: true
    }))
  } catch (error) {
    console.error('Failed to get active payees:', error)
    // Return empty array instead of throwing
    return []
  }
}

export async function getRevenueThreshold(): Promise<bigint> {
  try {
    const threshold = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'revenueThreshold',
    })
    
    return threshold as bigint
  } catch (error) {
    console.error('Failed to get revenue threshold:', error)
    return BigInt(0)
  }
}

export async function getTotalAccrued(): Promise<bigint> {
  try {
    console.log('Fetching total accrued from:', CONTRACTS.TREASURY_MANAGER)
    
    const accrued = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'getTotalAccrued',
    })
    
    console.log('Total accrued result:', accrued)
    
    return accrued as bigint
  } catch (error) {
    console.error('Failed to get total accrued:', error)
    return BigInt(0)
  }
}

export async function shouldTriggerPayroll(currentRevenue: bigint): Promise<boolean> {
  try {
    const shouldTrigger = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'shouldTriggerPayroll',
      args: [currentRevenue],
    })
    
    return shouldTrigger as boolean
  } catch (error) {
    console.error('Failed to check payroll trigger:', error)
    return false
  }
}

// Helper function to format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1_000_000).toFixed(2)
}

// Helper to check if payment is due
export function isPaymentDue(lastPayment: Date): boolean {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return lastPayment < thirtyDaysAgo
}
  */