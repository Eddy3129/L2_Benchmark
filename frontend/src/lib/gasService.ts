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
  public readonly supportedChains: ChainConfig[] = [
    // {
    //   id: 'mainnet',
    //   name: 'Ethereum',
    //   symbol: 'ETH',
    //   chainId: 1,
    //   rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    //   blockExplorer: 'https://etherscan.io',
    //   color: '#627EEA',
    //   icon: 'Ξ',
    //   apiChainId: 1,
    //   coingeckoId: 'ethereum'
    // },
    {
      id: 'polygon',
      name: 'Polygon PoS',
      symbol: 'POL',
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
      color: '#8247E5',
      icon: '⬟',
      apiChainId: 137,
      coingeckoId: 'polygon-ecosystem-token',
      type: 'sidechain'
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum One',
      symbol: 'ARB',
      chainId: 42161,
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      blockExplorer: 'https://arbiscan.io',
      color: '#28A0F0',
      icon: 'A',
      apiChainId: 42161,
      coingeckoId: 'ethereum',
      type: 'optimistic-rollup'
    },
    {
      id: 'optimism',
      name: 'Optimism',
      symbol: 'OP',
      chainId: 10,
      rpcUrl: 'https://mainnet.optimism.io',
      blockExplorer: 'https://optimistic.etherscan.io',
      color: '#FF0420',
      icon: 'O',
      apiChainId: 10,
      coingeckoId: 'ethereum',
      type: 'optimistic-rollup'
    },
    {
      id: 'base',
      name: 'Base',
      symbol: 'BASE',
      chainId: 8453,
      rpcUrl: 'https://mainnet.base.org',
      blockExplorer: 'https://basescan.org',
      color: '#0052FF',
      icon: 'B',
      apiChainId: 8453,
      coingeckoId: 'ethereum',
      type: 'optimistic-rollup'
    },
    {
      id: 'polygon-zkevm',
      name: 'Polygon zkEVM',
      symbol: 'ETH',
      chainId: 1101,
      rpcUrl: 'https://zkevm-rpc.com',
      blockExplorer: 'https://zkevm.polygonscan.com',
      color: '#7B3FE4',
      icon: 'Z',
      apiChainId: 1101,
      coingeckoId: 'ethereum',
      type: 'zk-rollup'
    },
    {
      id: 'zksync-era',
      name: 'zkSync Era',
      symbol: 'ETH',
      chainId: 324,
      rpcUrl: 'https://mainnet.era.zksync.io',
      blockExplorer: 'https://explorer.zksync.io',
      color: '#4E529A',
      icon: 'Z',
      apiChainId: 324,
      coingeckoId: 'ethereum',
      type: 'zk-rollup'
    },
    {
      id: 'scroll',
      name: 'Scroll',
      symbol: 'ETH',
      chainId: 534352,
      rpcUrl: 'https://rpc.scroll.io',
      blockExplorer: 'https://scrollscan.com/',
      color: '#FFEAA7',
      icon: 'S',
      apiChainId: 534352,
      coingeckoId: 'ethereum',
      type: 'zk-rollup'
    },
    {
      id: 'ink',
      name: 'Ink',
      symbol: 'ETH',
      chainId: 57073,
      rpcUrl: 'https://rpc-gel.inkonchain.com',
      blockExplorer: 'https://explorer.inkonchain.com',
      color: '#000000',
      icon: 'I',
      apiChainId: 57073,
      coingeckoId: 'ethereum',
      type: 'zk-rollup'
    },
    {
      id: 'linea',
      name: 'Linea',
      symbol: 'ETH',
      chainId: 59144,
      rpcUrl: 'https://rpc.linea.build',
      blockExplorer: 'https://lineascan.build/',
      color: '#61DFFF',
      icon: 'L',
      apiChainId: 59144,
      coingeckoId: 'ethereum',
      type: 'zk-rollup'
    },
  ];

  constructor() {
    // No longer needs API key since all calls go through backend
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