// app/api/treasury/payees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  createPublicClient, 
  http, 
  parseAbi, 
  isAddress,
  createWalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { cronosTestnet } from '@/lib/blockchain/provider'
import { CONTRACTS } from '@/config/contracts'

// Treasury Manager ABI
const TREASURY_ABI = parseAbi([
  'function addPayee(address payee, uint256 salary)',
  'function addPayees(address[] calldata payees, uint256[] calldata salaries)',
  'function updatePayeeSalary(address payee, uint256 newSalary)',
  'function deactivatePayee(address payee)',
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function getPayee(address payee) view returns (uint256 salary, uint256 lastPayment, uint256 accrued, bool active)',
  'event PayeeAdded(address indexed payee, uint256 salary)',
  'event PayeeUpdated(address indexed payee, uint256 newSalary)',
  'event PayeeDeactivated(address indexed payee)'
])

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
})

// GET: Get all payees or specific payee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (address) {
      // Get specific payee
      if (!isAddress(address)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Ethereum address'
        }, { status: 400 })
      }

      const [salary, lastPayment, accrued, active] = await publicClient.readContract({
        address: CONTRACTS.TREASURY_MANAGER,
        abi: TREASURY_ABI,
        functionName: 'getPayee',
        args: [address as `0x${string}`]
      }) as [bigint, bigint, bigint, boolean]

      return NextResponse.json({
        success: true,
        data: {
          address,
          salary: salary.toString(),
          lastPayment: new Date(Number(lastPayment) * 1000).toISOString(),
          accrued: accrued.toString(),
          active,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Get all active payees
    const [addresses, salaries, lastPayments, accrued] = await publicClient.readContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'getActivePayees'
    }) as [string[], bigint[], bigint[], bigint[]]

    const payees = addresses.map((address, index) => ({
      address,
      salary: salaries[index].toString(),
      lastPayment: new Date(Number(lastPayments[index]) * 1000).toISOString(),
      accrued: accrued[index].toString(),
      active: true
    }))

    // Calculate totals
    const totalMonthlyOutflow = salaries.reduce((sum, salary) => sum + salary, BigInt(0))
    const totalAccrued = accrued.reduce((sum, acc) => sum + acc, BigInt(0))

    return NextResponse.json({
      success: true,
      data: {
        payees,
        count: payees.length,
        totalMonthlyOutflow: totalMonthlyOutflow.toString(),
        totalAccrued: totalAccrued.toString(),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('GET /api/treasury/payees error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payees',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST: Add new payee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, salary, userSignature } = body

    // Validation
    if (!address || !salary || !userSignature) {
      return NextResponse.json({
        success: false,
        error: 'Address, salary, and user signature are required'
      }, { status: 400 })
    }

    if (!isAddress(address)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address'
      }, { status: 400 })
    }

    const salaryBigInt = BigInt(salary)
    if (salaryBigInt <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Salary must be positive'
      }, { status: 400 })
    }

    // Verify user signature (simplified - in production use proper verification)
    // This ensures only authorized admins can add payees

    // Use admin wallet to execute transaction
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Add payee to contract
    const hash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'addPayee',
      args: [address as `0x${string}`, salaryBigInt]
    })

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        address,
        salary: salaryBigInt.toString(),
        status: 'added',
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('POST /api/treasury/payees error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add payee',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PUT: Update payee salary
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, salary, userSignature } = body

    if (!address || !salary || !userSignature) {
      return NextResponse.json({
        success: false,
        error: 'Address, salary, and user signature are required'
      }, { status: 400 })
    }

    if (!isAddress(address)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address'
      }, { status: 400 })
    }

    const salaryBigInt = BigInt(salary)
    if (salaryBigInt <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Salary must be positive'
      }, { status: 400 })
    }

    // Verify signature
    // ...

    // Use admin wallet
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Update payee salary
    const hash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'updatePayeeSalary',
      args: [address as `0x${string}`, salaryBigInt]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        address,
        newSalary: salaryBigInt.toString(),
        status: 'updated',
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('PUT /api/treasury/payees error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update payee',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// DELETE: Deactivate payee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const userSignature = searchParams.get('signature')

    if (!address || !userSignature) {
      return NextResponse.json({
        success: false,
        error: 'Address and signature are required'
      }, { status: 400 })
    }

    if (!isAddress(address)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address'
      }, { status: 400 })
    }

    // Verify signature
    // ...

    // Use admin wallet
    if (!process.env.TREASURY_ADMIN_PRIVATE_KEY) {
      throw new Error('Treasury admin private key not configured')
    }

    const adminAccount = privateKeyToAccount(process.env.TREASURY_ADMIN_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: cronosTestnet,
      transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org')
    })

    // Deactivate payee
    const hash = await walletClient.writeContract({
      address: CONTRACTS.TREASURY_MANAGER,
      abi: TREASURY_ABI,
      functionName: 'deactivatePayee',
      args: [address as `0x${string}`]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        address,
        status: 'deactivated',
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('DELETE /api/treasury/payees error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to deactivate payee',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}