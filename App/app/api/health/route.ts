// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC)
})

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const healthChecks: any = {}

    // 1. Check blockchain connection
    try {
      const blockNumber = await publicClient.getBlockNumber()
      healthChecks.blockchain = {
        status: 'healthy',
        chainId: cronosTestnet.id,
        network: cronosTestnet.name,
        latestBlock: blockNumber.toString(),
        rpcUrl: process.env.NEXT_PUBLIC_CRONOS_RPC
      }
    } catch (error) {
      healthChecks.blockchain = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 2. Check contract accessibility
    try {
      // Try to read from Treasury contract
      const TREASURY_ABI = [
        {
          name: 'getTreasuryBalance',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: 'balance', type: 'uint256' }]
        }
      ] as const

      const balance = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getTreasuryBalance'
      })

      healthChecks.contracts = {
        status: 'healthy',
        treasuryManager: {
          address: CONTRACTS.TREASURY_MANAGER,
          accessible: true,
          balance: balance.toString()
        },
        usdc: {
          address: CONTRACTS.USDC,
          accessible: true
        }
      }
    } catch (error) {
      healthChecks.contracts = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 3. Check x402 facilitator
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_X402_FACILITATOR_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      healthChecks.x402Facilitator = {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: process.env.NEXT_PUBLIC_X402_FACILITATOR_URL,
        responseStatus: response.status
      }
    } catch (error) {
      healthChecks.x402Facilitator = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 4. Environment checks
    healthChecks.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasAdminKey: !!process.env.TREASURY_ADMIN_PRIVATE_KEY,
      hasWebhookSecret: !!process.env.X402_WEBHOOK_SECRET,
      hasPrivyAppId: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID
    }

    // 5. API status
    const responseTime = Date.now() - startTime
    healthChecks.api = {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }

    // Determine overall status
    const allHealthy = [
      healthChecks.blockchain?.status,
      healthChecks.contracts?.status,
      healthChecks.x402Facilitator?.status
    ].every(status => status === 'healthy')

    return NextResponse.json({
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      ...healthChecks
    })

  } catch (error: any) {
    console.error('GET /api/health error:', error)
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}