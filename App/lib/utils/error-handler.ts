// lib/utils/error-handler.ts
import { ethers } from 'ethers'

// Custom error types for better type safety
export interface NetworkError extends Error {
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR'
}

export interface ContractError extends Error {
  code: 'CALL_EXCEPTION' | 'INSUFFICIENT_FUNDS' | 'REVERTED'
  data?: string
}

export interface WalletError extends Error {
  code: number | string
}

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number // ms
  maxDelay?: number // ms
  shouldRetry?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export class EnhancedErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = () => true,
      onRetry = () => {}
    } = options
    
    let lastError: any
    let attempt = 1
    
    while (attempt <= maxAttempts) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Check if we should retry
        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw error
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1),
          maxDelay
        )
        
        onRetry(attempt, error)
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        attempt++
      }
    }
    
    throw lastError
  }
  
  static isNetworkError(error: any): error is NetworkError {
    if (!error || typeof error !== 'object') return false
    
    const errorCode = (error as any).code
    const errorMessage = (error as any).message || ''
    
    return errorCode === 'NETWORK_ERROR' ||
           errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('connection')
  }
  
  static isContractError(error: any): error is ContractError {
    if (!error || typeof error !== 'object') return false
    
    const errorCode = (error as any).code
    const errorMessage = (error as any).message || ''
    const errorData = (error as any).data
    
    return errorCode === 'CALL_EXCEPTION' ||
           (errorData && errorData.length > 0) ||
           errorMessage.includes('revert') ||
           errorMessage.includes('insufficient')
  }
  
  static isWalletError(error: any): error is WalletError {
    if (!error || typeof error !== 'object') return false
    
    const errorCode = (error as any).code
    const errorMessage = (error as any).message || ''
    
    return errorCode === 4001 || 
           errorMessage.includes('rejected') ||
           errorMessage.includes('wallet') ||
           errorMessage.includes('user denied')
  }
  
  static getUserFriendlyMessage(error: any): string {
    if (!error) return 'An unknown error occurred'
    
    // Handle string errors
    if (typeof error === 'string') {
      return error
    }
    
    // Handle Error objects
    if (this.isNetworkError(error)) {
      return 'Network error. Please check your connection and try again.'
    }
    
    if (this.isContractError(error)) {
      const errorMessage = error.message || ''
      if (errorMessage.includes('insufficient funds')) {
        return 'Insufficient funds for this transaction.'
      }
      if (errorMessage.includes('revert')) {
        const reason = this.extractRevertReason(error)
        return reason || 'Transaction failed. The contract rejected it.'
      }
      return 'Smart contract error. Please check the details and try again.'
    }
    
    if (this.isWalletError(error)) {
      const errorCode = (error as any).code
      if (errorCode === 4001 || error.message?.includes('rejected')) {
        return 'Transaction was rejected by your wallet.'
      }
      return 'Wallet error. Please check your wallet connection.'
    }
    
    // Default
    const errorMessage = error.message
    return errorMessage || 'An unexpected error occurred'
  }
  
  private static extractRevertReason(error: ContractError): string | null {
    try {
      // Try to extract revert reason from error data
      if (error.data && typeof error.data === 'string') {
        const data = error.data
        if (data.startsWith('0x08c379a0')) { // Error(string) selector
          const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + data.slice(10))
          return reason[0]
        }
      }
      
      // Try to extract from error message
      if (error.message && typeof error.message === 'string') {
        const match = error.message.match(/reason="([^"]+)"/)
        if (match) return match[1]
      }
      
      return null
    } catch {
      return null
    }
  }
  
  // Helper to create typed errors
  static createNetworkError(message: string, code?: string): NetworkError {
    const error = new Error(message) as NetworkError
    error.code = code as any || 'NETWORK_ERROR'
    return error
  }
  
  static createContractError(message: string, code?: string, data?: string): ContractError {
    const error = new Error(message) as ContractError
    error.code = code as any || 'CALL_EXCEPTION'
    if (data) error.data = data
    return error
  }
}

// Global error handler middleware
export const withGlobalErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string = 'unknown'
): ((...args: T) => Promise<R>) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error: any) {
      // Log error with context
      console.error(`Error in ${context}:`, error)
      
      // Track error metrics (in production, send to monitoring service)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `Error in ${context}: ${error?.message || 'Unknown error'}`,
          fatal: false
        })
      }
      
      // Re-throw with enhanced message
      const enhancedError = new Error(
        `${context} failed: ${EnhancedErrorHandler.getUserFriendlyMessage(error)}`
      )
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }
}

// Type-safe error type guards
export function isErrorWithMessage(error: any): error is { message: string } {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
}

export function isErrorWithCode(error: any): error is { code: string | number } {
  return error && typeof error === 'object' && 'code' in error
}

// Type guard for specific error codes
export function hasErrorCode<T extends string | number>(error: any, code: T): error is { code: T } {
  return isErrorWithCode(error) && error.code === code
}

// Utility function to safely access error properties
export function getErrorCode(error: any): string | number | undefined {
  if (isErrorWithCode(error)) {
    return error.code
  }
  return undefined
}

export function getErrorMessage(error: any): string {
  if (isErrorWithMessage(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}