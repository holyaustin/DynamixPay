// app/api/treasury/revenue/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  createPublicClient, 
  http, 
  parseAbi, 
  parseUnits,
  createWalletClient  // Add this import
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { cronosTestnet } from '@/config/chains'  // Changed from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

// USDC ABI for balance checking
const USDC_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
])

// Revenue tracking ABI (extended from your contract)
const REVENUE_ABI = parseAbi([
  'function getTreasuryBalance() view returns (uint256)',
  'function revenueThreshold() view returns (uint256)',
  'function lastRevenueCheck() view returns (uint256)',
  'function shouldTriggerPayroll(uint256 currentRevenue) view returns (bool)',
  'function updateRevenueThreshold(uint256 newThreshold)',
  'function recordRevenue(uint256 amount, string memory source)',
  'event RevenueRecorded(uint256 amount, string source, uint256 timestamp)'
])

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
})

// GET: Get revenue data and thresholds
export async function GET(request: NextRequest) {
  try {
    // Get treasury USDC balance
    const treasuryBalance = await publicClient.readContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [CONTRACTS.TREASURY_MANAGER]
    })

    // Get revenue threshold (if function exists)
    let revenueThreshold = BigInt(0)
    try {
      revenueThreshold = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: REVENUE_ABI,
        functionName: 'revenueThreshold'
      }) as bigint
    } catch {
      // Default threshold if function doesn't exist
      revenueThreshold = parseUnits('10000', 6) // 10,000 USDC
    }

    // Get last revenue check (if function exists)
    let lastRevenueCheck = 0
    try {
      const lastCheck = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: REVENUE_ABI,
        functionName: 'lastRevenueCheck'
      }) as bigint
      lastRevenueCheck = Number(lastCheck) * 1000
    } catch {
      lastRevenueCheck = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
    }

    // Check if payroll should be triggered
    let shouldTriggerPayroll = false
    try {
      shouldTriggerPayroll = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: REVENUE_ABI,
        functionName: 'shouldTriggerPayroll',
        args: [treasuryBalance]
      }) as boolean
    } catch {
      // Fallback logic
      shouldTriggerPayroll = treasuryBalance >= revenueThreshold
    }

    // Calculate metrics
    const balanceInUSDC = Number(treasuryBalance) / 1_000_000 // USDC has 6 decimals
    const thresholdInUSDC = Number(revenueThreshold) / 1_000_000
    const percentOfThreshold = (balanceInUSDC / thresholdInUSDC) * 100

    return NextResponse.json({
      success: true,
      data: {
        currentBalance: treasuryBalance.toString(),
        currentBalanceFormatted: balanceInUSDC.toFixed(2),
        revenueThreshold: revenueThreshold.toString(),
        revenueThresholdFormatted: thresholdInUSDC.toFixed(2),
        lastRevenueCheck: new Date(lastRevenueCheck).toISOString(),
        shouldTriggerPayroll,
        metrics: {
          percentOfThreshold: percentOfThreshold.toFixed(1),
          daysSinceLastCheck: Math.floor((Date.now() - lastRevenueCheck) / (1000 * 60 * 60 * 24)),
          needsFunding: treasuryBalance < revenueThreshold
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('GET /api/treasury/revenue error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch revenue data',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST: Update revenue threshold
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { threshold, userSignature } = body

    if (!threshold || !userSignature) {
      return NextResponse.json({
        success: false,
        error: 'Threshold and user signature are required'
      }, { status: 400 })
    }

    const thresholdBigInt = parseUnits(threshold, 6) // USDC has 6 decimals

    // Verify signature
    // ...

    // Use admin wallet
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Update revenue threshold
    const hash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: REVENUE_ABI,
      functionName: 'updateRevenueThreshold',
      args: [thresholdBigInt]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        newThreshold: thresholdBigInt.toString(),
        newThresholdFormatted: threshold,
        status: 'updated',
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('POST /api/treasury/revenue error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update revenue threshold',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}