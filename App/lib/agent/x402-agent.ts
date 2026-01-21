// lib/agent/x402-agent.ts
// x402 Agent for automated payments
import { Facilitator, Contract } from '@crypto.com/facilitator-client'
import { createPublicClient, http, parseAbi } from 'viem'
import { cronosTestnet } from '@/config/chains'
import { CONTRACTS } from '@/config/contracts'

// Import the correct CronosNetwork type from the facilitator client
// We'll use the actual type from the library by importing it properly
type NetworkConfig = {
  network: 'cronos-testnet' | 'cronos-mainnet'
  facilitatorUrl?: string
}

// Treasury Manager ABI for agent operations
const TREASURY_ABI = parseAbi([
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function shouldTriggerPayroll(uint256 currentRevenue) view returns (bool)',
  'function createPaymentRequests() returns (uint256[] memory, uint256)',
  'function getTreasuryBalance() view returns (uint256)',
  'event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount)'
])

export class X402Agent {
  private facilitator: Facilitator
  private publicClient: ReturnType<typeof createPublicClient>
  private isRunning: boolean = false
  private checkInterval: number = 300000 // 5 minutes
  private intervalId: NodeJS.Timeout | null = null

  constructor() {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
    
    // Create facilitator with correct network parameter
    // The @crypto.com/facilitator-client expects specific network values
    if (network === 'cronos-testnet' || network === 'cronos-mainnet') {
      this.facilitator = new Facilitator({
        network: network as 'cronos-testnet' | 'cronos-mainnet'
      })
    } else {
      // Default to testnet if invalid network
      this.facilitator = new Facilitator({
        network: 'cronos-testnet'
      })
    }

    this.publicClient = createPublicClient({
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })
  }

  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🚀 x402 Agent started')
    
    // Initial check
    await this.checkAndProcessPayroll()
    
    // Set up interval
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.checkAndProcessPayroll()
      }
    }, this.checkInterval)
  }

  stop() {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('⏹️ x402 Agent stopped')
  }

  async checkAndProcessPayroll() {
    try {
      console.log('🔍 Checking payroll conditions...')
      
      // 1. Get treasury balance
      const balance = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getTreasuryBalance'
      }) as bigint

      console.log(`💰 Treasury Balance: ${balance.toString()}`)

      // 2. Check if payroll should trigger
      const shouldTrigger = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'shouldTriggerPayroll',
        args: [balance]
      }) as boolean

      if (shouldTrigger) {
        console.log('💰 Conditions met, triggering payroll...')
        await this.triggerPayroll()
      } else {
        console.log('⏳ Conditions not met, waiting...')
      }
    } catch (error) {
      console.error('Error checking payroll:', error)
    }
  }

  async triggerPayroll() {
    try {
      console.log('🎯 Payroll triggered via x402 agent')
      
      // Get active payees with proper type handling
      const result = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getActivePayees'
      })

      // Type-safe extraction - handle all return values
      const fullResult = result as [string[], bigint[], bigint[], bigint[]]
      const [addresses, salaries] = [fullResult[0], fullResult[1]]
      
      console.log(`📋 Processing ${addresses.length} payees`)
      
      // Process each payee through x402
      const paymentPromises = addresses.map((address, index) => 
        this.processPayeePayment(address, salaries[index])
      )
      
      await Promise.all(paymentPromises)

      console.log('✅ Payroll processing complete')
    } catch (error) {
      console.error('Error triggering payroll:', error)
    }
  }

  async processPayeePayment(payee: string, amount: bigint) {
    try {
      console.log(`💸 Processing payment to ${payee}: ${amount.toString()}`)
      
      // Create x402 payment challenge
      const challenge = await this.createPaymentChallenge(payee, amount)
      
      // In production, you would:
      // 1. Store challenge in database
      // 2. Send to payee via webhook/email
      // 3. Monitor for settlement
      
      console.log(`📝 Created challenge for ${payee}:`, challenge)
      
      return challenge
    } catch (error) {
      console.error(`Error processing payment for ${payee}:`, error)
      throw error
    }
  }

  async createPaymentChallenge(payee: string, amount: bigint) {
    const paymentId = `agent_pay_${Date.now()}_${payee.slice(2, 10)}`
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
    
    // Determine asset based on network
    let asset: any = Contract.DevUSDCe // Default to testnet
    if (network === 'cronos-mainnet') {
      asset = Contract.USDCe
    }
    
    return {
      x402Version: 1,
      error: 'payment_required',
      accepts: [{
        scheme: 'exact',
        network: network as 'cronos-testnet' | 'cronos-mainnet',
        asset: asset,
        payTo: payee as `0x${string}`,
        maxAmountRequired: amount.toString(),
        resource: `/api/x402/settle?auto=true&agent=true`,
        description: 'Automated Agent Payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600,
        outputSchema: {
          type: 'object',
          properties: {
            txHash: { type: 'string' },
            paymentId: { type: 'string' },
            settledAt: { type: 'string' }
          }
        },
        extra: {
          paymentId,
          agent: 'x402-payroll-agent',
          timestamp: new Date().toISOString(),
          amount: amount.toString(),
          payee
        }
      }]
    }
  }

  async simulatePayment(payee: string, amount: bigint) {
    // Simulation function for testing
    const challenge = await this.createPaymentChallenge(payee, amount)
    
    // Simulate successful payment
    return {
      success: true,
      challenge,
      simulated: true,
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      paymentId: challenge.accepts[0].extra.paymentId
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString(),
      checkInterval: this.checkInterval,
      network: process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
    }
  }

  async getPayeeData() {
    try {
      const result = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getActivePayees'
      })

      const fullResult = result as [string[], bigint[], bigint[], bigint[]]
      const [addresses, salaries, lastPayments, accrued] = fullResult

      return {
        addresses,
        salaries,
        lastPayments,
        accrued
      }
    } catch (error) {
      console.error('Error getting payee data:', error)
      return {
        addresses: [],
        salaries: [],
        lastPayments: [],
        accrued: []
      }
    }
  }
}

// Singleton instance
export const x402Agent = new X402Agent()

// Helper function to start agent (for API routes)
export async function startX402Agent() {
  try {
    await x402Agent.start()
    return { success: true, status: x402Agent.getStatus() }
  } catch (error) {
    console.error('Failed to start x402 agent:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}