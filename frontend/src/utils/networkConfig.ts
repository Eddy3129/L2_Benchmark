import { NetworkConfig } from '@/types/shared';

// Centralized network configuration
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'Arbitrum One',
    color: '#2563eb',
    symbol: 'ETH',
    chainId: 421614
  },
  optimismSepolia: {
    id: 'optimismSepolia',
    name: 'Optimism Mainnet',
    color: '#dc2626',
    symbol: 'ETH',
    chainId: 11155420
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base',
    color: '#1d4ed8',
    symbol: 'ETH',
    chainId: 84532
  },
  polygonAmoy: {
    id: 'polygonAmoy',
    name: 'Polygon',
    color: '#7c3aed',
    symbol: 'POL',
    chainId: 80002
  }
};

// Network display utilities
export const getNetworkDisplayName = (networkId: string): string => {
  const networkMap: Record<string, string> = {
    'arbitrumSepolia': 'ARBITRUM ONE',
    'optimismSepolia': 'OPTIMISM MAINNET',
    'baseSepolia': 'BASE',
    'polygonAmoy': 'POLYGON'
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