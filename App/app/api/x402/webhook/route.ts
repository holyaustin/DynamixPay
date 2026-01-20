// app/api/x402/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

// Simple in-memory store for webhook events
// In production, use a database
const webhookEvents: any[] = []

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.X402_WEBHOOK_SECRET

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC)
})

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-signature')
    const timestamp = request.headers.get('x-timestamp')
    
    if (WEBHOOK_SECRET) {
      // In production, verify signature here
      // const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
      //   .update(timestamp + JSON.stringify(body))
      //   .digest('hex')
      // if (signature !== expectedSignature) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      // }
    }

    const body = await request.json()
    
    // Store event
    const event = {
      ...body,
      receivedAt: new Date().toISOString(),
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }
    
    webhookEvents.unshift(event) // Add to beginning
    if (webhookEvents.length > 1000) {
      webhookEvents.pop() // Remove oldest if too many
    }

    // Process event based on type
    await processWebhookEvent(event)

    return NextResponse.json({
      success: true,
      message: 'Webhook received and processed',
      eventId: event.id
    })

  } catch (error: any) {
    console.error('POST /api/x402/webhook error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET: Retrieve recent webhook events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const eventType = searchParams.get('eventType')

    let events = webhookEvents
    
    if (eventType) {
      events = events.filter(event => event.event === eventType)
    }

    return NextResponse.json({
      success: true,
      data: {
        events: events.slice(0, limit),
        total: events.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('GET /api/x402/webhook error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch webhook events',
      details: error.message
    }, { status: 500 })
  }
}

// Helper function to process different webhook events
async function processWebhookEvent(event: any) {
  try {
    switch (event.event) {
      case 'payment.settled':
        console.log('Payment settled event:', event)
        // Here you could:
        // 1. Update your database
        // 2. Send notifications
        // 3. Trigger other business logic
        break

      case 'payment.failed':
        console.log('Payment failed event:', event)
        // Handle failed payments
        break

      case 'payment.pending':
        console.log('Payment pending event:', event)
        // Handle pending payments
        break

      case 'payment.expired':
        console.log('Payment expired event:', event)
        // Handle expired payments
        break

      default:
        console.log('Unknown webhook event:', event.event)
    }
  } catch (error) {
    console.error('Error processing webhook event:', error)
  }
}