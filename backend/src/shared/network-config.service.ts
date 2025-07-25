import { Injectable } from '@nestjs/common';
import { 
  NetworkConfig, 
  ALL_NETWORKS, 
  getNetworkConfig, 
  getNetworkByChainId as getSharedNetworkByChainId,
  getTestnetNetworks,
  getMainnetNetworks,
  getL2Networks,
  getNetworksByCategory
} from '../config/shared-networks';

@Injectable()
export class NetworkConfigService {
  private static networks: Map<string, NetworkConfig> = new Map();
  private static initialized = false;

  constructor() {
    // Initialize with shared networks if not already initialized
    if (!NetworkConfigService.initialized) {
      NetworkConfigService.initialize({ networks: Object.values(ALL_NETWORKS) });
    }
  }

  static initialize(config: { networks: NetworkConfig[] }) {
    this.networks.clear();
    config.networks.forEach(network => {
      this.networks.set(network.name, network);
    });
    this.initialized = true;
  }

  static getNetwork(name: string): NetworkConfig | undefined {
    // Handle legacy 'mainnet' -> 'ethereum' mapping
    const actualName = name === 'mainnet' ? 'ethereum' : name;
    // Fallback to shared config if not initialized or not found
    const network = this.networks.get(actualName) || getNetworkConfig(actualName);
    return network;
  }

  static getNetworkByChainId(chainId: number): NetworkConfig | undefined {
    // Try initialized networks first, then fallback to shared config
    const network = this.getAllNetworks().find(network => network.chainId === chainId) ||
                   getSharedNetworkByChainId(chainId);
    return network;
  }

  static getAllNetworks(): NetworkConfig[] {
    if (this.initialized && this.networks.size > 0) {
      return Array.from(this.networks.values());
    }
    // Fallback to shared config
    return Object.values(ALL_NETWORKS);
  }

  static getNetworksByType(type: 'mainnet' | 'testnet' | 'l2'): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.type === type);
  }

  static getNetworksByCategory(category: NetworkConfig['category']): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.category === category);
  }

  static getL2Networks(): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.isL2);
  }

  static getMainnetNetworks(): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.type === 'mainnet');
  }

  static getTestnetNetworks(): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.type === 'testnet');
  }

  static validateNetworks(networkNames: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    networkNames.forEach(name => {
      if (this.getNetwork(name)) {
        valid.push(name);
      } else {
        invalid.push(name);
      }
    });

    return { valid, invalid };
  }

  static isLocalNetwork(chainId: number): boolean {
    // Check if the network is a local development network
    const localChainIds = [1337, 31337, 1338]; // Common local chain IDs
    return localChainIds.includes(chainId);
  }

  static getMainnetChainId(networkKey: string): number {
    // Handle legacy 'mainnet' -> 'ethereum' mapping
    const actualNetworkKey = networkKey === 'mainnet' ? 'ethereum' : networkKey;
    const network = this.getNetwork(actualNetworkKey);
    if (!network) {
      return 1; // Default to Ethereum mainnet
    }

    // Map L2 networks to their parent chain for pricing
    const l2ToMainnetMap: { [key: string]: number } = {
      'arbitrum-sepolia': 1,
      'optimism-sepolia': 1,
      'base-sepolia': 1,
      'polygon-zkevm-testnet': 1,
      'zksync-sepolia': 1,
      'scroll-sepolia': 1,
      'linea-sepolia': 1,
      'arbitrum': 1,
      'optimism': 1,
      'base': 1,
      'polygon-zkevm': 1,
      'zksync-era': 1,
      'scroll': 1,
      'linea': 1,
      'ink': 1, // Ink uses ETH for pricing
      'polygon': 137, // Polygon uses its own token
    };

    return l2ToMainnetMap[network.name] || network.chainId;
  }
}