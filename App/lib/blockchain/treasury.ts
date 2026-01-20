// lib/blockchain/treasury.ts
import { readContract } from 'viem/actions'
import { publicClient } from './provider'
import { CONTRACTS, TREASURY_ABI, USDC_ABI } from '@/config/contracts'

export interface Payee {
  address: string
  salary: bigint
  lastPayment: Date
  accrued: bigint
  active: boolean
}

export async function getTreasuryBalance(): Promise<bigint> {
  try {
    const balance = await readContract(publicClient, {
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [CONTRACTS.TREASURY_MANAGER],
    })
    
    return balance as bigint
  } catch (error) {
    console.error('Failed to get treasury balance:', error)
    throw new Error('Failed to fetch treasury balance from blockchain')
  }
}

export async function getActivePayees(): Promise<Payee[]> {
  try {
    const result = await readContract(publicClient, {
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getActivePayees',
    })
    
    const [addresses, salaries, lastPayments, accrued] = result as [string[], bigint[], bigint[], bigint[]]
    
    return addresses.map((address, index) => ({
      address,
      salary: salaries[index],
      lastPayment: new Date(Number(lastPayments[index]) * 1000),
      accrued: accrued[index],
      active: true
    }))
  } catch (error) {
    console.error('Failed to get active payees:', error)
    throw new Error('Failed to fetch payees from blockchain')
  }
}

export async function getRevenueThreshold(): Promise<bigint> {
  try {
    const threshold = await readContract(publicClient, {
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'revenueThreshold',
    })
    
    return threshold as bigint
  } catch (error) {
    console.error('Failed to get revenue threshold:', error)
    throw new Error('Failed to fetch revenue threshold from blockchain')
  }
}

export async function getTotalAccrued(): Promise<bigint> {
  try {
    const accrued = await readContract(publicClient, {
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getTotalAccrued',
    })
    
    return accrued as bigint
  } catch (error) {
    console.error('Failed to get total accrued:', error)
    throw new Error('Failed to fetch total accrued from blockchain')
  }
}

export async function shouldTriggerPayroll(currentRevenue: bigint): Promise<boolean> {
  try {
    const shouldTrigger = await readContract(publicClient, {
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'shouldTriggerPayroll',
      args: [currentRevenue],
    })
    
    return shouldTrigger as boolean
  } catch (error) {
    console.error('Failed to check payroll trigger:', error)
    throw new Error('Failed to check payroll trigger condition')
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