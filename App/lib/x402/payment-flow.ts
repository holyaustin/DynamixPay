// /App/lib/x402/payment-flow.ts
import { ethers } from 'ethers';
import { x402Facilitator } from './facilitator-client';
import { CronosNetwork, Contract } from '@crypto.com/facilitator-client';

export interface PaymentChallenge {
  x402Version: number;
  error?: string;
  accepts: Array<{
    scheme: 'exact';
    network: CronosNetwork;
    asset: Contract;
    payTo: `0x${string}`;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    maxTimeoutSeconds: number;
    outputSchema?: any;
    extra?: {
      paymentId: string;
      requestId?: string;
      contractAddress?: string;
      paymentType?: string;
      timestamp?: string;
    };
  }>;
}

export interface PaymentRequirements {
  scheme: 'exact';
  network: CronosNetwork;
  asset: Contract;
  payTo: `0x${string}`;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  outputSchema?: any;
  extra?: Record<string, any>;
}

export class X402PaymentFlow {
  static async processPaymentChallenge(
    challenge: PaymentChallenge,
    signer: ethers.Signer
  ): Promise<{ paymentId: string; txHash?: string; error?: string }> {
    try {
      const accepts0 = challenge.accepts[0];
      if (!accepts0) {
        throw new Error('Invalid challenge: accepts[0] missing');
      }

      const paymentId = accepts0.extra?.paymentId;
      if (!paymentId) {
        throw new Error('Invalid challenge: paymentId missing');
      }

      // Ensure correct Cronos network
      await this.ensureCronosNetwork(accepts0.network);

      // Generate payment header
      const paymentHeader = await x402Facilitator.generatePaymentHeader({
        to: accepts0.payTo,
        value: accepts0.maxAmountRequired,
        asset: accepts0.asset,
        signer,
        validBefore: Math.floor(Date.now() / 1000) + accepts0.maxTimeoutSeconds,
      });

      // Verify payment
      const verifyResult = await x402Facilitator.verifyPayment({
        x402Version: challenge.x402Version,
        paymentHeader,
        paymentRequirements: accepts0,
      });

      if (!verifyResult.isValid) {
        return {
          paymentId,
          error: 'Payment verification failed',
        };
      }

      // Settle payment
      const settleResult = await x402Facilitator.settlePayment({
        x402Version: challenge.x402Version,
        paymentHeader,
        paymentRequirements: accepts0,
      });

      if (settleResult.event !== 'payment.settled') {
        return {
          paymentId,
          error: 'Payment settlement failed',
        };
      }

      return {
        paymentId,
        txHash: settleResult.txHash,
      };

    } catch (error: any) {
      console.error('Payment flow error:', error);
      return {
        paymentId: '',
        error: error.message || 'Payment processing failed',
      };
    }
  }

  private static async ensureCronosNetwork(network: CronosNetwork): Promise<void> {
    const chainIdHex = network === 'cronos-mainnet' ? '0x19' : '0x152';
    
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      if (error?.code === 4902 && network === 'cronos-testnet') {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x152',
              chainName: 'Cronos Testnet',
              nativeCurrency: { 
                name: 'tCRO', 
                symbol: 'tCRO', 
                decimals: 18 
              },
              rpcUrls: ['https://evm-t3.cronos.org'],
              blockExplorerUrls: ['https://cronos.org/explorer/testnet3'],
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }

  static generatePaymentId(payee: string, requestId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const payeeShort = payee.substring(2, 10);
    return `pay_${timestamp}_${payeeShort}_${random}_${requestId || ''}`;
  }
}