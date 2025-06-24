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
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      chainId: 1,
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
      blockExplorer: 'https://etherscan.io',
      color: '#627EEA',
      icon: 'Ξ',
      apiChainId: 1
    },
    {
      id: 'polygon',
      name: 'Polygon',
      symbol: 'POL',
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
      color: '#8247E5',
      icon: '⬟',
      apiChainId: 137
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
      apiChainId: 42161
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
      apiChainId: 10
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
      apiChainId: 8453
    }
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchBlockPrices(chain: ChainConfig, confidenceLevels?: string): Promise<GasPriceData> {
    // Use the correct API endpoint and parameter name as per documentation
    let url = `${this.baseUrl}/gasprices/blockprices?chainid=${chain.apiChainId}`;
    if (confidenceLevels) {
      url += `&confidenceLevels=${confidenceLevels}`;
    }

    try {
      const headers: Record<string, string> = {};
      
      // Add Authorization header only if API key is provided
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

  async getGasPrices(chainId: string = 'ethereum'): Promise<GasPriceData> {
    const chain = this.getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    return this.fetchBlockPrices(chain);
  }

  async getGasDistribution(chainId: string = 'ethereum'): Promise<GasDistribution> {
    const chain = this.getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    // Request standard confidence levels as per documentation
    const confidenceLevels = '70,80,90,95,99';
    return this.fetchBlockPrices(chain, confidenceLevels);
  }

  async getMultiChainGasData(chainIds: string[]): Promise<MultiChainGasData[]> {
    const results: MultiChainGasData[] = [];
    
    // Process chains sequentially to respect rate limits
    for (const chainId of chainIds) {
      try {
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
        
        // Add small delay between requests to respect rate limits
        if (results.length < chainIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch data for chain ${chainId}:`, error);
        // Continue with other chains even if one fails
      }
    }

    return results;
  }

  calculateOptimalGasPrice(distribution: GasDistribution | null, urgency: 'slow' | 'standard' | 'fast'): number {
    if (!distribution || !distribution.blockPrices || distribution.blockPrices.length === 0) {
      throw new Error('No gas distribution data available');
    }

    const latestBlock = distribution.blockPrices[0];
    if (!latestBlock.estimatedPrices || latestBlock.estimatedPrices.length === 0) {
      throw new Error('No estimated prices available');
    }

    // Map urgency to confidence levels as per Blocknative documentation
    const confidenceMap = {
      'slow': 50,    // 50% confidence (cheaper, might take longer)
      'standard': 80, // 80% confidence (balanced)
      'fast': 95     // 95% confidence (more expensive, faster)
    };

    const targetConfidence = confidenceMap[urgency];
    
    // Find the price for the target confidence level
    const targetPrice = latestBlock.estimatedPrices.find(
      price => price.confidence === targetConfidence
    );

    if (targetPrice) {
      return targetPrice.maxFeePerGas;
    }

    // Fallback: use the closest confidence level
    const sortedPrices = latestBlock.estimatedPrices.sort(
      (a, b) => Math.abs(a.confidence - targetConfidence) - Math.abs(b.confidence - targetConfidence)
    );

    return sortedPrices[0]?.maxFeePerGas || latestBlock.baseFeePerGas;
  }

  getChainConfig(chainId: string): ChainConfig | undefined {
    return this.supportedChains.find(chain => chain.id === chainId);
  }
}

export const multiChainGasService = new MultiChainGasService(process.env.NEXT_PUBLIC_BLOCKNATIVE_API_KEY || '');
export type { GasPriceData, GasDistribution, MultiChainGasData, ChainConfig };