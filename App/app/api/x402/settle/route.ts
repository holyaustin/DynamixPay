// app/api/x402/settle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  createWalletClient, 
  createPublicClient, 
  http
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { Facilitator } from '@crypto.com/facilitator-client'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

// Treasury contract ABI for marking payments as settled
const TREASURY_ABI = [
  {
    name: 'markPaymentSettled',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'x402PaymentId', type: 'bytes32' },
      { name: 'txHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'getPaymentRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      { name: 'payee', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'x402Id', type: 'bytes32' },
      { name: 'settled', type: 'bool' }
    ]
  }
] as const

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentHeader, paymentRequirements, userAddress } = body

    if (!paymentHeader || !paymentRequirements || !userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: paymentHeader, paymentRequirements, userAddress'
      }, { status: 400 })
    }

    // Extract requestId from payment requirements
    const requestId = paymentRequirements.extra?.requestId
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'Payment request ID not found in requirements'
      }, { status: 400 })
    }

    // Initialize facilitator - FIXED: removed facilitatorUrl parameter
    const facilitator = new Facilitator({
      network: paymentRequirements.network || 'cronos-testnet'
      // The facilitator automatically uses the correct URL based on network
      // For testnet: https://x402-facilitator-testnet.cronos.org
      // For mainnet: https://x402-facilitator.cronos.org
    })

    // Verify the payment
    const verifyResult = await facilitator.verifyPayment({
      x402Version: 1,
      paymentHeader,
      paymentRequirements
    })

    if (!verifyResult.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Payment verification failed',
        details: verifyResult
      }, { status: 400 })
    }

    // Settle the payment via x402
    const settleResult = await facilitator.settlePayment({
      x402Version: 1,
      paymentHeader,
      paymentRequirements
    })

    if (settleResult.event !== 'payment.settled') {
      return NextResponse.json({
        success: false,
        error: 'Payment settlement failed',
        details: settleResult
      }, { status: 400 })
    }

    // Now mark the payment as settled in our Treasury contract
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Convert txHash string to bytes32
    const txHash = settleResult.txHash || ''
    const txHashBytes32 = txHash.startsWith('0x') ? txHash as `0x${string}` : `0x${txHash}` as `0x${string}`
    
    // Get x402PaymentId - should be in paymentRequirements.extra.paymentId
    const x402PaymentId = paymentRequirements.extra?.paymentId || ''
    
    // Convert x402PaymentId to bytes32 if it's not already
    let paymentIdBytes32: `0x${string}`
    if (x402PaymentId.startsWith('0x')) {
      paymentIdBytes32 = x402PaymentId as `0x${string}`
    } else if (x402PaymentId) {
      // Pad the string to 32 bytes (64 hex chars + 0x prefix)
      const hexId = Buffer.from(x402PaymentId).toString('hex')
      paymentIdBytes32 = `0x${hexId.padStart(64, '0').slice(0, 64)}` as `0x${string}`
    } else {
      paymentIdBytes32 = '0x' as `0x${string}`
    }

    // Call markPaymentSettled on Treasury contract
    const markSettledHash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'markPaymentSettled',
      args: [
        BigInt(requestId),
        paymentIdBytes32,
        txHashBytes32
      ]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: markSettledHash 
    })

    // Verify the payment is now marked as settled
    const [payee, amount, timestamp, x402Id, settled] = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getPaymentRequest',
      args: [BigInt(requestId)]
    }) as [string, bigint, bigint, string, boolean]

    return NextResponse.json({
      success: true,
      data: {
        x402Settlement: {
          txHash: settleResult.txHash,
          paymentId: paymentRequirements.extra?.paymentId,
          settledAt: new Date().toISOString()
        },
        contractUpdate: {
          transactionHash: markSettledHash,
          requestId,
          markedSettled: settled,
          receipt: {
            status: receipt.status,
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString()
          }
        },
        paymentDetails: {
          payee,
          amount: amount.toString(),
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
          x402Id,
          settled
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('POST /api/x402/settle error:', error)
    return NextResponse.json({
      success: false,
      error: 'Payment settlement failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}