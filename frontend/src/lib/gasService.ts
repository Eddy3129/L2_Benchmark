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
  private apiKey: string;
  private baseUrl = 'https://api.blocknative.com';

  public readonly supportedChains: ChainConfig[] = [
    {
      id: 'mainnet',
      name: 'Ethereum',
      symbol: 'ETH',
      chainId: 1,
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
      blockExplorer: 'https://etherscan.io',
      color: '#627EEA',
      icon: 'Ξ',
      apiChainId: 1,
      coingeckoId: 'ethereum'
    },
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
      coingeckoSymbol: 'pol'
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
      coingeckoId: 'ethereum'
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
      coingeckoId: 'ethereum'
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
      coingeckoId: 'ethereum'
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
      coingeckoId: 'ethereum'
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
      coingeckoId: 'ethereum'
    }
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchBlockPrices(chain: ChainConfig, confidenceLevels?: string): Promise<GasPriceData> {
    let url = `${this.baseUrl}/gasprices/blockprices?chainid=${chain.apiChainId}`;
    if (confidenceLevels) {
      url += `&confidenceLevels=${confidenceLevels}`;
    }

    try {
      const headers: Record<string, string> = {};
      
      if (this.apiKey && this.apiKey.trim() !== '') {
        headers['Authorization'] = this.apiKey;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Blocknative API Error for ${chain.id}:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorText
        });
        throw new Error(`Blocknative API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch block prices for ${chain.id}:`, error);
      throw error;
    }
  }

  async getGasPrices(chainId: string = 'mainnet'): Promise<GasPriceData> {
    const chain = this.getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    return this.fetchBlockPrices(chain);
  }

  async getGasDistribution(chainId: string = 'mainnet'): Promise<GasDistribution> {
    const chain = this.getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    // Reverted to original confidence levels as requested
    const confidenceLevels = '70,80,90,95,99';
    return this.fetchBlockPrices(chain, confidenceLevels);
  }

  async getMultiChainGasData(chainIds: string[]): Promise<MultiChainGasData[]> {
    const results: MultiChainGasData[] = [];
    
    for (const chainId of chainIds) {
      try {
        // NOTE: This now fetches the same data twice. For performance, you could later refactor
        // this to make only one `getGasDistribution` call and use that data for both gasData and distribution.
        // However, keeping it as is to avoid changing original logic.
        const [gasData, distribution] = await Promise.all([
          this.getGasPrices(chainId),
          this.getGasDistribution(chainId)
        ]);
        
        results.push({
          chainId,
          gasData,
          distribution,
          timestamp: Date.now()
        });
        
        if (results.length < chainIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch data for chain ${chainId}:`, error);
      }
    }

    return results;
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

export const multiChainGasService = new MultiChainGasService(process.env.NEXT_PUBLIC_BLOCKNATIVE_API_KEY || '');
export type { GasPriceData, GasDistribution, MultiChainGasData, ChainConfig };