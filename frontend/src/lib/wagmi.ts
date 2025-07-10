import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia, arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy } from '@reown/appkit/networks';

// Get project ID from environment
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Get Alchemy API key from environment
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'pyPqVuQbXwVj3OYAWst9IY60uR3oSi1q';

export const networks = [arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy, sepolia];

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [arbitrumSepolia.id]: http(`https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [optimismSepolia.id]: http(`https://opt-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [polygonAmoy.id]: http(`https://polygon-amoy.g.alchemy.com/v2/${alchemyApiKey}`),
  }
});

export const config = wagmiAdapter.wagmiConfig;