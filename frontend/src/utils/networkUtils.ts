/**
 * Network Utilities for L2 Benchmarking Platform
 * Centralized network operations and validation
 */

import { NetworkConfig } from '../config/networks';

/**
 * Enhanced error class for network-related operations
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly chainId?: number,
    public readonly networkId?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Network operation result with detailed information
 */
export interface NetworkOperationResult {
  success: boolean;
  chainId?: number;
  networkName?: string;
  error?: NetworkError;
  duration?: number;
}

/**
 * Validates a chain ID string and returns the numeric value
 * @param chainIdString - The chain ID as a string
 * @param allowedChainIds - Optional array of allowed chain IDs
 * @returns The validated numeric chain ID
 * @throws NetworkError if validation fails
 */
export function validateChainId(
  chainIdString: string,
  allowedChainIds?: number[]
): number {
  // Check for empty or undefined
  if (!chainIdString || chainIdString.trim() === '') {
    throw new NetworkError(
      'Chain ID cannot be empty or undefined',
      'INVALID_CHAIN_ID_EMPTY'
    );
  }

  // Parse to number
  const chainId = parseInt(chainIdString.trim());
  if (isNaN(chainId)) {
    throw new NetworkError(
      `Invalid chain ID format: "${chainIdString}" is not a valid number`,
      'INVALID_CHAIN_ID_FORMAT',
      undefined,
      chainIdString
    );
  }

  // Check if positive
  if (chainId <= 0) {
    throw new NetworkError(
      `Invalid chain ID: ${chainId} must be a positive number`,
      'INVALID_CHAIN_ID_NEGATIVE',
      chainId
    );
  }

  // Check against whitelist if provided
  if (allowedChainIds && !allowedChainIds.includes(chainId)) {
    throw new NetworkError(
      `Unsupported chain ID: ${chainId}. Allowed chains: ${allowedChainIds.join(', ')}`,
      'UNSUPPORTED_CHAIN_ID',
      chainId
    );
  }

  return chainId;
}

/**
 * Finds a network configuration by chain ID
 * @param chainId - The numeric chain ID
 * @param networks - Array of network configurations
 * @returns The network configuration or undefined
 */
export function findNetworkByChainId(
  chainId: number,
  networks: NetworkConfig[]
): NetworkConfig | undefined {
  return networks.find(network => network.chainId === chainId);
}

/**
 * Finds a network configuration by string ID
 * @param networkId - The string network ID (e.g., 'baseSepolia')
 * @param networks - Array of network configurations
 * @returns The network configuration or undefined
 */
export function findNetworkByStringId(
  networkId: string,
  networks: NetworkConfig[]
): NetworkConfig | undefined {
  return networks.find(network => network.id === networkId);
}

/**
 * Converts a network string ID to chain ID
 * @param networkStringId - The string network ID
 * @param networks - Array of network configurations
 * @returns The numeric chain ID
 * @throws NetworkError if network not found
 */
export function getChainIdFromNetworkId(
  networkStringId: string,
  networks: NetworkConfig[]
): number {
  const network = findNetworkByStringId(networkStringId, networks);
  if (!network) {
    throw new NetworkError(
      `Network configuration not found for ID: ${networkStringId}`,
      'NETWORK_NOT_FOUND',
      undefined,
      networkStringId
    );
  }
  return network.chainId;
}

/**
 * Groups contracts by their chain ID
 * @param contracts - Array of contracts with networkId (chain ID string)
 * @returns Map of chain ID to contracts array
 */
export function groupContractsByChainId<T extends { networkId: string }>(
  contracts: T[]
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  
  for (const contract of contracts) {
    try {
      const chainId = validateChainId(contract.networkId);
      if (!groups.has(chainId)) {
        groups.set(chainId, []);
      }
      groups.get(chainId)!.push(contract);
    } catch (error) {
      console.warn(`Skipping contract with invalid networkId: ${contract.networkId}`, error);
    }
  }
  
  return groups;
}

/**
 * Rate limiter for network operations
 */
export class NetworkOperationRateLimiter {
  private lastOperation = 0;
  private readonly minInterval: number;

  constructor(minIntervalMs: number = 1000) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Waits if necessary to respect rate limiting
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastOperation;
    
    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastOperation = Date.now();
  }

  /**
   * Executes an operation with rate limiting
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.waitIfNeeded();
    return operation();
  }
}

/**
 * Network switch helper with retry logic
 */
export class NetworkSwitchHelper {
  private rateLimiter = new NetworkOperationRateLimiter(1000);

  constructor(
    private switchChain: (params: { chainId: number }) => Promise<void>,
    private getCurrentChainId: () => number | undefined
  ) {}

  /**
   * Switches to a target network with retry logic
   * @param targetChainId - The target chain ID
   * @param maxRetries - Maximum number of retry attempts
   * @param retryDelayMs - Delay between retries
   * @returns Network operation result
   */
  async switchToNetwork(
    targetChainId: number,
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ): Promise<NetworkOperationResult> {
    const startTime = Date.now();
    
    try {
      // Check if already on target network
      const currentChainId = this.getCurrentChainId();
      if (currentChainId === targetChainId) {
        return {
          success: true,
          chainId: targetChainId,
          duration: Date.now() - startTime
        };
      }

      // Attempt network switch with retries
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.rateLimiter.execute(async () => {
            await this.switchChain({ chainId: targetChainId });
          });

          // Verify the switch was successful
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for wallet to update
          const newChainId = this.getCurrentChainId();
          
          if (newChainId === targetChainId) {
            return {
              success: true,
              chainId: targetChainId,
              duration: Date.now() - startTime
            };
          }

          if (attempt < maxRetries) {
            console.warn(`Network switch attempt ${attempt} failed. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          }
        } catch (switchError) {
          if (attempt === maxRetries) {
            throw switchError;
          }
          console.warn(`Network switch attempt ${attempt} failed:`, switchError);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }

      // If we get here, all retries failed
      const finalChainId = this.getCurrentChainId();
      throw new NetworkError(
        `Network switch failed after ${maxRetries} attempts. Still on chain ${finalChainId}, expected ${targetChainId}`,
        'NETWORK_SWITCH_FAILED',
        finalChainId
      );

    } catch (error) {
      const networkError = error instanceof NetworkError 
        ? error 
        : new NetworkError(
            `Network switch failed: ${error instanceof Error ? error.message : String(error)}`,
            'NETWORK_SWITCH_ERROR',
            targetChainId
          );

      return {
        success: false,
        error: networkError,
        duration: Date.now() - startTime
      };
    }
  }
}

/**
 * Metrics collector for network operations
 */
export class NetworkMetricsCollector {
  private metrics = {
    totalSwitches: 0,
    successfulSwitches: 0,
    failedSwitches: 0,
    totalSwitchTime: 0,
    switchesByNetwork: new Map<number, number>(),
    errorsByType: new Map<string, number>()
  };

  recordSwitch(result: NetworkOperationResult, targetChainId: number): void {
    this.metrics.totalSwitches++;
    
    if (result.success) {
      this.metrics.successfulSwitches++;
      if (result.duration) {
        this.metrics.totalSwitchTime += result.duration;
      }
    } else {
      this.metrics.failedSwitches++;
      if (result.error) {
        const errorCount = this.metrics.errorsByType.get(result.error.code) || 0;
        this.metrics.errorsByType.set(result.error.code, errorCount + 1);
      }
    }

    const networkCount = this.metrics.switchesByNetwork.get(targetChainId) || 0;
    this.metrics.switchesByNetwork.set(targetChainId, networkCount + 1);
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalSwitches > 0 
        ? (this.metrics.successfulSwitches / this.metrics.totalSwitches) * 100 
        : 0,
      averageSwitchTime: this.metrics.successfulSwitches > 0 
        ? this.metrics.totalSwitchTime / this.metrics.successfulSwitches 
        : 0,
      switchesByNetwork: Object.fromEntries(this.metrics.switchesByNetwork),
      errorsByType: Object.fromEntries(this.metrics.errorsByType)
    };
  }

  reset(): void {
    this.metrics = {
      totalSwitches: 0,
      successfulSwitches: 0,
      failedSwitches: 0,
      totalSwitchTime: 0,
      switchesByNetwork: new Map(),
      errorsByType: new Map()
    };
  }
}

/**
 * Default allowed chain IDs for the platform
 */
export const ALLOWED_CHAIN_IDS = [
  1,        // Ethereum Mainnet
  11155111, // Sepolia Testnet
  84532,    // Base Sepolia
  421614,   // Arbitrum Sepolia
  11155420, // Optimism Sepolia
  80002,    // Polygon Amoy
  42161,    // Arbitrum One
  10,       // Optimism
  137,      // Polygon
  8453      // Base
];

/**
 * Validates a chain ID against the platform's allowed chains
 */
export function validatePlatformChainId(chainIdString: string): number {
  return validateChainId(chainIdString, ALLOWED_CHAIN_IDS);
}