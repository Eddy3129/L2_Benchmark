import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface BlockExplorer {
  name: string;
  apiUrl: string;
  v2ApiUrl?: string;
}

export interface SupportedChain {
  id: number;
  name: string;
  explorer: BlockExplorer;
}

@Injectable()
export class AbiService {
  private readonly logger = new Logger(AbiService.name);
  private readonly abiCache = new Map<string, { abi: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Supported chains with their block explorers
  private readonly SUPPORTED_CHAINS: Record<number, SupportedChain> = {
    1: {
      id: 1,
      name: 'Ethereum Mainnet',
      explorer: {
        name: 'Etherscan',
        apiUrl: 'https://api.etherscan.io/api',
        v2ApiUrl: 'https://api.etherscan.io/v2/api',
      },
    },
    11155111: {
      id: 11155111,
      name: 'Sepolia Testnet',
      explorer: {
        name: 'Etherscan Sepolia',
        apiUrl: 'https://api-sepolia.etherscan.io/api',
        v2ApiUrl: 'https://api.etherscan.io/v2/api',
      },
    },
    17000: {
      id: 17000,
      name: 'Holesky Testnet',
      explorer: {
        name: 'Etherscan Holesky',
        apiUrl: 'https://api-holesky.etherscan.io/api',
        v2ApiUrl: 'https://api.etherscan.io/v2/api',
      },
    },
    421614: {
      id: 421614,
      name: 'Arbitrum Sepolia',
      explorer: {
        name: 'Etherscan V2 (Arbitrum Sepolia)',
        apiUrl: 'https://api-sepolia.arbiscan.io/api',
        v2ApiUrl: 'https://api.etherscan.io/v2/api',
      },
    },
    42161: {
      id: 42161,
      name: 'Arbitrum One',
      explorer: {
        name: 'Etherscan V2 (Arbitrum One)',
        apiUrl: 'https://api.arbiscan.io/api',
        v2ApiUrl: 'https://api.etherscan.io/v2/api',
      },
    },
  };

  constructor(private configService: ConfigService) {}

  /**
   * Fetch contract ABI from block explorer
   */
  async fetchContractAbi(address: string, chainId: number): Promise<any> {
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    
    // Check cache first
    const cached = this.abiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Cache hit for ${address} on chain ${chainId}`);
      return cached.abi;
    }

    const chain = this.SUPPORTED_CHAINS[chainId];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const apiKey = this.getApiKey(chainId);
    if (!apiKey) {
      throw new Error(`API key not configured for chain ${chainId}`);
    }

    this.logger.log(`Fetching ABI for ${address} on ${chain.name}`);
    this.logger.debug(`Using API key: ${apiKey.substring(0, 8)}...`);

    try {
      // Use v2 API for all chains that support it (recommended)
      const useV2Api = chain.explorer.v2ApiUrl;
      const baseUrl = useV2Api ? chain.explorer.v2ApiUrl : chain.explorer.apiUrl;
      
      let url: string;
      if (useV2Api) {
        // V2 API format with chainid parameter
        url = `${baseUrl}?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
        this.logger.debug('Using Etherscan v2 API format');
      } else {
        // V1 API format
        url = `${baseUrl}?module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
        this.logger.debug('Using v1 API format');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ABI-Service/1.0',
        },
        // 30 second timeout
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.debug('API Response:', data);

      // Handle API errors
      if (data.status === '0' || data.message === 'NOTOK') {
        const errorMsg = data.result || data.message || 'Unknown error';
        
        if (errorMsg.includes('Invalid API Key')) {
          throw new Error(`Invalid API Key for ${chain.explorer.name}. Please check your configuration.`);
        }
        if (errorMsg.includes('Contract source code not verified')) {
          throw new Error(`Contract ${address} is not verified on ${chain.explorer.name}`);
        }
        if (errorMsg.includes('Invalid address format')) {
          throw new Error(`Invalid contract address format: ${address}`);
        }
        if (errorMsg.includes('Max rate limit reached')) {
          throw new Error(`Rate limit exceeded for ${chain.explorer.name}. Please try again later.`);
        }
        
        throw new Error(`${chain.explorer.name} API error: ${errorMsg}`);
      }

      if (!data.result || data.result === 'Contract source code not verified') {
        throw new Error(`Contract ABI not found or not verified on ${chain.explorer.name}`);
      }

      // Parse and validate ABI
      let abi;
      try {
        abi = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      } catch (parseError) {
        throw new Error('Invalid ABI format received from API');
      }

      if (!Array.isArray(abi)) {
        throw new Error('ABI must be an array');
      }

      // Cache the result
      this.abiCache.set(cacheKey, {
        abi,
        timestamp: Date.now(),
      });

      this.logger.log(`Successfully fetched ABI for ${address} on ${chain.name}`);
      return abi;

    } catch (error) {
      this.logger.error(`Failed to fetch ABI for ${address} on chain ${chainId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get API key for the given chain
   */
  private getApiKey(chainId: number): string | null {
    // All supported chains use Etherscan API (v1 or v2)
    return this.configService.get<string>('ETHERSCAN_API_KEY') || null;
  }

  /**
   * Get list of supported chains
   */
  getSupportedChains(): SupportedChain[] {
    return Object.values(this.SUPPORTED_CHAINS);
  }

  /**
   * Health check - test API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a known verified contract (USDC on Ethereum)
      const testAddress = '0xA0b86a33E6441b8C4505E2c52C7E8C8A8C8C8C8C';
      await this.fetchContractAbi(testAddress, 1);
      return true;
    } catch (error) {
      this.logger.warn('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Clear ABI cache
   */
  clearCache(): void {
    this.abiCache.clear();
    this.logger.log('ABI cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.abiCache.size,
      keys: Array.from(this.abiCache.keys()),
    };
  }
}