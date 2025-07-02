import { createConfig, http } from 'wagmi';
import { sepolia, arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Get Alchemy API key from environment
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'pyPqVuQbXwVj3OYAWst9IY60uR3oSi1q';

export const config = createConfig({
  chains: [arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [arbitrumSepolia.id]: http(`https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [optimismSepolia.id]: http(`https://opt-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [polygonAmoy.id]: http(`https://polygon-amoy.g.alchemy.com/v2/${alchemyApiKey}`),
  },
});