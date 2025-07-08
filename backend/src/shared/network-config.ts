import { NetworkConfig } from './types';

// Centralized network configurations
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  // Local networks
  hardhat: { 
    name: 'Hardhat Local', 
    rpcUrl: 'http://127.0.0.1:8545', 
    chainId: 31337 
  },
  localhost: { 
    name: 'Localhost', 
    rpcUrl: 'http://127.0.0.1:8545', 
    chainId: 31337 
  },
  
  // Testnets - Using your configured RPC URLs
  sepolia: {
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    chainId: 11155111,
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/demo',
    chainId: 421614,
  },
  'optimism-sepolia': {
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OP_SEPOLIA_RPC_URL || 'https://opt-sepolia.g.alchemy.com/v2/demo',
    chainId: 11155420,
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/demo',
    chainId: 84532,
  },
  polygonAmoy: { 
    name: 'Polygon Amoy', 
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/demo', 
    chainId: 80002,
    gasPriceChainId: 137 // Use Polygon Mainnet for gas prices
  },
  polygonZkEvm: {
    name: 'Polygon zkEVM Testnet',
    rpcUrl: process.env.POLYGON_ZKEVM_RPC_URL || 'https://polygonzkevm-testnet.g.alchemy.com/v2/demo',
    chainId: 1442,
    gasPriceChainId: 1101 // Use Polygon zkEVM Mainnet for gas prices
  },
  zkSyncSepolia: {
    name: 'zkSync Sepolia',
    rpcUrl: process.env.ZKSYNC_SEPOLIA_RPC_URL || 'https://sepolia.era.zksync.dev',
    chainId: 300,
    gasPriceChainId: 324 // Use zkSync Era Mainnet for gas prices
  },
  
  // Mainnets - Using your configured RPC URLs
  ethereum: {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    chainId: 1,
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
    chainId: 42161,
  },
  base: {
    name: 'Base',
    rpcUrl: process.env.BASE_MAINNET_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/demo',
    chainId: 8453,
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/demo',
    chainId: 10,
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    chainId: 137,
  },
  'polygon-zkevm': {
    name: 'Polygon zkEVM',
    rpcUrl: process.env.POLYGON_ZKEVM_MAINNET_RPC_URL || 'https://polygonzkevm-mainnet.g.alchemy.com/v2/demo',
    chainId: 1101,
  },
  'zksync-era': {
    name: 'zkSync Era',
    rpcUrl: process.env.ZKSYNC_ERA_RPC_URL || 'https://zksync-mainnet.g.alchemy.com/v2/demo',
    chainId: 324,
  },
};

// Utility functions for network operations
export class NetworkConfigService {
  static getNetworkConfig(networkKey: string): NetworkConfig | undefined {
    return NETWORK_CONFIGS[networkKey];
  }

  static getAllNetworks(): Record<string, NetworkConfig> {
    return NETWORK_CONFIGS;
  }

  static getNetworkKeys(): string[] {
    return Object.keys(NETWORK_CONFIGS);
  }

  static isLocalNetwork(chainId: number): boolean {
    return chainId === 31337;
  }

  static getMainnetChainId(networkKey: string): number {
    const config = NETWORK_CONFIGS[networkKey];
    return config?.gasPriceChainId || config?.chainId || 1;
  }

  static validateNetworks(networks: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    networks.forEach(network => {
      if (NETWORK_CONFIGS[network]) {
        valid.push(network);
      } else {
        invalid.push(network);
      }
    });
    
    return { valid, invalid };
  }

  static getNetworksByType(): { local: string[]; testnet: string[]; mainnet: string[] } {
    const local: string[] = [];
    const testnet: string[] = [];
    const mainnet: string[] = [];
    
    Object.entries(NETWORK_CONFIGS).forEach(([key, config]) => {
      if (config.chainId === 31337) {
        local.push(key);
      } else if (config.gasPriceChainId && config.gasPriceChainId !== config.chainId) {
        testnet.push(key);
      } else {
        mainnet.push(key);
      }
    });
    
    return { local, testnet, mainnet };
  }
}