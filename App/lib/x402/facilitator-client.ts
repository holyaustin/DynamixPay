// lib/x402/facilitator-client.ts 
import { Facilitator } from '@crypto.com/facilitator-client';
import { CronosNetwork, Contract } from '@crypto.com/facilitator-client';

export class X402Facilitator {
  private facilitator: Facilitator;
  
  constructor(network: CronosNetwork = CronosNetwork.CronosTestnet) {
    this.facilitator = new Facilitator({ network });
  }
  
  async generatePaymentHeader(params: {
    to: string;
    value: string;
    asset: Contract;
    signer: any;
    validBefore: number;
    validAfter?: number;
  }) {
    return this.facilitator.generatePaymentHeader({
      to: params.to,
      value: params.value,
      asset: params.asset,
      signer: params.signer,
      validBefore: params.validBefore,
      validAfter: params.validAfter || 0,
    });
  }
  
  async verifyPayment(params: {
    x402Version: number;
    paymentHeader: string;
    paymentRequirements: any;
  }) {
    return this.facilitator.verifyPayment({
      x402Version: params.x402Version,
      paymentHeader: params.paymentHeader,
      paymentRequirements: params.paymentRequirements,
    });
  }
  
  async settlePayment(params: {
    x402Version: number;
    paymentHeader: string;
    paymentRequirements: any;
  }) {
    return this.facilitator.settlePayment({
      x402Version: params.x402Version,
      paymentHeader: params.paymentHeader,
      paymentRequirements: params.paymentRequirements,
    });
  }
}

// Factory function to create facilitator based on environment
export function getX402Facilitator(): X402Facilitator {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.NEXT_PUBLIC_APP_ENV === 'development';
  
  const network = isDevelopment ? 
    CronosNetwork.CronosTestnet : 
    CronosNetwork.CronosMainnet;
  
  console.log(`Initializing X402 Facilitator for ${isDevelopment ? 'Testnet' : 'Mainnet'}`);
  return new X402Facilitator(network);
}

// Singleton instance (defaults to mainnet)
export const x402Facilitator = getX402Facilitator();
