// config/privy.ts
export const PRIVY_CONFIG = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  supportedChains: [338], // Cronos Testnet
  defaultChain: 338,
  appearance: {
    theme: 'dark',
    accentColor: '#0ea5e9',
    logo: '/logo.png',
  },
  loginMethods: ['email', 'wallet', 'google', 'twitter'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
} as const