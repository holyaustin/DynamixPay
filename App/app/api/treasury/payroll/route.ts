// app/api/treasury/payroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  createWalletClient, 
  createPublicClient, 
  http,
  parseAbi
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

// Treasury Manager ABI
const TREASURY_ABI = parseAbi([
  'function createPaymentRequests() returns (uint256[] memory, uint256)',
  'function markPaymentSettled(uint256 requestId, bytes32 x402PaymentId, bytes32 txHash)',
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function getTreasuryBalance() view returns (uint256)',
  'function getPaymentRequest(uint256 requestId) view returns (address, uint256, uint256, bytes32, bool)',
  'function getTotalAccrued() view returns (uint256)',
  'function shouldTriggerPayroll(uint256 currentRevenue) view returns (bool)',
  'function revenueThreshold() view returns (uint256)',
  'function lastRevenueCheck() view returns (uint256)',
  'event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount)',
  'event PaymentRequestCreated(uint256 indexed requestId, address indexed payee, uint256 amount, bytes32 x402PaymentId)',
  'event PaymentSettled(uint256 indexed requestId, bytes32 txHash)',
  'event PayeeAdded(address indexed payee, uint256 salary)'
])

// USDC ABI
const USDC_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
])

// Create blockchain clients
const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
})

// GET: Get payroll status and pending payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const requestId = searchParams.get('requestId')

    // Get treasury balance
    const treasuryBalance = await publicClient.readContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [CONTRACTS.TREASURY_MANAGER]
    })

    // Get total accrued
    const totalAccrued = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getTotalAccrued'
    })

    // Get active payees
    const [addresses, salaries, lastPayments, accrued] = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getActivePayees'
    }) as [string[], bigint[], bigint[], bigint[]]

    // Get specific payment request if requested
    let paymentRequest = null
    if (requestId) {
      const [payee, amount, timestamp, x402Id, settled] = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getPaymentRequest',
        args: [BigInt(requestId)]
      }) as [string, bigint, bigint, string, boolean]

      paymentRequest = {
        payee,
        amount: amount.toString(),
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        x402Id,
        settled
      }
    }

    // Calculate due payments
    const now = Math.floor(Date.now() / 1000)
    const thirtyDays = 30 * 24 * 60 * 60
    const duePayees = addresses.map((addr, index) => {
      const lastPayment = Number(lastPayments[index])
      return {
        address: addr,
        salary: salaries[index].toString(),
        lastPayment: new Date(lastPayment * 1000).toISOString(),
        accrued: accrued[index].toString(),
        isDue: now - lastPayment >= thirtyDays
      }
    }).filter(p => p.isDue)

    return NextResponse.json({
      success: true,
      data: {
        treasuryBalance: treasuryBalance.toString(),
        totalAccrued: totalAccrued.toString(),
        activePayees: addresses.length,
        duePayments: duePayees.length,
        totalMonthlyOutflow: salaries.reduce((sum, salary) => sum + salary, BigInt(0)).toString(),
        duePayees,
        paymentRequest,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('GET /api/treasury/payroll error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payroll data',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST: Create payment requests and trigger payroll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAddress, signature } = body

    if (!userAddress || !signature) {
      return NextResponse.json({
        success: false,
        error: 'User address and signature are required'
      }, { status: 400 })
    }

    // In production, verify the signature matches the userAddress
    // This ensures only authorized users can trigger payroll

    // Use admin wallet to execute transaction
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Call createPaymentRequests on contract
    const hash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'createPaymentRequests'
    })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // Parse events from receipt
    const events = receipt.logs
      .filter(log => log.address.toLowerCase() === CONTRACTS.TREASURY_MANAGER.toLowerCase())
      .map(log => {
        try {
          // Simplified event parsing
          return {
            event: 'ContractEvent',
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber?.toString()
          }
        } catch (e) {
          console.error('Error decoding event:', e)
          return null
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        receipt: {
          status: receipt.status,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: receipt.effectiveGasPrice?.toString()
        },
        events,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('POST /api/treasury/payroll error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger payroll',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}