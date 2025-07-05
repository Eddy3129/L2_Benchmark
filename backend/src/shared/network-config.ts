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
  
  // Ethereum networks
  sepolia: { 
    name: 'Sepolia Testnet', 
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org', 
    chainId: 11155111,
    gasPriceChainId: 1 // Use Ethereum Mainnet for gas prices
  },
  
  // Layer 2 networks
  arbitrumSepolia: { 
    name: 'Arbitrum One', 
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc', 
    chainId: 421614,
    gasPriceChainId: 42161 // Use Arbitrum One for gas prices
  },
  optimismSepolia: { 
    name: 'Optimism Mainnet', 
    rpcUrl: process.env.OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io/', 
    chainId: 11155420,
    gasPriceChainId: 10 // Use Optimism Mainnet for gas prices
  },
  baseSepolia: { 
    name: 'Base', 
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org', 
    chainId: 84532,
    gasPriceChainId: 8453 // Use Base Mainnet for gas prices
  },
  polygonAmoy: { 
    name: 'Polygon', 
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/', 
    chainId: 80002,
    gasPriceChainId: 137 // Use Polygon Mainnet for gas prices
  },
  polygonZkEvm: {
    name: 'Polygon zkEVM',
    rpcUrl: process.env.POLYGON_ZKEVM_RPC_URL || 'https://rpc.public.zkevm-test.net',
    chainId: 1442,
    gasPriceChainId: 1101 // Use Polygon zkEVM Mainnet for gas prices
  },
  zkSyncSepolia: {
    name: 'zkSync Era',
    rpcUrl: process.env.ZKSYNC_SEPOLIA_RPC_URL || 'https://sepolia.era.zksync.dev',
    chainId: 300,
    gasPriceChainId: 324 // Use zkSync Era Mainnet for gas prices
  },
  
  // Mainnet networks
  ethereum: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    chainId: 1
  },
  polygon: {
    name: 'Polygon PoS',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: 137
  },
  'polygon-zkevm': {
    name: 'Polygon zkEVM',
    rpcUrl: process.env.POLYGON_ZKEVM_MAINNET_RPC_URL || 'https://zkevm-rpc.com',
    chainId: 1101
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    chainId: 42161
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    chainId: 10
  },
  base: {
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    chainId: 8453
  },

  'zksync-era': {
    name: 'zkSync Era',
    rpcUrl: process.env.ZKSYNC_ERA_RPC_URL || 'https://mainnet.era.zksync.io',
    chainId: 324
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