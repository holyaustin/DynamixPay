// /App/lib/x402/payment-hook.ts - COMPLETE FIXED VERSION
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { X402PaymentFlow, PaymentChallenge as FlowPaymentChallenge } from './payment-flow';
import { CronosNetwork, Contract } from '@crypto.com/facilitator-client';
import toast from 'react-hot-toast';

export interface UseX402PaymentOptions {
  onSuccess?: (result: { paymentId: string; txHash?: string }) => void;
  onError?: (error: string) => void;
}

// Use the EXACT interface from payment-flow.ts to avoid type mismatches
export type PaymentChallenge = FlowPaymentChallenge;

export interface PaymentResult {
  success: boolean;
  paymentId: string; // Make this REQUIRED, not optional
  txHash?: string;
  error?: string;
  data?: any;
  message?: string;
  [key: string]: any;
}

export function useX402Payment(options: UseX402PaymentOptions = {}) {
  const [processing, setProcessing] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');

  const processPayment = useCallback(async (
    challenge: PaymentChallenge,
    signer: ethers.Signer
  ): Promise<PaymentResult> => {
    setProcessing(true);
    
    try {
      console.log('Processing x402 payment challenge:', {
        challenge,
        signerAddress: await signer.getAddress()
      });
      
      const toastId = toast.loading('Processing x402 payment...');
      
      const result = await X402PaymentFlow.processPaymentChallenge(challenge, signer);
      
      if (result.error) {
        toast.error(`Payment failed: ${result.error}`, { id: toastId });
        options.onError?.(result.error);
        return { 
          success: false, 
          paymentId: result.paymentId || '', // Provide default empty string
          error: result.error
        };
      }
      
      toast.success('Payment settled successfully!', { id: toastId });
      setCurrentPaymentId(result.paymentId);
      
      const successResult: PaymentResult = { 
        success: true, 
        paymentId: result.paymentId, // This is guaranteed to exist when no error
        txHash: result.txHash,
        message: 'Payment settled successfully'
      };
      
      options.onSuccess?.(successResult);
      return successResult;
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      const errorMessage = error.message || 'Unknown payment error';
      toast.error(`Payment error: ${errorMessage}`);
      options.onError?.(errorMessage);
      return { 
        success: false, 
        paymentId: '', // Provide default empty string
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setProcessing(false);
    }
  }, [options]);

  const fetchAndProcessPayment = useCallback(async (
    challengeUrl: string,
    signer: ethers.Signer
  ): Promise<PaymentResult> => {
    setProcessing(true);
    
    try {
      console.log('Fetching payment challenge from:', challengeUrl);
      
      // Fetch challenge from API
      const response = await fetch(challengeUrl);
      
      // FIXED: 402 status is NORMAL for x402 payments - it means payment is required
      if (response.status === 402) {
        const challengeData = await response.json();
        
        // Type assertion to ensure it matches the EXACT PaymentChallenge interface
        const challenge: PaymentChallenge = {
          x402Version: challengeData.x402Version || 1,
          error: challengeData.error,
          accepts: challengeData.accepts.map((accept: any) => ({
            scheme: accept.scheme || 'exact', // Ensure 'exact' literal type
            network: accept.network as CronosNetwork,
            asset: accept.asset as Contract,
            payTo: accept.payTo as `0x${string}`,
            maxAmountRequired: accept.maxAmountRequired,
            resource: accept.resource,
            description: accept.description,
            mimeType: accept.mimeType,
            maxTimeoutSeconds: accept.maxTimeoutSeconds,
            outputSchema: accept.outputSchema,
            extra: accept.extra || {}
          }))
        };
        
        
        console.log('Received x402 payment challenge (402 status):', {
          accepts: challenge.accepts,
          extra: challenge.accepts[0]?.extra
        });
        
        // Process the payment challenge
        return await processPayment(challenge, signer);
        
      } else if (response.ok) {
        // Already paid or no payment required
        const data = await response.json();
        console.log('Payment already settled or not required:', data);
        
        return { 
          success: true, 
          data,
          paymentId: data.paymentId || 'no-payment-required',
          message: data.message || 'Payment already settled'
        };
        
      } else {
        // Actual error (not 402)
        const errorText = await response.text();
        let errorMessage = `Failed to fetch challenge: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If not JSON, use the text
          if (errorText) errorMessage = errorText;
        }
        
        console.error('API error:', { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      
    } catch (error: any) {
      console.error('Fetch and process error:', error);
      const errorMessage = error.message || 'Failed to process payment';
      toast.error(errorMessage);
      options.onError?.(errorMessage);
      return { 
        success: false, 
        paymentId: '',
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setProcessing(false);
    }
  }, [processPayment, options]);

  return {
    processing,
    currentPaymentId,
    processPayment,
    fetchAndProcessPayment,
  };
}