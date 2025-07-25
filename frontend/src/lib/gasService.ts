import { NetworkConfig, getMainnetNetworks, getL2Networks } from '@/config/networks';

interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  color: string;
  icon: string;
  apiChainId?: number;
  coingeckoId?: string; 
  coingeckoSymbol?: string;
  type: 'optimistic-rollup' | 'zk-rollup' | 'sidechain' | 'mainnet';
}

// Convert shared NetworkConfig to ChainConfig format
const convertNetworkToChain = (network: NetworkConfig): ChainConfig => {
  const typeMap: { [key: string]: ChainConfig['type'] } = {
    'arbitrum': 'optimistic-rollup',
    'optimism': 'optimistic-rollup',
    'base': 'optimistic-rollup',
    'polygon': 'sidechain',
    'zksync': 'zk-rollup',
    'scroll': 'zk-rollup',
    'ethereum': 'mainnet'
  };

  return {
    id: network.id,
    name: network.displayName,
    symbol: network.nativeCurrency.symbol,
    chainId: network.chainId,
    rpcUrl: network.rpcUrl,
    blockExplorer: network.explorerUrl,
    color: network.color,
    icon: network.nativeCurrency.symbol.charAt(0),
    apiChainId: network.chainId,
    coingeckoId: network.nativeCurrency.symbol === 'ETH' ? 'ethereum' : 'polygon-ecosystem-token',
    type: typeMap[network.category] || 'mainnet'
  };
};

interface GasPriceData {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  blockPrices: Array<{
    blockNumber: number;
    estimatedTransactionCount: number;
    baseFeePerGas: number;
    blobBaseFeePerGas: number;
    estimatedPrices: Array<{
      confidence: number;
      price: number;
      maxPriorityFeePerGas: number;
      maxFeePerGas: number;
    }>;
  }>;
}

type GasDistribution = GasPriceData;

interface MultiChainGasData {
  chainId: string;
  gasData: GasPriceData;
  distribution: GasDistribution;
  timestamp: number;
}

class MultiChainGasService {
  public readonly supportedChains: ChainConfig[];

  constructor() {
    // Generate supportedChains from shared configuration
    const mainnetNetworks = getMainnetNetworks().filter(network => 
      ['polygon', 'arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era', 'scroll', 'linea'].includes(network.id)
    );
    this.supportedChains = mainnetNetworks.map(convertNetworkToChain);
  }

  async getMultiChainGasData(chainIds: string[]): Promise<MultiChainGasData[]> {
    try {
      // Call the backend API
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const chainsParam = chainIds.join(',');
      const url = `${backendUrl}/api/gas-analyzer/multi-chain-gas-data?chains=${chainsParam}&confidenceLevel=99`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response format from backend');
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to fetch multi-chain gas data from backend:', error);
      throw error;
    }
  }

  calculateOptimalGasPrice(distribution: GasDistribution | null, urgency: 'slow' | 'standard' | 'fast'): number {
    if (!distribution?.blockPrices?.[0]?.estimatedPrices?.length) {
      throw new Error('No gas distribution data available');
    }

    const latestBlock = distribution.blockPrices[0];
    const confidenceMap = { 'slow': 70, 'standard': 80, 'fast': 99 }; // Using 99% confidence for fast transactions
    const targetConfidence = confidenceMap[urgency];
    
    const targetPrice = latestBlock.estimatedPrices.find(
      price => price.confidence === targetConfidence
    );

    if (targetPrice) {
      return targetPrice.maxFeePerGas;
    }

    const sortedPrices = [...latestBlock.estimatedPrices].sort(
      (a, b) => Math.abs(a.confidence - targetConfidence) - Math.abs(b.confidence - targetConfidence)
    );

    return sortedPrices[0]?.maxFeePerGas || latestBlock.baseFeePerGas;
  }

  getOptimalPriorityFee(distribution: GasDistribution | null, urgency: 'slow' | 'standard' | 'fast'): number {
    if (!distribution?.blockPrices?.[0]?.estimatedPrices?.length) {
      return 0;
    }

    const latestBlock = distribution.blockPrices[0];
    const confidenceMap = { 'slow': 70, 'standard': 80, 'fast': 99 };
    const targetConfidence = confidenceMap[urgency];
    
    const targetPrice = latestBlock.estimatedPrices.find(
      price => price.confidence === targetConfidence
    );

    if (targetPrice) {
      return targetPrice.maxPriorityFeePerGas;
    }

    const sortedPrices = [...latestBlock.estimatedPrices].sort(
      (a, b) => Math.abs(a.confidence - targetConfidence) - Math.abs(b.confidence - targetConfidence)
    );

    return sortedPrices[0]?.maxPriorityFeePerGas || 0;
  }

  getChainConfig(chainId: string): ChainConfig | undefined {
    return this.supportedChains.find(chain => chain.id === chainId);
  }
}

export const multiChainGasService = new MultiChainGasService();
export type { GasPriceData, GasDistribution, MultiChainGasData, ChainConfig };