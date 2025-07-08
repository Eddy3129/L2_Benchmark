import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsUrl, IsEnum, validateSync } from 'class-validator';
import { plainToClass, Transform, Type } from 'class-transformer';

export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  L2 = 'l2',
  LOCAL = 'local'
}

export enum NetworkCategory {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BASE = 'base',
  ZKSYNC = 'zksync'
}

export class NetworkConfig {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsUrl()
  rpcUrl: string;

  @IsNumber()
  chainId: number;

  @IsNumber()
  @IsOptional()
  gasPriceChainId?: number;

  @IsEnum(NetworkType)
  type: NetworkType;

  @IsEnum(NetworkCategory)
  category: NetworkCategory;

  @IsString()
  @IsOptional()
  nativeCurrency?: string;

  @IsString()
  @IsOptional()
  blockExplorerUrl?: string;

  @IsNumber()
  @IsOptional()
  blockTime?: number; // Average block time in seconds

  @IsNumber()
  @IsOptional()
  gasLimit?: number; // Block gas limit

  @IsString()
  @IsOptional()
  parentChain?: string; // For L2s, the parent chain

  @IsString()
  @IsOptional()
  bridgeContract?: string; // Bridge contract address

  @IsString()
  @IsOptional()
  sequencerUrl?: string; // For L2s with sequencers

  @IsNumber()
  @IsOptional()
  finalityBlocks?: number; // Number of blocks for finality

  @IsString()
  @IsOptional()
  etherscanApiKey?: string;

  @IsString()
  @IsOptional()
  etherscanApiUrl?: string;
}

export class NetworksConfig {
  @Type(() => NetworkConfig)
  networks: NetworkConfig[];

  @IsString()
  @IsOptional()
  defaultNetwork: string = 'sepolia';

  @IsString()
  @IsOptional()
  blocknativeApiKey?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  requestTimeout: number = 30000;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  maxRetries: number = 3;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  retryDelay: number = 1000;
}

// Predefined network configurations
const PREDEFINED_NETWORKS: NetworkConfig[] = [
  {
    name: 'mainnet',
    displayName: 'Ethereum Mainnet',
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    chainId: 1,
    type: NetworkType.MAINNET,
    category: NetworkCategory.ETHEREUM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://etherscan.io',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 12,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    etherscanApiUrl: 'https://api.etherscan.io/api'
  },
  {
    name: 'sepolia',
    displayName: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    chainId: 11155111,
    type: NetworkType.TESTNET,
    category: NetworkCategory.ETHEREUM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    blockTime: 12,
    gasLimit: 30000000,
    finalityBlocks: 12,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    etherscanApiUrl: 'https://api-sepolia.etherscan.io/api'
  },
  {
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    gasPriceChainId: 1,
    type: NetworkType.L2,
    category: NetworkCategory.ARBITRUM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://arbiscan.io',
    blockTime: 1,
    gasLimit: 32000000,
    parentChain: 'mainnet',
    finalityBlocks: 1
  },
  {
    name: 'arbitrum-sepolia',
    displayName: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.ARBITRUM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    blockTime: 1,
    gasLimit: 32000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'optimism',
    displayName: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    chainId: 10,
    gasPriceChainId: 1,
    type: NetworkType.L2,
    category: NetworkCategory.OPTIMISM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'mainnet',
    finalityBlocks: 1
  },
  {
    name: 'base',
    displayName: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    chainId: 8453,
    gasPriceChainId: 1,
    type: NetworkType.L2,
    category: NetworkCategory.BASE,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://basescan.org',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'mainnet',
    finalityBlocks: 1
  },
  {
    name: 'polygon',
    displayName: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: 137,
    type: NetworkType.L2,
    category: NetworkCategory.POLYGON,
    nativeCurrency: 'MATIC',
    blockExplorerUrl: 'https://polygonscan.com',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'mainnet',
    finalityBlocks: 256
  },
  {
    name: 'zksync-era',
    displayName: 'zkSync Era',
    rpcUrl: process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io',
    chainId: 324,
    gasPriceChainId: 1,
    type: NetworkType.L2,
    category: NetworkCategory.ZKSYNC,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://explorer.zksync.io',
    blockTime: 1,
    gasLimit: 30000000,
    parentChain: 'mainnet',
    finalityBlocks: 1
  },
  {
    name: 'optimism-sepolia',
    displayName: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    chainId: 11155420,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.OPTIMISM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'optimismSepolia',
    displayName: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    chainId: 11155420,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.OPTIMISM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'arbitrumSepolia',
    displayName: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.ARBITRUM,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    blockTime: 1,
    gasLimit: 32000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'base-sepolia',
    displayName: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    chainId: 84532,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.BASE,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'baseSepolia',
    displayName: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    chainId: 84532,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.BASE,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'polygonAmoy',
    displayName: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    chainId: 80002,
    type: NetworkType.TESTNET,
    category: NetworkCategory.POLYGON,
    nativeCurrency: 'MATIC',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    blockTime: 2,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 256
  },
  {
    name: 'polygonZkEvm',
    displayName: 'Polygon zkEVM Testnet',
    rpcUrl: process.env.POLYGON_ZKEVM_RPC_URL || 'https://rpc.public.zkevm-test.net',
    chainId: 1442,
    type: NetworkType.L2,
    category: NetworkCategory.POLYGON,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://testnet-zkevm.polygonscan.com',
    blockTime: 1,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'polygon-zkevm',
    displayName: 'Polygon zkEVM',
    rpcUrl: process.env.POLYGON_ZKEVM_MAINNET_RPC_URL || 'https://zkevm-rpc.com',
    chainId: 1101,
    gasPriceChainId: 1,
    type: NetworkType.L2,
    category: NetworkCategory.POLYGON,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://zkevm.polygonscan.com',
    blockTime: 1,
    gasLimit: 30000000,
    parentChain: 'mainnet',
    finalityBlocks: 1
  },
  {
    name: 'zkSyncSepolia',
    displayName: 'zkSync Era Sepolia',
    rpcUrl: process.env.ZKSYNC_SEPOLIA_RPC_URL || 'https://sepolia.era.zksync.dev',
    chainId: 300,
    gasPriceChainId: 11155111,
    type: NetworkType.L2,
    category: NetworkCategory.ZKSYNC,
    nativeCurrency: 'ETH',
    blockExplorerUrl: 'https://sepolia.explorer.zksync.io',
    blockTime: 1,
    gasLimit: 30000000,
    parentChain: 'sepolia',
    finalityBlocks: 1
  },
  {
    name: 'hardhat',
    displayName: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    type: NetworkType.LOCAL,
    category: NetworkCategory.ETHEREUM,
    nativeCurrency: 'ETH',
    blockTime: 1,
    gasLimit: 30000000,
    finalityBlocks: 1
  }
];

export default registerAs('networks', (): NetworksConfig => {
  const config = plainToClass(NetworksConfig, {
    networks: PREDEFINED_NETWORKS,
    defaultNetwork: process.env.DEFAULT_NETWORK || 'sepolia',
    blocknativeApiKey: process.env.BLOCKNATIVE_API_KEY,
    requestTimeout: parseInt(process.env.NETWORK_REQUEST_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.NETWORK_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.NETWORK_RETRY_DELAY || '1000', 10),
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Network configuration validation failed: ${errorMessages}`);
  }

  return config;
});

export class NetworkConfigService {
  private static networks: Map<string, NetworkConfig> = new Map();
  private static config: NetworksConfig;

  static initialize(config: NetworksConfig) {
    this.config = config;
    this.networks.clear();
    config.networks.forEach(network => {
      this.networks.set(network.name, network);
    });
  }

  static getNetwork(name: string): NetworkConfig | undefined {
    return this.networks.get(name);
  }

  static getAllNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  static getNetworksByType(type: NetworkType): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.type === type);
  }

  static getNetworksByCategory(category: NetworkCategory): NetworkConfig[] {
    return this.getAllNetworks().filter(network => network.category === category);
  }

  static getL2Networks(): NetworkConfig[] {
    return this.getNetworksByType(NetworkType.L2);
  }

  static getMainnetNetworks(): NetworkConfig[] {
    return this.getNetworksByType(NetworkType.MAINNET);
  }

  static getTestnetNetworks(): NetworkConfig[] {
    return this.getNetworksByType(NetworkType.TESTNET);
  }

  static validateNetworks(networkNames: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    networkNames.forEach(name => {
      if (this.networks.has(name)) {
        valid.push(name);
      } else {
        invalid.push(name);
      }
    });

    return { valid, invalid };
  }

  static getDefaultNetwork(): NetworkConfig {
    const defaultName = this.config?.defaultNetwork || 'sepolia';
    const network = this.getNetwork(defaultName);
    if (!network) {
      throw new Error(`Default network '${defaultName}' not found`);
    }
    return network;
  }

  static getConfig(): NetworksConfig {
    return this.config;
  }

  static isLocalNetwork(chainId: number): boolean {
    const network = this.getAllNetworks().find(n => n.chainId === chainId);
    return network?.type === NetworkType.LOCAL;
  }

  static getMainnetChainId(networkKey: string): number {
    const network = this.getNetwork(networkKey);
    if (!network) {
      throw new Error(`Network '${networkKey}' not found`);
    }
    
    // Return the gasPriceChainId if available (for L2s that use mainnet for gas pricing)
    // Otherwise return the network's own chainId
    return network.gasPriceChainId || network.chainId;
  }
}