// lib/blockchain/ethers-utils.ts
import { ethers } from 'ethers'
import { CONTRACTS, TREASURY_ABI, USDC_ABI } from '@/config/contracts'

export const getProvider = () => {
  return new ethers.JsonRpcProvider('https://evm-t3.cronos.org')
}

export const getTreasuryContract = (signer?: ethers.Signer) => {
  const provider = getProvider()
  const contractSigner = signer || provider
  return new ethers.Contract(CONTRACTS.TREASURY_MANAGER, TREASURY_ABI, contractSigner)
}

export const getUsdcContract = (signer?: ethers.Signer) => {
  const provider = getProvider()
  const contractSigner = signer || provider
  return new ethers.Contract(CONTRACTS.USDC, USDC_ABI, contractSigner)
}

export const getSigner = async (privyClient: any) => {
  if (!privyClient) return null
  
  try {
    const provider = await privyClient.getEthereumProvider()
    return new ethers.BrowserProvider(provider).getSigner()
  } catch (error) {
    console.error('Error getting signer:', error)
    return null
  }
}

export const formatUSDC = (amount: bigint | string): string => {
  const amountStr = typeof amount === 'bigint' ? amount.toString() : amount
  const amountNum = parseFloat(ethers.formatUnits(amountStr, 6))
  return amountNum.toFixed(2)
}

export const parseUSDC = (amount: string): bigint => {
  return ethers.parseUnits(amount, 6)
}

export const getBalance = async (address: string): Promise<string> => {
  try {
    const usdcContract = getUsdcContract()
    const balance = await usdcContract.balanceOf(address)
    return formatUSDC(balance)
  } catch (error) {
    console.error('Error getting balance:', error)
    return '0.00'
  }
}