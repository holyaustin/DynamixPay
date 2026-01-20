// lib/blockchain/provider.ts
import { createPublicClient, http } from 'viem'
import { cronosTestnet } from '@/config/chains'  // Make sure this import exists

// Export cronosTestnet from here so other files can import it
export { cronosTestnet }

export const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org'),
})
