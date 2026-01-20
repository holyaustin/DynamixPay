// App/components/wallet/PrivyProvider.tsx
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

// Cronos Testnet Chain Configuration
const cronosTestnet = {
  id: 338,
  name: "Cronos Testnet",
  nativeCurrency: {
    name: "Cronos",
    symbol: "tCRO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evm-t3.cronos.org"],
    },
    public: {
      http: ["https://evm-t3.cronos.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "CronosScan",
      url: "https://cronos.org/explorer/testnet3",
    },
  },
  testnet: true,
};

// Create Wagmi config
const wagmiConfig = createConfig({
  chains: [cronosTestnet],
  transports: {
    [cronosTestnet.id]: http(),
  },
  ssr: true,
});

export function PrivyProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        // Login methods
        loginMethods: ["email", "wallet", "google", "twitter"],
        
        // Embedded wallets configuration
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets" as const,
           
          },
        },
        
        // Appearance settings
        appearance: { 
          theme: "dark" as const,
          accentColor: "#0ea5e9",
          showWalletLoginFirst: true,
          logo: "/logo.png",
        },
        
        // Chain configuration
        defaultChain: cronosTestnet,
        supportedChains: [cronosTestnet],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
                fontSize: "14px",
                borderRadius: "8px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
              loading: {
                iconTheme: {
                  primary: "#0ea5e9",
                  secondary: "#fff",
                },
              },
            }}
          />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}