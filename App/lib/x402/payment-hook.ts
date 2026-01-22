// /App/lib/x402/payment-hook.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { X402PaymentFlow, PaymentChallenge } from './payment-flow';
import toast from 'react-hot-toast';

export interface UseX402PaymentOptions {
  onSuccess?: (result: { paymentId: string; txHash?: string }) => void;
  onError?: (error: string) => void;
}

export function useX402Payment(options: UseX402PaymentOptions = {}) {
  const [processing, setProcessing] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');

  const processPayment = useCallback(async (
    challenge: PaymentChallenge,
    signer: ethers.Signer
  ) => {
    setProcessing(true);
    
    try {
      const toastId = toast.loading('Processing x402 payment...');
      
      const result = await X402PaymentFlow.processPaymentChallenge(challenge, signer);
      
      if (result.error) {
        toast.error(`Payment failed: ${result.error}`, { id: toastId });
        options.onError?.(result.error);
        return { success: false, error: result.error };
      }
      
      toast.success('Payment settled successfully!', { id: toastId });
      setCurrentPaymentId(result.paymentId);
      options.onSuccess?.(result);
      
      return { 
        success: true, 
        paymentId: result.paymentId, 
        txHash: result.txHash 
      };
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(`Payment error: ${error.message}`);
      options.onError?.(error.message);
      return { success: false, error: error.message };
    } finally {
      setProcessing(false);
    }
  }, [options]);

  const fetchAndProcessPayment = useCallback(async (
    challengeUrl: string,
    signer: ethers.Signer
  ) => {
    try {
      // Fetch challenge from API
      const response = await fetch(challengeUrl);
      
      if (response.status === 402) {
        const challenge: PaymentChallenge = await response.json();
        return await processPayment(challenge, signer);
      } else if (response.ok) {
        // Already paid or no payment required
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`Failed to fetch challenge: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Fetch and process error:', error);
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  }, [processPayment]);

  return {
    processing,
    currentPaymentId,
    processPayment,
    fetchAndProcessPayment,
  };
}