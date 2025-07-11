import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { getTestnetNetworks } from '@/config/networks'

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id'

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
}

// 2. Create a metadata object - optional
const metadata = {
  name: 'L2 Benchmarking App',
  description: 'Professional L2 blockchain benchmarking application',
  url: 'https://l2benchmark.app', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// 3. Convert centralized network configs to wagmi format
const testnetNetworks = getTestnetNetworks()
const networks = testnetNetworks.map(network => ({
  id: network.chainId,
  name: network.displayName,
  nativeCurrency: {
    name: network.nativeCurrency.name,
    symbol: network.nativeCurrency.symbol,
    decimals: network.nativeCurrency.decimals
  },
  rpcUrls: {
    default: { http: [network.rpcUrl] },
    public: { http: [network.rpcUrl] }
  },
  blockExplorers: {
    default: {
      name: `${network.displayName} Explorer`,
      url: network.blockExplorerUrl
    }
  },
  testnet: network.type === 'testnet'
}))

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// 5. Create modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

export { wagmiAdapter, modal, projectId, networks }