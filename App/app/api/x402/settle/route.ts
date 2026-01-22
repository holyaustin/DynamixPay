// /App/app/api/x402/settle/route.ts - REWRITTEN with proper flow
import { NextRequest, NextResponse } from 'next/server';
import { X402PaymentFlow, PaymentChallenge } from '@/lib/x402/payment-flow';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from '@/config/chains';
import { CONTRACTS } from '@/config/contracts';
import { ethers } from 'ethers';

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
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentHeader, paymentRequirements, userAddress } = body;

    if (!paymentHeader || !paymentRequirements || !userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: paymentHeader, paymentRequirements, userAddress'
      }, { status: 400 });
    }

    // Extract requestId from payment requirements
    const requestId = paymentRequirements.extra?.requestId;
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'Payment request ID not found in requirements'
      }, { status: 400 });
    }

    // Create challenge object for processing
    const challenge: PaymentChallenge = {
      x402Version: 1,
      error: 'payment_required',
      accepts: [paymentRequirements]
    };

    // Get signer from user address
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    // Process payment using the flow
    const result = await X402PaymentFlow.processPaymentChallenge(challenge, signer);

    if (result.error || !result.txHash) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Payment processing failed',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Now mark the payment as settled in our Treasury contract
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured');
    }

    const adminAccount = privateKeyToAccount(
      process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`
    );
    
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    });

    // Convert txHash string to bytes32
    const txHash = result.txHash;
    const txHashBytes32 = txHash.startsWith('0x') 
      ? txHash as `0x${string}` 
      : `0x${txHash}` as `0x${string}`;
    
    // Get x402PaymentId
    const x402PaymentId = paymentRequirements.extra?.paymentId || '';
    
    // Convert x402PaymentId to bytes32
    let paymentIdBytes32: `0x${string}`;
    if (x402PaymentId.startsWith('0x')) {
      paymentIdBytes32 = x402PaymentId as `0x${string}`;
    } else if (x402PaymentId) {
      const hexId = Buffer.from(x402PaymentId).toString('hex');
      paymentIdBytes32 = `0x${hexId.padStart(64, '0').slice(0, 64)}` as `0x${string}`;
    } else {
      paymentIdBytes32 = '0x' as `0x${string}`;
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
    });

    return NextResponse.json({
      success: true,
      data: {
        x402Settlement: {
          txHash: result.txHash,
          paymentId: result.paymentId,
          settledAt: new Date().toISOString()
        },
        contractUpdate: {
          transactionHash: markSettledHash,
          requestId,
          markedSettled: true
        },
        timestamp: new Date().toISOString()
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