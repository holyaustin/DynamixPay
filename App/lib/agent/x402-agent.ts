// lib/agent/x402-agent.ts
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { cronosTestnet } from '@/config/chains'
import { CONTRACTS } from '@/config/contracts'

// Treasury Manager ABI for agent operations
const TREASURY_ABI = parseAbi([
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function shouldTriggerPayroll(uint256 currentRevenue) view returns (bool)',
  'function createPaymentRequests() returns (uint256[] memory, uint256)',
  'function getTreasuryBalance() view returns (uint256)',
  'function getPaymentRequest(uint256 requestId) view returns (address, uint256, uint256, bytes32, bool)',
  'event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount)',
  'event PaymentRequestCreated(uint256 indexed requestId, address indexed payee, uint256 amount, bytes32 x402PaymentId)',
  'event PaymentSettled(uint256 indexed requestId, bytes32 txHash)'
])

// x402 Payment Challenge structure based on official documentation
interface X402PaymentChallenge {
  x402Version: number;
  error: string;
  accepts: Array<{
    scheme: string;
    network: string;
    asset: string;
    payTo: `0x${string}`;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    maxTimeoutSeconds: number;
    outputSchema: {
      type: string;
      properties: Record<string, { type: string }>;
    };
    extra: Record<string, any>;
  }>;
}

export class X402Agent {
  private publicClient: ReturnType<typeof createPublicClient>
  private isRunning: boolean = false
  private checkInterval: number = 300000 // 5 minutes
  private intervalId: NodeJS.Timeout | null = null
  private lastProcessedBlock: bigint = BigInt(0)

  constructor() {
    this.publicClient = createPublicClient({
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })
  }

  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🚀 x402 Agent started')
    
    // Get initial block number
    try {
      const blockNumber = await this.publicClient.getBlockNumber()
      this.lastProcessedBlock = blockNumber
      console.log(`📦 Starting from block: ${blockNumber.toString()}`)
    } catch (error) {
      console.error('Failed to get initial block number:', error)
    }
    
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
        console.log('💰 Conditions met, checking for due payments...')
        await this.processDuePayments()
      } else {
        console.log('⏳ Conditions not met, waiting...')
      }

      // 3. Check for recent contract events
      await this.checkContractEvents()

    } catch (error) {
      console.error('Error checking payroll:', error)
    }
  }

  async processDuePayments() {
    try {
      // Get active payees
      const payeeData = await this.getPayeeData()
      
      if (payeeData.addresses.length === 0) {
        console.log('📭 No active payees found')
        return
      }

      const now = Math.floor(Date.now() / 1000)
      const thirtyDays = 30 * 24 * 60 * 60
      let duePaymentsCount = 0

      // Check which payees have payments due
      for (let i = 0; i < payeeData.addresses.length; i++) {
        const lastPayment = Number(payeeData.lastPayments[i])
        if (now - lastPayment >= thirtyDays) {
          duePaymentsCount++
          const payee = payeeData.addresses[i]
          const amount = payeeData.salaries[i]
          
          console.log(`📋 Payment due for ${payee}: ${amount.toString()} USDC`)
          
          // Create payment request in the contract
          await this.createPaymentRequest(payee, amount)
        }
      }

      if (duePaymentsCount > 0) {
        console.log(`✅ Found ${duePaymentsCount} due payment(s)`)
      } else {
        console.log('✅ No payments due at this time')
      }

    } catch (error) {
      console.error('Error processing due payments:', error)
    }
  }

  async createPaymentRequest(payee: string, amount: bigint) {
    try {
      // In production, this would be called via an admin wallet
      // For now, we'll create the x402 challenge directly
      const paymentId = this.generatePaymentId(payee)
      
      // Create x402 payment challenge according to official spec
      const challenge = await this.createX402Challenge(payee, amount, paymentId)
      
      // Store the challenge (in production, save to database)
      await this.storePaymentChallenge(paymentId, {
        payee,
        amount: amount.toString(),
        status: 'pending',
        challenge,
        createdAt: new Date().toISOString()
      })

      console.log(`📝 Created payment challenge for ${payee}: ${paymentId}`)
      
      return {
        paymentId,
        challenge
      }

    } catch (error) {
      console.error(`Error creating payment request for ${payee}:`, error)
      throw error
    }
  }

  async createX402Challenge(payee: string, amount: bigint, paymentId: string): Promise<X402PaymentChallenge> {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
    const asset = network === 'cronos-mainnet' ? 'USDC.e' : 'DevUSDC.e'
    
    // Following the official x402 challenge structure from Cronos docs
    return {
      x402Version: 1,
      error: 'payment_required',
      accepts: [{
        scheme: 'exact',
        network: network,
        asset: asset,
        payTo: payee as `0x${string}`,
        maxAmountRequired: amount.toString(),
        resource: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/x402/settle`,
        description: 'Automated Payroll Payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600, // 10 minutes
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
          contractAddress: CONTRACTS.TREASURY_MANAGER,
          paymentType: 'payroll',
          timestamp: new Date().toISOString()
        }
      }]
    }
  }

  async checkContractEvents() {
    try {
      const currentBlock = await this.publicClient.getBlockNumber()
      
      if (this.lastProcessedBlock >= currentBlock) {
        return // No new blocks
      }

      console.log(`🔍 Checking events from block ${this.lastProcessedBlock.toString()} to ${currentBlock.toString()}`)

      // Get PayrollTriggered events
      const payrollEvents = await this.publicClient.getLogs({
        address: CONTRACTS.TREASURY_MANAGER,
        event: parseAbiItem('event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount)'),
        fromBlock: this.lastProcessedBlock + BigInt(1),
        toBlock: currentBlock
      })

      // Get PaymentRequestCreated events
      const paymentRequestEvents = await this.publicClient.getLogs({
        address: CONTRACTS.TREASURY_MANAGER,
        event: parseAbiItem('event PaymentRequestCreated(uint256 indexed requestId, address indexed payee, uint256 amount, bytes32 x402PaymentId)'),
        fromBlock: this.lastProcessedBlock + BigInt(1),
        toBlock: currentBlock
      })

      // Get PaymentSettled events
      const paymentSettledEvents = await this.publicClient.getLogs({
        address: CONTRACTS.TREASURY_MANAGER,
        event: parseAbiItem('event PaymentSettled(uint256 indexed requestId, bytes32 txHash)'),
        fromBlock: this.lastProcessedBlock + BigInt(1),
        toBlock: currentBlock
      })

      // Process events
      for (const event of payrollEvents) {
        console.log('📊 PayrollTriggered event detected:', event)
        await this.handlePayrollTriggered(event)
      }

      for (const event of paymentRequestEvents) {
        console.log('📄 PaymentRequestCreated event detected:', event)
        await this.handlePaymentRequestCreated(event)
      }

      for (const event of paymentSettledEvents) {
        console.log('✅ PaymentSettled event detected:', event)
        await this.handlePaymentSettled(event)
      }

      this.lastProcessedBlock = currentBlock

    } catch (error) {
      console.error('Error checking contract events:', error)
    }
  }

  async handlePayrollTriggered(event: any) {
    try {
      const { timestamp, totalAmount, payeeCount } = event.args
      console.log(`🎯 Payroll triggered at ${new Date(Number(timestamp) * 1000)}: ${totalAmount.toString()} USDC for ${payeeCount.toString()} payees`)
      
      // In production, you would:
      // 1. Send notifications
      // 2. Update analytics
      // 3. Log to database
      
    } catch (error) {
      console.error('Error handling PayrollTriggered event:', error)
    }
  }

  async handlePaymentRequestCreated(event: any) {
    try {
      const { requestId, payee, amount, x402PaymentId } = event.args
      console.log(`📄 Payment request created: ID ${requestId.toString()} for ${payee} - ${amount.toString()} USDC`)
      
      // Store payment request info
      await this.storePaymentRequest(Number(requestId), {
        payee,
        amount: amount.toString(),
        x402PaymentId: x402PaymentId.toString(),
        status: 'created',
        createdAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error handling PaymentRequestCreated event:', error)
    }
  }

  async handlePaymentSettled(event: any) {
    try {
      const { requestId, txHash } = event.args
      console.log(`✅ Payment settled: Request ID ${requestId.toString()}, TX: ${txHash.toString()}`)
      
      // Update payment status
      await this.updatePaymentStatus(Number(requestId), {
        status: 'settled',
        txHash: txHash.toString(),
        settledAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error handling PaymentSettled event:', error)
    }
  }

  async getPayeeData() {
    try {
      const result = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getActivePayees'
      })

      const [addresses, salaries, lastPayments, accrued] = result as [string[], bigint[], bigint[], bigint[]]

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

  async getPaymentRequest(requestId: number) {
    try {
      const result = await this.publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getPaymentRequest',
        args: [BigInt(requestId)]
      })

      const [payee, amount, timestamp, x402Id, settled] = result as [string, bigint, bigint, string, boolean]

      return {
        payee,
        amount: amount.toString(),
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        x402Id,
        settled
      }
    } catch (error) {
      console.error(`Error getting payment request ${requestId}:`, error)
      return null
    }
  }

  // Make this method public so it can be accessed from outside
  generatePaymentId(payee: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    const payeeShort = payee.substring(2, 10)
    return `pay_${timestamp}_${payeeShort}_${random}`
  }

  private async storePaymentChallenge(paymentId: string, data: any) {
    // In production, store in database
    // For now, we'll use localStorage for demo
    if (typeof window !== 'undefined') {
      const challenges = JSON.parse(localStorage.getItem('x402_payment_challenges') || '{}')
      challenges[paymentId] = data
      localStorage.setItem('x402_payment_challenges', JSON.stringify(challenges))
    }
  }

  private async storePaymentRequest(requestId: number, data: any) {
    // In production, store in database
    // For now, we'll use localStorage for demo
    if (typeof window !== 'undefined') {
      const requests = JSON.parse(localStorage.getItem('x402_payment_requests') || '{}')
      requests[requestId] = data
      localStorage.setItem('x402_payment_requests', JSON.stringify(requests))
    }
  }

  private async updatePaymentStatus(requestId: number, updates: any) {
    // In production, update in database
    // For now, we'll use localStorage for demo
    if (typeof window !== 'undefined') {
      const requests = JSON.parse(localStorage.getItem('x402_payment_requests') || '{}')
      if (requests[requestId]) {
        requests[requestId] = { ...requests[requestId], ...updates }
        localStorage.setItem('x402_payment_requests', JSON.stringify(requests))
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString(),
      lastProcessedBlock: this.lastProcessedBlock.toString(),
      checkInterval: this.checkInterval,
      network: process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
    }
  }

  // Method to manually trigger payroll (for testing/admin)
  async manualTriggerPayroll() {
    console.log('👨‍💼 Manual payroll trigger requested')
    await this.checkAndProcessPayroll()
  }

  // Method to get pending payments
  async getPendingPayments() {
    try {
      const payeeData = await this.getPayeeData()
      const now = Math.floor(Date.now() / 1000)
      const thirtyDays = 30 * 24 * 60 * 60
      
      const pendingPayments = []
      
      for (let i = 0; i < payeeData.addresses.length; i++) {
        const lastPayment = Number(payeeData.lastPayments[i])
        if (now - lastPayment >= thirtyDays) {
          pendingPayments.push({
            payee: payeeData.addresses[i],
            amount: payeeData.salaries[i].toString(),
            lastPayment: new Date(lastPayment * 1000).toISOString(),
            daysSinceLastPayment: Math.floor((now - lastPayment) / (24 * 60 * 60))
          })
        }
      }
      
      return pendingPayments
    } catch (error) {
      console.error('Error getting pending payments:', error)
      return []
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

// Helper function to get x402 challenge for a specific payment
export async function getX402ChallengeForPayment(payee: string, amount: bigint, requestId?: string) {
  const paymentId = requestId || x402Agent.generatePaymentId(payee)
  return await x402Agent.createX402Challenge(payee, amount, paymentId)
}