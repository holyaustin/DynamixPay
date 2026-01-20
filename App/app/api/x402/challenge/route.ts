// app/api/x402/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { Facilitator, Contract } from '@crypto.com/facilitator-client'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet'
const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payee = searchParams.get('payee')
    const amount = searchParams.get('amount')
    const requestId = searchParams.get('requestId')

    if (!payee || !amount || !requestId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: payee, amount, requestId'
      }, { status: 400 })
    }

    // Validate payee address
    const payeeAddress = payee as `0x${string}`
    
    // Get payment request details from contract
    let paymentDetails
    try {
      const TREASURY_ABI = [
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

      const result = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getPaymentRequest',
        args: [BigInt(requestId)]
      }) as [string, bigint, bigint, string, boolean]

      const [contractPayee, contractAmount, , , settled] = result

      // Verify payment request is valid and not already settled
      if (contractPayee.toLowerCase() !== payeeAddress.toLowerCase()) {
        return NextResponse.json({
          success: false,
          error: 'Payee address does not match payment request'
        }, { status: 400 })
      }

      if (settled) {
        return NextResponse.json({
          success: false,
          error: 'Payment request already settled'
        }, { status: 400 })
      }

      // Verify amount matches
      if (contractAmount.toString() !== amount) {
        return NextResponse.json({
          success: false,
          error: 'Amount does not match payment request'
        }, { status: 400 })
      }

      paymentDetails = {
        payee: contractPayee,
        amount: contractAmount.toString(),
        settled: false
      }

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment request or contract error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    // Generate payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Create x402 payment challenge
    const challenge = {
      x402Version: 1,
      error: 'payment_required',
      accepts: [{
        scheme: 'exact',
        network: NETWORK,
        asset: NETWORK === 'cronos-mainnet' ? Contract.USDCe : Contract.DevUSDCe,
        payTo: payeeAddress,
        maxAmountRequired: amount,
        resource: `/api/x402/settle?requestId=${requestId}`,
        description: 'Treasury Payroll Payment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 300, // 5 minutes
        outputSchema: {
          type: 'object',
          properties: {
            txHash: { type: 'string' },
            paymentId: { type: 'string' },
            requestId: { type: 'string' },
            settledAt: { type: 'string' }
          }
        },
        extra: {
          paymentId,
          requestId,
          contractAddress: CONTRACTS.TREASURY_MANAGER,
          timestamp: new Date().toISOString(),
          paymentType: 'payroll'
        }
      }]
    }

    return NextResponse.json(challenge)

  } catch (error: any) {
    console.error('GET /api/x402/challenge error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment challenge',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}