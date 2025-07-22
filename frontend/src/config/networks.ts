// Centralized network configuration for the entire L2 benchmarking platform
// This file serves as the single source of truth for all network configurations

export interface NetworkConfig {
  id: string;
  name: string;
  displayName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  explorerApiKey?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  type: 'mainnet' | 'testnet' | 'l2';
  category: 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'zksync';
  color: string;
  blockTime: number; // Average block time in seconds
  gasLimit: number; // Block gas limit
  finalityBlocks: number; // Number of blocks for finality
  parentChain?: string; // For L2s, the parent chain
  bridgeContract?: string; // Bridge contract address
  sequencerUrl?: string; // For L2s with sequencers
  isTestnet: boolean;
  isL2: boolean;
}

// Environment-based RPC URLs with fallbacks
const getRpcUrl = (envKey: string, fallback: string): string => {
  return process.env[envKey] || fallback;
};

// Testnet configurations (primary focus for benchmarking)
export const TESTNET_NETWORKS: Record<string, NetworkConfig> = {
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'arbitrum-sepolia',
    displayName: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: getRpcUrl('ARBITRUM_SEPOLIA_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc'),
    explorerUrl: 'https://sepolia.arbiscan.io',
    explorerApiUrl: 'https://api-sepolia.arbiscan.io/api',
    explorerApiKey: process.env.ARBISCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'arbitrum',
    color: '#2563eb',
    blockTime: 1,
    gasLimit: 32000000,
    finalityBlocks: 1,
    parentChain: 'sepolia',
    isTestnet: true,
    isL2: true
  },
  optimismSepolia: {
    id: 'optimismSepolia',
    name: 'optimism-sepolia',
    displayName: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: getRpcUrl('OP_SEPOLIA_RPC_URL', 'https://sepolia.optimism.io'),
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    explorerApiUrl: 'https://api-sepolia-optimism.etherscan.io/api',
    explorerApiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'optimism',
    color: '#dc2626',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'sepolia',
    isTestnet: true,
    isL2: true
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'base-sepolia',
    displayName: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: getRpcUrl('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org'),
    explorerUrl: 'https://sepolia.basescan.org',
    explorerApiUrl: 'https://api-sepolia.basescan.org/api',
    explorerApiKey: process.env.BASESCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'base',
    color: '#1d4ed8',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'sepolia',
    isTestnet: true,
    isL2: true
  },
  polygonAmoy: {
    id: 'polygonAmoy',
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: getRpcUrl('POLYGON_AMOY_RPC_URL', 'https://rpc-amoy.polygon.technology'),
    explorerUrl: 'https://amoy.polygonscan.com',
    explorerApiUrl: 'https://api-amoy.polygonscan.com/api',
    explorerApiKey: process.env.POLYGONSCAN_API_KEY,
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'POL',
      decimals: 18
    },
    type: 'l2',
    category: 'polygon',
    color: '#7c3aed',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 128,
    isTestnet: true,
    isL2: true
  },
  sepolia: {
    id: 'sepolia',
    name: 'sepolia',
    displayName: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: getRpcUrl('SEPOLIA_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/demo'),
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    explorerApiKey: process.env.ETHERSCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'testnet',
    category: 'ethereum',
    color: '#627EEA',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 12,
    isTestnet: true,
    isL2: false
  }
};

// Mainnet configurations (for reference and future use)
export const MAINNET_NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    name: 'mainnet',
    displayName: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: getRpcUrl('MAINNET_RPC_URL', 'https://eth-mainnet.g.alchemy.com/v2/demo'),
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    explorerApiKey: process.env.ETHERSCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'mainnet',
    category: 'ethereum',
    color: '#627EEA',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 12,
    isTestnet: false,
    isL2: false
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: getRpcUrl('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    explorerApiKey: process.env.ARBISCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'arbitrum',
    color: '#28A0F0',
    blockTime: 1,
    gasLimit: 32000000,
    finalityBlocks: 1,
    parentChain: 'mainnet',
    isTestnet: false,
    isL2: true
  },
  optimism: {
    id: 'optimism',
    name: 'optimism',
    displayName: 'Optimism',
    chainId: 10,
    rpcUrl: getRpcUrl('OPTIMISM_RPC_URL', 'https://mainnet.optimism.io'),
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    explorerApiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'optimism',
    color: '#FF0420',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'mainnet',
    isTestnet: false,
    isL2: true
  },
  base: {
    id: 'base',
    name: 'base',
    displayName: 'Base',
    chainId: 8453,
    rpcUrl: getRpcUrl('BASE_RPC_URL', 'https://mainnet.base.org'),
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    explorerApiKey: process.env.BASESCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'base',
    color: '#0052FF',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'mainnet',
    isTestnet: false,
    isL2: true
  },
  polygon: {
    id: 'polygon',
    name: 'polygon',
    displayName: 'Polygon PoS',
    chainId: 137,
    rpcUrl: getRpcUrl('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    explorerApiKey: process.env.POLYGONSCAN_API_KEY,
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'POL',
      decimals: 18
    },
    type: 'l2',
    category: 'polygon',
    color: '#8247E5',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 128,
    isTestnet: false,
    isL2: true
  }
};

// Combined network configurations
export const ALL_NETWORKS: Record<string, NetworkConfig> = {
  ...TESTNET_NETWORKS,
  ...MAINNET_NETWORKS
};

// Utility functions
export const getNetworkConfig = (networkId: string): NetworkConfig | undefined => {
  return ALL_NETWORKS[networkId];
};

export const getTestnetNetworks = (): NetworkConfig[] => {
  return Object.values(TESTNET_NETWORKS);
};

export const getMainnetNetworks = (): NetworkConfig[] => {
  return Object.values(MAINNET_NETWORKS);
};

export const getL2Networks = (): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => network.isL2);
};

export const getNetworksByCategory = (category: NetworkConfig['category']): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => network.category === category);
};

export const getNetworkDisplayName = (networkId: string): string => {
  const network = getNetworkConfig(networkId);
  return network?.displayName || networkId.toUpperCase();
};

export const getNetworkColor = (networkId: string): string => {
  const network = getNetworkConfig(networkId);
  return network?.color || '#6b7280';
};

// Chart colors for consistent styling
export const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

// Network validation
export const isValidNetwork = (networkId: string): boolean => {
  return networkId in ALL_NETWORKS;
};

export const isTestnetNetwork = (networkId: string): boolean => {
  const network = getNetworkConfig(networkId);
  return network?.isTestnet || false;
};

export const isL2Network = (networkId: string): boolean => {
  const network = getNetworkConfig(networkId);
  return network?.isL2 || false;
};

export const getNetworkByChainId = (chainId: number): NetworkConfig | undefined => {
  return Object.values(ALL_NETWORKS).find(network => network.chainId === chainId);
};