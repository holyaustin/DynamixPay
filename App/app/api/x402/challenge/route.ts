// /App/app/api/x402/challenge/route.ts - UPDATED with proper x402 response
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { cronosTestnet } from '@/config/chains';
import { CONTRACTS } from '@/config/contracts';
import { Contract } from '@crypto.com/facilitator-client';

const TREASURY_ABI = parseAbi([
  'function getPaymentRequest(uint256 requestId) view returns (address, uint256, uint256, bytes32, bool)',
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)'
]);

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payee = searchParams.get('payee');
    const amount = searchParams.get('amount');
    const requestId = searchParams.get('requestId');
    const description = searchParams.get('description') || 'Payroll Payment';

    // Validate required parameters
    if (!payee || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: payee and amount are required'
      }, { status: 400 });
    }

    // Validate payee address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(payee)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    // Validate amount
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    // If requestId is provided, verify it exists in the contract
    if (requestId) {
      try {
        const paymentRequest = await publicClient.readContract({
          address: CONTRACTS.TREASURY_MANAGER,
          abi: TREASURY_ABI,
          functionName: 'getPaymentRequest',
          args: [BigInt(requestId)]
        }) as [string, bigint, bigint, string, boolean];

        const [contractPayee, contractAmount, , , settled] = paymentRequest;

        // Verify the payment request matches
        if (contractPayee.toLowerCase() !== payee.toLowerCase()) {
          return NextResponse.json({
            success: false,
            error: 'Payee address does not match payment request'
          }, { status: 400 });
        }

        if (settled) {
          return NextResponse.json({
            success: false,
            error: 'Payment request already settled'
          }, { status: 400 });
        }

        if (contractAmount.toString() !== amount) {
          return NextResponse.json({
            success: false,
            error: 'Amount does not match payment request'
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid payment request',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
      }
    }

    // Generate payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Create x402 payment challenge using CORRECT Base-schema
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet';
    const asset = network === 'cronos-mainnet' ? Contract.USDCe : Contract.DevUSDCe;

    // RETURN PROPER X402 RESPONSE (not wrapped in success/data)
    return NextResponse.json({
      x402Version: 1,
      error: 'payment_required',
      accepts: [{
        scheme: 'exact',
        network: network,
        asset: asset,
        payTo: payee as `0x${string}`,
        maxAmountRequired: amount,
        resource: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/x402/settle`,
        description: description,
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
          requestId: requestId || undefined,
          contractAddress: CONTRACTS.TREASURY_MANAGER,
          timestamp: new Date().toISOString(),
          paymentType: 'payroll'
        }
      }]
    }, { status: 402 }); // MUST return 402 status

  } catch (error: any) {
    console.error('GET /api/x402/challenge error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment challenge',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}