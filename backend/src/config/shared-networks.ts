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
  category: 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'zksync' | 'scroll' | 'linea' | 'ink';
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
    rpcUrl: getRpcUrl('OPTIMISM_SEPOLIA_RPC_URL', 'https://sepolia.optimism.io'),
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
    color: '#0052ff',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'sepolia',
    isTestnet: true,
    isL2: true
  }
};

// Mainnet configurations
export const MAINNET_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'ethereum',
    displayName: 'Ethereum',
    chainId: 1,
    rpcUrl: getRpcUrl('ETHEREUM_RPC_URL', 'https://eth-mainnet.g.alchemy.com/v2/demo'),
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
    color: '#627eea',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 12,
    isTestnet: false,
    isL2: false
  },
  polygon: {
    id: 'polygon',
    name: 'polygon',
    displayName: 'Polygon',
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
    type: 'mainnet',
    category: 'polygon',
    color: '#8247e5',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 256,
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
    color: '#28a0f0',
    blockTime: 1,
    gasLimit: 32000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
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
    color: '#ff0420',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
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
    color: '#0052ff',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
    isTestnet: false,
    isL2: true
  },
  'polygon-zkevm': {
    id: 'polygon-zkevm',
    name: 'polygon-zkevm',
    displayName: 'Polygon zkEVM',
    chainId: 1101,
    rpcUrl: getRpcUrl('POLYGON_ZKEVM_RPC_URL', 'https://zkevm-rpc.com'),
    explorerUrl: 'https://zkevm.polygonscan.com',
    explorerApiUrl: 'https://api-zkevm.polygonscan.com/api',
    explorerApiKey: process.env.POLYGONSCAN_API_KEY,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'polygon',
    color: '#7b3fe4',
    blockTime: 5,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
    isTestnet: false,
    isL2: true
  },
  'zksync-era': {
    id: 'zksync-era',
    name: 'zksync-era',
    displayName: 'zkSync Era',
    chainId: 324,
    rpcUrl: getRpcUrl('ZKSYNC_ERA_RPC_URL', 'https://mainnet.era.zksync.io'),
    explorerUrl: 'https://explorer.zksync.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'zksync',
    color: '#4e529a',
    blockTime: 1,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
    isTestnet: false,
    isL2: true
  },
  scroll: {
    id: 'scroll',
    name: 'scroll',
    displayName: 'Scroll',
    chainId: 534352,
    rpcUrl: getRpcUrl('SCROLL_RPC_URL', 'https://rpc.scroll.io'),
    explorerUrl: 'https://scrollscan.com',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'scroll',
    color: '#ffeaa7',
    blockTime: 3,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
    isTestnet: false,
    isL2: true
  },
  linea: {
    id: 'linea',
    name: 'linea',
    displayName: 'Linea',
    chainId: 59144,
    rpcUrl: getRpcUrl('LINEA_RPC_URL', 'https://rpc.linea.build'),
    explorerUrl: 'https://lineascan.build',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'l2',
    category: 'linea',
    color: '#61dfff',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 1,
    parentChain: 'ethereum',
    isTestnet: false,
    isL2: true
  },
  ink: {
    id: 'ink',
    name: 'ink',
    displayName: 'Ink',
    chainId: 763373,
    rpcUrl: getRpcUrl('INK_RPC_URL', 'https://rpc-gel-sepolia.inkonchain.com'),
    explorerUrl: 'https://explorer-sepolia.inkonchain.com',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    type: 'mainnet',
    category: 'ink',
    color: '#000000',
    blockTime: 2,
    gasLimit: 30000000,
    finalityBlocks: 1,
    isTestnet: false,
    isL2: true
  }
};

// Combined networks
export const ALL_NETWORKS: Record<string, NetworkConfig> = {
  ...TESTNET_NETWORKS,
  ...MAINNET_NETWORKS
};

export const getNetworkConfig = (networkId: string): NetworkConfig | undefined => {
  return ALL_NETWORKS[networkId];
};

export const getTestnetNetworks = (): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => network.isTestnet);
};

export const getMainnetNetworks = (): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => !network.isTestnet);
};

export const getL2Networks = (): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => network.isL2);
};

export const getNetworksByCategory = (category: NetworkConfig['category']): NetworkConfig[] => {
  return Object.values(ALL_NETWORKS).filter(network => network.category === category);
};

export const getNetworkByChainId = (chainId: number): NetworkConfig | undefined => {
  return Object.values(ALL_NETWORKS).find(network => network.chainId === chainId);
};

// NestJS configuration factory for backend integration
export const createNetworkConfig = () => ({
  networks: Object.values(ALL_NETWORKS)
});