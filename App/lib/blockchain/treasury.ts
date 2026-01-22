// lib/blockchain/treasury.ts

import { ethers } from 'ethers'
import { getTreasuryContract, getUsdcContract } from './ethers-utils'

export interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
  active: boolean
}

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

export async function addPayee(signer: ethers.Signer, payeeAddress: string, salary: string): Promise<boolean> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const salaryWei = ethers.parseUnits(salary, 6)
    
    const tx = await treasuryContract.addPayee(payeeAddress, salaryWei)
    await tx.wait()
    
    return true
  } catch (error) {
    console.error('Failed to add payee:', error)
    return false
  }
}

// Enhanced version with proper event parsing
export async function createPaymentRequests(signer: ethers.Signer): Promise<{ success: boolean, requestIds?: bigint[], error?: string }> {
  try {
    const treasuryContract = getTreasuryContract(signer)
    const tx = await treasuryContract.createPaymentRequests()
    const receipt = await tx.wait()
    
    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' }
    }
    
    // Get the contract interface to parse logs
    const contractInterface = treasuryContract.interface
    const contractAddress = await treasuryContract.getAddress()
    
    // Parse all logs from this contract - FIXED: use Promise.all for async operations
    const parsedLogsPromises = receipt.logs.map(async (log: any) => {
      try {
        // Convert address to string for comparison
        let logAddress: string
        if (typeof log.address === 'string') {
          logAddress = log.address
        } else if (log.address && typeof log.address.getAddress === 'function') {
          logAddress = await log.address.getAddress()
        } else {
          logAddress = String(log.address)
        }
        
        if (logAddress.toLowerCase() === contractAddress.toLowerCase()) {
          return contractInterface.parseLog({
            topics: [...log.topics],
            data: log.data
          })
        }
        return null
      } catch {
        return null // Log doesn't belong to this contract
      }
    })
    
    const parsedLogs = (await Promise.all(parsedLogsPromises)).filter((log: any) => log !== null)
    
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
      requestIds: requestIds.length > 0 ? requestIds : undefined 
    }
  } catch (error: any) {
    console.error('Failed to create payment requests:', error)
    return { success: false, error: error.message }
  }
}

export async function getPaymentRequest(requestId: number): Promise<any> {
  try {
    const treasuryContract = getTreasuryContract()
    const [payee, amount, timestamp, x402Id, settled] = await treasuryContract.getPaymentRequest(requestId)
    
    return {
      payee,
      amount: amount.toString(),
      timestamp: new Date(Number(timestamp) * 1000),
      x402Id,
      settled
    }
  } catch (error) {
    console.error('Failed to get payment request:', error)
    return null
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