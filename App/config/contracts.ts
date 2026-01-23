// config/contracts.ts
import { ethers } from 'ethers'

export const CONTRACTS = {
  TREASURY_MANAGER: (process.env.NEXT_PUBLIC_TREASURY_CONTRACT || '0x084622e6970BBcBA510454C6145313c2993ED9E4') as `0x${string}`,
  USDC: (process.env.NEXT_PUBLIC_USDC_CONTRACT || '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0') as `0x${string}`,
  X402_FACILITATOR_URL: process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || 'https://facilitator.cronoslabs.org/v2/x402',
} as const

// Add mainnet/testnet detection
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet'
export const IS_TESTNET = NETWORK === 'testnet'

// ABI for TreasuryManager
export const TREASURY_ABI = [
  'function getActivePayees() view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory)',
  'function getTreasuryBalance() view returns (uint256)',
  'function getPaymentRequest(uint256 requestId) view returns (address, uint256, uint256, bytes32, bool)',
  'function getTotalAccrued() view returns (uint256)',
  'function shouldTriggerPayroll(uint256 currentRevenue) view returns (bool)',
  'function revenueThreshold() view returns (uint256)',
  'function lastRevenueCheck() view returns (uint256)',
  'function getActivePayeeCount() view returns (uint256)',
  'function addPayee(address payee, uint256 salary)',
  'function addPayees(address[] calldata payees, uint256[] calldata salaries)',
  'function updatePayeeSalary(address payee, uint256 newSalary)',
  'function deactivatePayee(address payee)',
  'function createPaymentRequests() returns (uint256[] memory, uint256)',
  'function markPaymentSettled(uint256 requestId, bytes32 x402PaymentId, bytes32 txHash)',
  'function updateRevenueThreshold(uint256 newThreshold)',
  'function updateX402Facilitator(address newFacilitator)',
  'function withdrawPaymentToken(uint256 amount)',
  'event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount)',
  'event PaymentRequestCreated(uint256 indexed requestId, address indexed payee, uint256 amount, bytes32 x402PaymentId)',
  'event PaymentSettled(uint256 indexed requestId, bytes32 txHash)',
  'event PayeeAdded(address indexed payee, uint256 salary)',
  'event PayeeUpdated(address indexed payee, uint256 newSalary)',
  'event PayeeDeactivated(address indexed payee)',
  'event RevenueThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)',
  'event X402FacilitatorUpdated(address indexed oldFacilitator, address indexed newFacilitator)',
]

// ABI for USDC
export const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',
]

// Helper function to get provider
export const getProvider = () => {
  return new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
}

// Helper function to get contract instance
export const getContract = (address: string, abi: any, signer?: ethers.Signer) => {
  const provider = getProvider()
  const contractSigner = signer || provider
  return new ethers.Contract(address, abi, contractSigner)
}