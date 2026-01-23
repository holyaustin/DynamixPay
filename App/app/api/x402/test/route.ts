// /App/app/api/x402/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireX402Payment } from '@/lib/x402/payment-middleware';

// This endpoint requires payment to access
export async function GET(request: NextRequest) {
  const middleware = requireX402Payment({
    payee: '0x742d35Cc6634C0532925a3b844Bc9e1007E1d8b1', // Test payee
    amount: '1000000', // 1 USDC
    description: 'Test protected resource'
  });
  
  const response = middleware(request);
  if (response) {
    return response; // Returns 402 or alreadyPaid
  }
  
  // If we get here, payment is verified
  return NextResponse.json({
    secret: 'This is protected content!',
    message: 'Payment verified successfully'
  });
}