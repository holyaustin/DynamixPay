// app/api/contracts/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC)
})

// Define event signatures from your contract
const EVENT_SIGNATURES = {
  PayrollTriggered: '0x...', // Replace with actual event signature
  PaymentRequestCreated: '0x...',
  PaymentSettled: '0x...',
  PayeeAdded: '0x...',
  PayeeUpdated: '0x...',
  PayeeDeactivated: '0x...',
  RevenueThresholdUpdated: '0x...'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('event')
    const fromBlock = searchParams.get('fromBlock')
    const toBlock = searchParams.get('toBlock')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build filter
    const filter: any = {
      address: CONTRACTS.TREASURY_MANAGER
    }

    if (eventType && EVENT_SIGNATURES[eventType as keyof typeof EVENT_SIGNATURES]) {
      filter.topics = [EVENT_SIGNATURES[eventType as keyof typeof EVENT_SIGNATURES]]
    }

    if (fromBlock) {
      filter.fromBlock = BigInt(fromBlock)
    }

    if (toBlock) {
      filter.toBlock = BigInt(toBlock)
    } else {
      filter.toBlock = 'latest'
    }

    // Get events
    const logs = await publicClient.getLogs(filter)

    // Format events
    const events = logs.slice(0, limit).map((log, index) => {
      let eventName = 'Unknown'
      
      // Identify event by signature
      for (const [name, signature] of Object.entries(EVENT_SIGNATURES)) {
        if (log.topics[0] === signature) {
          eventName = name
          break
        }
      }

      return {
        event: eventName,
        logIndex: log.logIndex?.toString(),
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString(),
        blockHash: log.blockHash,
        topics: log.topics,
        data: log.data,
        decoded: tryDecodeEvent(log, eventName),
        timestamp: new Date().toISOString() // Note: Would need block timestamp in production
      }
    })

    // Get latest block for context
    const latestBlock = await publicClient.getBlockNumber()

    return NextResponse.json({
      success: true,
      data: {
        events,
        metadata: {
          contract: CONTRACTS.TREASURY_MANAGER,
          latestBlock: latestBlock.toString(),
          fromBlock: fromBlock || 'earliest',
          toBlock: toBlock || latestBlock.toString(),
          totalEvents: logs.length,
          returnedEvents: events.length
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('GET /api/contracts/events error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contract events',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to try decoding event data
function tryDecodeEvent(log: any, eventName: string) {
  try {
    // This is simplified - in production, you would properly decode based on ABI
    switch (eventName) {
      case 'PayrollTriggered':
        return {
          timestamp: parseInt(log.data.slice(0, 66), 16) * 1000,
          totalAmount: BigInt('0x' + log.data.slice(66, 130)).toString(),
          payeeCount: parseInt(log.data.slice(130, 194), 16)
        }
      // Add other event decodings...
      default:
        return { rawData: log.data }
    }
  } catch {
    return { rawData: log.data }
  }
}