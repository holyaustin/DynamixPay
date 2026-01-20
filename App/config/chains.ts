// config/chains.ts
import { createPublicClient, http } from 'viem'
import { cronosTestnet } from '@/config/chains'

export const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(process.env.NEXT_PUBLIC_CRONOS_RPC || 'https://evm-t3.cronos.org'),
})