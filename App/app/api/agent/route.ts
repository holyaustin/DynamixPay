// app/api/agent/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { x402Agent } from '@/lib/agent/x402-agent'

export async function GET(request: NextRequest) {
  try {
    const status = x402Agent.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        agent: 'x402-payroll-agent',
        status,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get agent status',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'start':
        await x402Agent.start()
        break
      case 'stop':
        x402Agent.stop()
        break
      case 'trigger':
        await x402Agent.triggerPayroll()
        break
      default:
        throw new Error('Invalid action')
    }
    
    return NextResponse.json({
      success: true,
      message: `Agent ${action} executed`,
      status: x402Agent.getStatus()
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to execute agent action',
      details: error.message
    }, { status: 500 })
  }
}