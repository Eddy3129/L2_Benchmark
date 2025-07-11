// This file is deprecated. Use shared/config/networks.ts instead.
// Keeping for backward compatibility during migration.

import { 
  NetworkConfig, 
  getNetworkConfig as getSharedNetworkConfig,
  getNetworkByChainId as getSharedNetworkByChainId,
  getAllNetworks as getSharedAllNetworks,
  getTestnetNetworks as getSharedTestnetNetworks,
  getMainnetNetworks as getSharedMainnetNetworks,
  ALL_NETWORKS
} from '@/config/networks';

// Create a legacy format mapping for backward compatibility
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = ALL_NETWORKS;

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