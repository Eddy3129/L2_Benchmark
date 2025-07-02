// ABI service - calls the NestJS backend for secure API key management
// No more CORS issues or exposed API keys!

import { env } from './env';

interface AbiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface SupportedChain {
  id: number;
  name: string;
  explorer: {
    name: string;
    apiUrl: string;
    v2ApiUrl?: string;
  };
}

export interface ContractInfo {
  abi: any[];
  name: string;
  writableFunctions: BenchmarkFunction[];
  readableFunctions: BenchmarkFunction[];
}

export interface BenchmarkFunction {
  name: string;
  inputs: any[];
  stateMutability: string;
  type: string;
}

class AbiService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private static supportedChainIds: number[] = [1, 11155111, 17000, 42161, 421614]; // Default supported chains
  private static chainsLoaded = false;

  constructor() {
    // Use your backend URL - adjust as needed
    this.baseUrl = env.BACKEND_URL || 'http://localhost:3001';
    this.timeout = env.API_TIMEOUT || 30000;
    
    // Load supported chains in background
    this.loadSupportedChains();
  }

  /**
   * Load supported chains from backend (async, runs in background)
   */
  private async loadSupportedChains() {
    if (AbiService.chainsLoaded) return;
    
    try {
      const chains = await this.getSupportedChains();
      AbiService.supportedChainIds = chains.map(chain => chain.id);
      AbiService.chainsLoaded = true;
    } catch (error) {
      console.warn('Failed to load supported chains, using defaults:', error.message);
    }
  }

  /**
   * Fetch contract ABI via backend API
   */
  async fetchContractAbi(address: string, chainId: number): Promise<any> {
    if (!address || !chainId) {
      throw new Error('Contract address and chain ID are required');
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      throw new Error('Invalid contract address format');
    }

    const url = `${this.baseUrl}/api/abi?address=${address}&chainId=${chainId}`;
    
    if (env.DEBUG_LOGS) {
      console.log('🔍 Fetching ABI via backend:', { address, chainId, url });
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      const data: AbiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Backend API returned unsuccessful response');
      }

      if (env.DEBUG_LOGS) {
        console.log('✅ ABI fetched successfully via backend');
      }

      return data.data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      console.error('❌ Backend ABI fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get supported chains from backend
   */
  async getSupportedChains(): Promise<SupportedChain[]> {
    const url = `${this.baseUrl}/api/abi/chains`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to fetch supported chains:', error.message);
      throw error;
    }
  }

  /**
   * Check backend health
   */
  async healthCheck(): Promise<boolean> {
    const url = `${this.baseUrl}/api/abi/health`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // Shorter timeout for health check
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';

    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error.message);
      return false;
    }
  }

  /**
   * Test the backend connection
   */
  async testConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.healthCheck();
      const latency = Date.now() - startTime;
      
      return {
        connected: isHealthy,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate Ethereum address format
   */
  isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
  }

  /**
   * Static method for address validation (for backward compatibility)
   */
  static isValidAddress(address: string): boolean {
    return abiServiceInstance.isValidAddress(address);
  }

  /**
   * Check if a chain is supported (synchronous)
   */
  static isChainSupported(chainId: number): boolean {
    return AbiService.supportedChainIds.includes(chainId);
  }

  /**
   * Get supported chain IDs as array (synchronous)
   */
  static getSupportedChains(): number[] {
    return [...AbiService.supportedChainIds];
  }

  /**
   * Generate default arguments for function inputs
   */
  static generateDefaultArgs(inputs: any[]): any[] {
    return inputs.map(input => {
      switch (input.type) {
        case 'address':
          return '0x0000000000000000000000000000000000000000';
        case 'uint256':
        case 'uint':
          return '0';
        case 'int256':
        case 'int':
          return '0';
        case 'bool':
          return false;
        case 'string':
          return '';
        case 'bytes':
        case 'bytes32':
          return '0x';
        default:
          if (input.type.includes('uint')) return '0';
          if (input.type.includes('int')) return '0';
          if (input.type.includes('bytes')) return '0x';
          if (input.type.includes('[]')) return [];
          return '';
      }
    });
  }

  /**
   * Fetch contract ABI and return ContractInfo (static method for backward compatibility)
   */
  static async fetchContractAbi(address: string, chainId: number): Promise<ContractInfo> {
    const abi = await abiServiceInstance.fetchContractAbi(address, chainId);
    
    // Process ABI to extract function information
    const writableFunctions: BenchmarkFunction[] = [];
    const readableFunctions: BenchmarkFunction[] = [];
    
    abi.forEach((item: any) => {
      if (item.type === 'function') {
        const func: BenchmarkFunction = {
          name: item.name,
          inputs: item.inputs || [],
          stateMutability: item.stateMutability || 'nonpayable',
          type: item.type
        };
        
        if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
          readableFunctions.push(func);
        } else {
          writableFunctions.push(func);
        }
      }
    });
    
    return {
      abi,
      name: 'Contract', // Default name, could be enhanced to fetch from contract
      writableFunctions,
      readableFunctions
    };
  }
}

// Export singleton instance
export const abiServiceInstance = new AbiService();

// Export class for custom instances
export { AbiService };

// Export the service directly
export const abiService = abiServiceInstance;

// Legacy function for backward compatibility
export function getAbiService() {
  console.log('🔄 Using ABI service via backend');
  return Promise.resolve(abiServiceInstance);
}