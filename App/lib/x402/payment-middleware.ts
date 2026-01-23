// /App/lib/x402/payment-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentStore } from './payment-store';

export function requireX402Payment(options: {
  payee: string;
  amount: string;
  description: string;
}) {
  return (request: NextRequest) => {
    // Check for existing paymentId in header
    const paymentId = request.headers.get('x-payment-id');
    
    if (paymentId && paymentStore.isPaid(paymentId)) {
      // Already paid, allow access
      return null; // No response means continue
    }
    
    // Check if same payee+amount already paid
    const existingPayment = paymentStore.findExistingPayment(
      options.payee,
      options.amount
    );
    
    if (existingPayment) {
      // Return the existing paymentId for reuse
      return NextResponse.json({
        alreadyPaid: true,
        paymentId: existingPayment.paymentId,
        txHash: existingPayment.txHash
      });
    }
    
    // Otherwise return 402 challenge
    const challengeUrl = `/api/x402/challenge?payee=${options.payee}&amount=${options.amount}&description=${options.description}`;
    
    return NextResponse.redirect(challengeUrl, { status: 402 });
  };
}