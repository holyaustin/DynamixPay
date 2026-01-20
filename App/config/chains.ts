// config/chains.ts
import { defineChain } from 'viem'

export const cronosTestnet = defineChain({
  id: 338,
  name: 'Cronos Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Cronos',
    symbol: 'tCRO',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-t3.cronos.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'CronosScan',
      url: 'https://cronos.org/explorer/testnet3',
    },
  },
})