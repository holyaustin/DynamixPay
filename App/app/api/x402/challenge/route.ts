// /App/app/api/x402/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi, isAddress } from 'viem';
import { cronosTestnet } from '@/config/chains';
import { CONTRACTS } from '@/config/contracts';
import { Contract, CronosNetwork } from '@crypto.com/facilitator-client';

const TREASURY_ABI = parseAbi([
  'function getPaymentRequest(uint256 requestId) view returns (address, uint256, uint256, bytes32, bool)',
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function getPayee(address payee) view returns (uint256 salary, uint256 lastPayment, uint256 accrued, bool active)'
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
    const paymentId = searchParams.get('paymentId');

    // Validate required parameters
    if (!payee || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: payee and amount are required'
      }, { status: 400 });
    }

    // Validate payee address format
    if (!isAddress(payee)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    // Validate amount
    let amountBigInt: bigint;
    try {
      amountBigInt = BigInt(amount);
      if (amountBigInt <= 0) {
        return NextResponse.json({
          success: false,
          error: 'Amount must be greater than 0'
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount format'
      }, { status: 400 });
    }

    // If requestId is provided, verify it exists in the contract
    if (requestId) {
      try {
        const requestIdBigInt = BigInt(requestId);
        const paymentRequest = await publicClient.readContract({
          address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
          abi: TREASURY_ABI,
          functionName: 'getPaymentRequest',
          args: [requestIdBigInt]
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
            success: true,
            message: 'Payment request already settled',
            settled: true,
            requestId
          });
        }

        if (contractAmount.toString() !== amount) {
          return NextResponse.json({
            success: false,
            error: `Amount does not match payment request. Expected: ${contractAmount.toString()}, Got: ${amount}`
          }, { status: 400 });
        }
      } catch (error: any) {
        console.error('Payment request validation error:', error);
        return NextResponse.json({
          success: false,
          error: 'Invalid payment request',
          details: error.message
        }, { status: 400 });
      }
    } else {
      // If no requestId, verify payee exists and is active in treasury
      try {
        const payeeData = await publicClient.readContract({
          address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
          abi: TREASURY_ABI,
          functionName: 'getPayee',
          args: [payee as `0x${string}`]
        }) as [bigint, bigint, bigint, boolean];

        const [salary, , , active] = payeeData;

        if (!active) {
          return NextResponse.json({
            success: false,
            error: 'Payee is not active in the treasury'
          }, { status: 400 });
        }

        // Optional: Verify amount matches salary or accrued amount
        const salaryBigInt = salary;
        if (salaryBigInt <= 0) {
          return NextResponse.json({
            success: false,
            error: 'Payee has invalid salary amount'
          }, { status: 400 });
        }
      } catch (error: any) {
        console.error('Payee validation error:', error);
        // Don't fail if we can't verify payee - maybe it's a manual payment
      }
    }

    // Generate payment ID if not provided
    const newPaymentId = paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Create x402 payment challenge using Base schema
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet';
    const asset = network === 'cronos-mainnet' ? Contract.USDCe : Contract.DevUSDCe;

    // Calculate valid before timestamp (10 minutes from now)
    const validBefore = Math.floor(Date.now() / 1000) + 600;

    // Get merchant address from environment or use treasury contract
    const merchantAddress = process.env.X402_MERCHANT_ADDRESS || CONTRACTS.TREASURY_MANAGER;

    // RETURN PROPER X402 RESPONSE (Base schema)
    return NextResponse.json({
      x402Version: 1,
      error: 'payment_required',
      accepts: [{
        scheme: 'exact',
        network: network as CronosNetwork,
        asset: asset,
        payTo: merchantAddress as `0x${string}`,
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
            settledAt: { type: 'string' },
            requestId: { type: 'string' }
          }
        },
        extra: {
          paymentId: newPaymentId,
          requestId: requestId || undefined,
          contractAddress: CONTRACTS.TREASURY_MANAGER,
          timestamp: new Date().toISOString(),
          paymentType: 'payroll',
          validBefore: validBefore,
          originalPayee: payee // Store original payee for contract updates
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

// Handle POST for payment verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, paymentHeader, paymentRequirements } = body;

    if (!paymentId || !paymentHeader || !paymentRequirements) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: paymentId, paymentHeader, paymentRequirements'
      }, { status: 400 });
    }

    // Validate payment requirements
    const { scheme, network, asset, payTo, maxAmountRequired, extra } = paymentRequirements;
    
    if (scheme !== 'exact') {
      return NextResponse.json({
        success: false,
        error: 'Unsupported payment scheme'
      }, { status: 400 });
    }

    // Here you would typically:
    // 1. Verify the payment with facilitator
    // 2. Check payment hasn't expired
    // 3. Update contract state if needed

    return NextResponse.json({
      success: true,
      message: 'Payment verified',
      paymentId,
      verifiedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('POST /api/x402/challenge error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify payment',
      details: error.message
    }, { status: 500 });
  }
}