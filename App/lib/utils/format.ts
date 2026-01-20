// lib/utils/format.ts
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatUSDC(amount: bigint | number | string): string {
  const numAmount = typeof amount === 'bigint' ? Number(amount) : Number(amount)
  return (numAmount / 1000000).toFixed(2)
}

export function formatDate(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBigInt(value: bigint): string {
  return value.toString()
}