// Simple in-memory store (for development)

interface PaidRecord {
  paymentId: string;
  payee: string;
  amount: string;
  txHash: string;
  settledAt: Date;
  requestId?: string;
}

class PaymentStore {
  private paid = new Map<string, PaidRecord>();
  
  addPayment(record: PaidRecord) {
    this.paid.set(record.paymentId, record);
  }
  
  getPayment(paymentId: string): PaidRecord | undefined {
    return this.paid.get(paymentId);
  }
  
  isPaid(paymentId: string): boolean {
    return this.paid.has(paymentId);
  }
  
  // For paymentId reuse: check if same payee+amount already paid
  findExistingPayment(payee: string, amount: string): PaidRecord | undefined {
    return Array.from(this.paid.values()).find(
      record => record.payee === payee && record.amount === amount
    );
  }
}

export const paymentStore = new PaymentStore();