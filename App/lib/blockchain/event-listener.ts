// lib/blockchain/event-listener.ts

import { ethers } from 'ethers'
import { getTreasuryContract } from './ethers-utils'

export interface EventListenerOptions {
  pollingInterval?: number // ms
  maxRetries?: number
  onError?: (error: Error) => void
}

export class TreasuryEventListener {
  private provider: ethers.JsonRpcProvider
  private contract: ethers.Contract
  private isListening: boolean = false
  private pollingIntervalId: NodeJS.Timeout | null = null
  private lastBlockNumber: number = 0
  private subscribers: Map<string, Function[]> = new Map()
  private retryCount: number = 0
  private maxRetries: number
  private pollingIntervalMs: number
  private onError?: (error: Error) => void

  constructor(options: EventListenerOptions = {}) {
    this.provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
    this.contract = getTreasuryContract()
    
    this.pollingIntervalMs = options.pollingInterval || 10000
    this.maxRetries = options.maxRetries || 3
    this.onError = options.onError
  }

  async start(): Promise<void> {
    if (this.isListening) return
    
    this.isListening = true
    this.lastBlockNumber = await this.provider.getBlockNumber()
    
    console.log('🎯 Starting event listener from block:', this.lastBlockNumber)
    
    // Start polling
    this.pollForEvents()
  }

  stop(): void {
    this.isListening = false
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId)
      this.pollingIntervalId = null
    }
    console.log('🛑 Event listener stopped')
  }

  private async pollForEvents(): Promise<void> {
    if (!this.isListening) return
    
    try {
      const currentBlock = await this.provider.getBlockNumber()
      
      if (currentBlock > this.lastBlockNumber) {
        await this.fetchEvents(this.lastBlockNumber + 1, currentBlock)
        this.lastBlockNumber = currentBlock
      }
      
      this.retryCount = 0 // Reset retry count on success
    } catch (error) {
      console.error('Error polling for events:', error)
      
      if (this.onError && error instanceof Error) {
        this.onError(error)
      }
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        setTimeout(() => this.pollForEvents(), 5000)
        this.retryCount++
      } else {
        console.error('Max retries reached, stopping event listener')
        this.stop()
      }
    }
    
    // Schedule next poll
    if (this.isListening) {
      this.pollingIntervalId = setTimeout(() => this.pollForEvents(), this.pollingIntervalMs)
    }
  }

  private async fetchEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const contractAddress = await this.contract.getAddress()
      const filter = {
        address: contractAddress,
        fromBlock,
        toBlock
      }
      
      const logs = await this.provider.getLogs(filter)
      
      for (const log of logs) {
        await this.processLog(log)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  private async processLog(log: ethers.Log): Promise<void> {
    try {
      const parsedLog = this.contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      })
      
      // FIXED: Add null check for parsedLog
      if (!parsedLog) {
        console.warn('Failed to parse log: parsedLog is null')
        return
      }
      
      // Get block for timestamp
      const block = await this.provider.getBlock(log.blockNumber)
      const timestamp = new Date(Number(block?.timestamp || 0) * 1000)
      
      const eventData = {
        event: parsedLog.name,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        args: parsedLog.args,
        timestamp
      }
      
      // Notify subscribers
      this.notifySubscribers(parsedLog.name, eventData)
      
      // Also notify all subscribers
      this.notifySubscribers('*', eventData)
      
      console.log(`📢 Event received: ${parsedLog.name}`, eventData)
    } catch (error) {
      console.warn('Failed to parse log:', error)
    }
  }

  // Subscription methods
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, [])
    }
    
    const subscribers = this.subscribers.get(event)!
    subscribers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = subscribers.indexOf(callback)
      if (index > -1) {
        subscribers.splice(index, 1)
      }
    }
  }

  private notifySubscribers(event: string, data: any): void {
    const subscribers = this.subscribers.get(event) || []
    subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in event subscriber:', error)
      }
    })
  }

  get isActive(): boolean {
    return this.isListening
  }

  get lastPolledBlock(): number {
    return this.lastBlockNumber
  }
}

// Singleton instance
export const treasuryEventListener = new TreasuryEventListener({
  pollingInterval: 10000, // 10 seconds
  maxRetries: 5,
  onError: (error) => console.error('Event listener error:', error)
})