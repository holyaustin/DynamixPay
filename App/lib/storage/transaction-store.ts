// lib/storage/transaction-store.ts
export interface Transaction {
  id: string
  hash: string
  type: 'add_payee' | 'create_payments' | 'fund_treasury' | 'update_threshold' | 'update_salary' | 'deactivate_payee'
  status: 'pending' | 'confirmed' | 'failed' | 'replaced'
  from: string
  to: string
  value?: string
  data?: any
  timestamp: Date
  confirmedAt?: Date
  blockNumber?: number
  gasUsed?: string
  error?: string
  retryCount?: number
}

export interface TransactionStoreOptions {
  maxRetries?: number
  retryDelay?: number // ms
  persistToLocalStorage?: boolean
}

export class TransactionStore {
  private transactions: Map<string, Transaction> = new Map()
  private maxRetries: number = 3
  private retryDelay: number = 5000 // 5 seconds
  private listeners: Function[] = []
  
  constructor(options: TransactionStoreOptions = {}) {
    this.maxRetries = options.maxRetries || 3
    this.retryDelay = options.retryDelay || 5000
    
    if (options.persistToLocalStorage && typeof window !== 'undefined') {
      this.loadFromLocalStorage()
      
      // Auto-save to localStorage
      window.addEventListener('beforeunload', () => this.saveToLocalStorage())
    }
  }
  
  // FIXED: Remove timestamp from the required fields since we add it automatically
  addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const transaction: Transaction = {
      ...tx,
      id,
      timestamp: new Date(), // Automatically add timestamp
      retryCount: 0
    }
    
    this.transactions.set(id, transaction)
    this.notifyListeners()
    this.saveToLocalStorage()
    
    return id
  }
  
  updateTransaction(id: string, updates: Partial<Transaction>): boolean {
    const transaction = this.transactions.get(id)
    if (!transaction) return false
    
    this.transactions.set(id, { ...transaction, ...updates })
    this.notifyListeners()
    this.saveToLocalStorage()
    
    return true
  }
  
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id)
  }
  
  getTransactionsByType(type: Transaction['type']): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  getPendingTransactions(): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === 'pending')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }
  
  // NEW: Get all transactions
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  async retryFailedTransactions(): Promise<void> {
    const failedTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'failed' && (tx.retryCount || 0) < this.maxRetries)
    
    for (const tx of failedTransactions) {
      await this.retryTransaction(tx.id)
    }
  }
  
  private async retryTransaction(id: string): Promise<void> {
    const transaction = this.transactions.get(id)
    if (!transaction) return
    
    console.log(`🔄 Retrying transaction ${id} (attempt ${(transaction.retryCount || 0) + 1})`)
    
    // Update retry count
    this.updateTransaction(id, {
      retryCount: (transaction.retryCount || 0) + 1,
      status: 'pending',
      error: undefined
    })
    
    // In a real implementation, you would:
    // 1. Recreate the transaction
    // 2. Send it again
    // 3. Update status based on result
    
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, this.retryDelay))
    
    // For now, mark as confirmed (in real app, update based on actual result)
    this.updateTransaction(id, { status: 'confirmed' })
  }
  
  // Listener pattern for UI updates
  subscribe(listener: Function): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getAllTransactions())
      } catch (error) {
        console.error('Error in transaction store listener:', error)
      }
    })
  }
  
  // Local storage persistence
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return
    
    const serialized = Array.from(this.transactions.values()).map(tx => ({
      ...tx,
      timestamp: tx.timestamp.toISOString(),
      confirmedAt: tx.confirmedAt?.toISOString()
    }))
    
    localStorage.setItem('treasury_transactions', JSON.stringify(serialized))
  }
  
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return
    
    const stored = localStorage.getItem('treasury_transactions')
    if (!stored) return
    
    try {
      const parsed = JSON.parse(stored)
      parsed.forEach((tx: any) => {
        const transaction: Transaction = {
          ...tx,
          timestamp: new Date(tx.timestamp),
          confirmedAt: tx.confirmedAt ? new Date(tx.confirmedAt) : undefined
        }
        this.transactions.set(tx.id, transaction)
      })
    } catch (error) {
      console.error('Failed to load transactions from localStorage:', error)
    }
  }
  
  clear(): void {
    this.transactions.clear()
    this.notifyListeners()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('treasury_transactions')
    }
  }
  
  get count(): number {
    return this.transactions.size
  }
}

// Singleton instance
export const transactionStore = new TransactionStore({
  maxRetries: 3,
  retryDelay: 5000,
  persistToLocalStorage: true
})