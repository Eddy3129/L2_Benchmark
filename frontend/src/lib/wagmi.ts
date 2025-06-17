import { createConfig, http } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});