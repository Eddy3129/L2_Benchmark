import { NetworkConfig } from '@/types/shared';

// Centralized network configuration
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'Arbitrum Sepolia',
    color: '#2563eb',
    symbol: 'ETH',
    chainId: 421614
  },
  optimismSepolia: {
    id: 'optimismSepolia',
    name: 'Optimism Sepolia',
    color: '#dc2626',
    symbol: 'ETH',
    chainId: 11155420
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    color: '#1d4ed8',
    symbol: 'ETH',
    chainId: 84532
  },
  polygonAmoy: {
    id: 'polygonAmoy',
    name: 'Polygon Amoy',
    color: '#7c3aed',
    symbol: 'POL',
    chainId: 80002
  },
  polygonZkEvm: {
    id: 'polygonZkEvm',
    name: 'Polygon zkEVM Testnet',
    color: '#8b5cf6',
    symbol: 'ETH',
    chainId: 1442
  },
  zkSyncSepolia: {
    id: 'zkSyncSepolia',
    name: 'zkSync Era Sepolia',
    color: '#06b6d4',
    symbol: 'ETH',
    chainId: 300
  },
  
  // Mainnet networks
  mainnet: {
    id: 'mainnet',
    name: 'Ethereum',
    color: '#627EEA',
    symbol: 'ETH',
    chainId: 1
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon PoS',
    color: '#8247E5',
    symbol: 'POL',
    chainId: 137
  },
  'polygon-zkevm': {
    id: 'polygon-zkevm',
    name: 'Polygon zkEVM',
    color: '#7B3FE4',
    symbol: 'ETH',
    chainId: 1101
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    color: '#28A0F0',
    symbol: 'ETH',
    chainId: 42161
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    color: '#FF0420',
    symbol: 'ETH',
    chainId: 10
  },
  base: {
    id: 'base',
    name: 'Base',
    color: '#0052FF',
    symbol: 'ETH',
    chainId: 8453
  },

  'zksync-era': {
    id: 'zksync-era',
    name: 'zkSync Era',
    color: '#4E529A',
    symbol: 'ETH',
    chainId: 324
  }
};

// Network display utilities
export const getNetworkDisplayName = (networkId: string): string => {
  const networkMap: Record<string, string> = {
    'arbitrumSepolia': 'Arbitrum Sepolia',
    'optimismSepolia': 'Optimism Sepolia',
    'baseSepolia': 'Base Sepolia',
    'polygonAmoy': 'Polygon Amoy',
    'polygonZkEvm': 'Polygon zkEVM Testnet',
    'zkSyncSepolia': 'zkSync Era Sepolia',
    'mainnet': 'Ethereum',
    'polygon': 'Polygon PoS',
    'polygon-zkevm': 'Polygon zkEVM',
    'arbitrum': 'Arbitrum',
    'optimism': 'Optimism',
    'base': 'Base',
    'zksync-era': 'zkSync Era'
  };
  return networkMap[networkId] || networkId.toUpperCase();
};

export const getNetworkConfig = (networkId: string): NetworkConfig | undefined => {
  return NETWORK_CONFIGS[networkId];
};

export const getAllNetworks = (): NetworkConfig[] => {
  return Object.values(NETWORK_CONFIGS);
};

export const getNetworksByIds = (networkIds: string[]): NetworkConfig[] => {
  return networkIds.map(id => NETWORK_CONFIGS[id]).filter(Boolean);
};

// Chart colors for consistent styling
export const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export const getNetworkColor = (networkId: string, index?: number): string => {
  const config = NETWORK_CONFIGS[networkId];
  if (config?.color) {
    return config.color;
  }
  return CHART_COLORS[index || 0] || '#6b7280';
};