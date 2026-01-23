// /App/app/api/x402/settle/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from '@/config/chains';
import { CONTRACTS } from '@/config/contracts';
import { Facilitator, CronosNetwork, Contract } from '@crypto.com/facilitator-client';

// Initialize clients
const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
});

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
      { name: 'x402PaymentId', type: 'bytes32' },
      { name: 'settled', type: 'bool' }
    ]
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentHeader, paymentRequirements } = body;

    if (!paymentHeader || !paymentRequirements) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: paymentHeader, paymentRequirements'
      }, { status: 400 });
    }

    // Extract metadata
    const requestId = paymentRequirements.extra?.requestId;
    const paymentId = paymentRequirements.extra?.paymentId;
    const originalPayee = paymentRequirements.extra?.originalPayee;
    const contractAddress = paymentRequirements.extra?.contractAddress;
    const amount = paymentRequirements.maxAmountRequired;

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID not found in requirements'
      }, { status: 400 });
    }

    console.log('Processing settlement:', {
      paymentId,
      requestId,
      originalPayee,
      amount,
      payTo: paymentRequirements.payTo
    });

    // Initialize facilitator
    const network = process.env.NEXT_PUBLIC_NETWORK || 'cronos-testnet';
    const facilitator = new Facilitator({ 
      network: network as CronosNetwork 
    });

    // Verify payment
    console.log('Verifying payment...');
    const verifyResult = await facilitator.verifyPayment({
      x402Version: 1,
      paymentHeader,
      paymentRequirements
    });

    if (!verifyResult.isValid) {
      console.error('Payment verification failed:', verifyResult);
      return NextResponse.json({
        success: false,
        error: 'Payment verification failed',
        details: verifyResult
      }, { status: 400 });
    }

    console.log('Payment verified successfully, settling...');

    // Settle payment
    const settleResult = await facilitator.settlePayment({
      x402Version: 1,
      paymentHeader,
      paymentRequirements
    });

    if (settleResult.event !== 'payment.settled' || !settleResult.txHash) {
      console.error('Payment settlement failed:', settleResult);
      return NextResponse.json({
        success: false,
        error: 'Payment settlement failed',
        details: settleResult
      }, { status: 400 });
    }

    console.log('Payment settled successfully. TxHash:', settleResult.txHash);

    // If requestId exists, mark payment as settled in Treasury contract
    let contractUpdate = null;
    if (requestId && contractAddress && CONTRACTS.TREASURY_MANAGER) {
      try {
        // First verify the payment request exists and is not settled
        const paymentRequest = await publicClient.readContract({
          address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
          abi: TREASURY_ABI,
          functionName: 'getPaymentRequest',
          args: [BigInt(requestId)]
        }) as [string, bigint, bigint, string, boolean];

        const [payeeAddress, , , , alreadySettled] = paymentRequest;

        if (alreadySettled) {
          contractUpdate = {
            error: 'Payment request already settled',
            requestId,
            markedSettled: false
          };
        } else {
          // Use admin wallet to update contract
          if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
            console.warn('Treasury admin private key not configured, skipping contract update');
            contractUpdate = {
              warning: 'Admin key not configured, contract not updated',
              requestId
            };
          } else {
            const adminAccount = privateKeyToAccount(
              process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`
            );
            
            const walletClient = createWalletClient({
              account: adminAccount,
              chain: cronosTestnet,
              transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
            });

            // Convert txHash to bytes32
            const txHash = settleResult.txHash;
            const txHashBytes32 = txHash.startsWith('0x') 
              ? txHash as `0x${string}` 
              : `0x${txHash}` as `0x${string}`;
            
            // Convert paymentId to bytes32
            let paymentIdBytes32: `0x${string}`;
            if (paymentId.startsWith('0x')) {
              paymentIdBytes32 = paymentId as `0x${string}`;
            } else {
              // Pad to 32 bytes
              const hexId = Buffer.from(paymentId).toString('hex');
              paymentIdBytes32 = `0x${hexId.padStart(64, '0').slice(0, 64)}` as `0x${string}`;
            }

            console.log('Marking payment as settled in contract...', {
              requestId,
              paymentId,
              txHash
            });

            // Call markPaymentSettled on Treasury contract
            const markSettledHash = await walletClient.writeContract({
              address: CONTRACTS.TREASURY_MANAGER as `0x${string}`,
              abi: TREASURY_ABI,
              functionName: 'markPaymentSettled',
              args: [
                BigInt(requestId),
                paymentIdBytes32,
                txHashBytes32
              ]
            });

            console.log('Contract update transaction sent:', markSettledHash);

            contractUpdate = {
              transactionHash: markSettledHash,
              requestId,
              markedSettled: true,
              paymentId,
              contractAddress: CONTRACTS.TREASURY_MANAGER
            };
          }
        }
      } catch (error: any) {
        console.error('Failed to update contract:', error);
        contractUpdate = {
          error: error.message,
          requestId,
          markedSettled: false
        };
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        x402Settlement: {
          txHash: settleResult.txHash,
          paymentId,
          settledAt: new Date().toISOString(),
          event: settleResult.event,
          amount: amount
        },
        contractUpdate,
        metadata: {
          requestId,
          originalPayee,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error: any) {
    console.error('POST /api/x402/settle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Payment settlement failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for payment status check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const requestId = searchParams.get('requestId');

    if (!paymentId && !requestId) {
      return NextResponse.json({
        success: false,
        error: 'paymentId or requestId is required'
      }, { status: 400 });
    }

    // Check if we have a record of this payment
    // In production, you'd check a database
    // For now, return a simple response

    return NextResponse.json({
      success: true,
      data: {
        paymentId,
        requestId,
        status: 'unknown', // Would be 'settled', 'pending', etc.
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('GET /api/x402/settle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check payment status'
    }, { status: 500 });
  }
}