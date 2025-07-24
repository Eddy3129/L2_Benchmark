import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

// Base service
import { BaseService } from '../../../common/base.service';

// Network configuration (removed dependency on NetworkConfigService)

// DTOs
import { CompilationResultDto, FunctionCallDto } from '../../../common/dto/gas-analysis.dto';

const execAsync = promisify(exec);

interface LiveBenchmarkConfig {
  network: string;
  chainId: number;
  rpcUrl: string;
  alchemyRpcUrl: string;
  blockNumber?: number;
  forkPort: number;
  isActive: boolean;
  provider?: ethers.Provider;
  hardhatProcess?: ChildProcess;
}

interface LiveBenchmarkResult {
  contractAddress: string;
  deploymentCost: {
    gasUsed: number;
    gasPrice: bigint;
    totalCostWei: bigint;
    totalCostEth: string;
    totalCostUsd: number;
  };
  functionCosts: {
    functionName: string;
    gasUsed: number;
    gasPrice: bigint;
    totalCostWei: bigint;
    totalCostEth: string;
    totalCostUsd: number;
    l1DataCost?: number; // For L2s
    l2ExecutionCost?: number; // For L2s
  }[];
  feeComposition: {
    baseFee: bigint;
    priorityFee: bigint;
    maxFeePerGas: bigint;
    gasPrice: bigint;
    l1DataFee?: bigint; // For L2s
  };
  networkMetrics: {
    blockNumber: number;
    blockTimestamp: number;
    gasLimit: bigint;
    gasUsed: bigint;
    baseFeePerGas: bigint;
  };
  success: boolean;
  error?: string;
  executionTime: number;
}

interface GasPriceData {
  baseFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  gasPrice: bigint;
}

@Injectable()
export class LiveBenchmarkerService extends BaseService<any> {
  private readonly activeBenchmarks = new Map<string, LiveBenchmarkConfig>();
  private readonly hardhatProjectRoot = path.join(process.cwd(), '..', 'hardhat');
  private readonly basePort = 8545;
  private portCounter = 0;
  private readonly ethPriceUsd = 3720; // This should be fetched from an API in production

  constructor(
    private readonly configService: ConfigService
  ) {
    super();
  }

  /**
   * Creates a live benchmark session by forking the specified network
   */
  async createLiveBenchmark(
    networkName: string,
    blockNumber?: number
  ): Promise<LiveBenchmarkConfig> {
    const benchmarkKey = `${networkName}_${blockNumber || 'latest'}`;
    
    // Return existing benchmark if available
    if (this.activeBenchmarks.has(benchmarkKey)) {
      const existingBenchmark = this.activeBenchmarks.get(benchmarkKey)!;
      if (existingBenchmark.isActive) {
        this.logger.log(`Reusing existing live benchmark for ${networkName}`);
        return existingBenchmark;
      }
    }

    const networkConfig = await this.getNetworkConfig(networkName);
    const alchemyRpcUrl = this.buildAlchemyRpcUrl(networkConfig);
    
    this.logger.log(`Creating live benchmark for ${networkName}:`);
    this.logger.log(`- Network: ${networkConfig.name}`);
    this.logger.log(`- Chain ID: ${networkConfig.chainId}`);
    this.logger.log(`- RPC URL: ${alchemyRpcUrl}`);
    
    const forkPort = this.basePort + this.portCounter++;
    const benchmarkConfig: LiveBenchmarkConfig = {
      network: networkConfig.name,
      chainId: networkConfig.chainId,
      rpcUrl: networkConfig.rpcUrl,
      alchemyRpcUrl,
      blockNumber,
      forkPort,
      isActive: false
    };

    try {
      // Start Hardhat fork with the network's mainnet
      await this.startHardhatFork(benchmarkConfig);
      
      // Create provider for the forked network
      const localProviderUrl = `http://127.0.0.1:${forkPort}`;
      this.logger.log(`Creating local provider: ${localProviderUrl}`);
      
      benchmarkConfig.provider = new ethers.JsonRpcProvider(localProviderUrl);
      
      // Test the provider connection
      try {
        const blockNumber = await benchmarkConfig.provider.getBlockNumber();
        this.logger.log(`Provider connected successfully, current block: ${blockNumber}`);
      } catch (providerError) {
        this.logger.error(`Provider connection failed: ${providerError.message}`);
        throw providerError;
      }
      
      benchmarkConfig.isActive = true;
      
      this.activeBenchmarks.set(benchmarkKey, benchmarkConfig);
      this.logger.log(`Created live benchmark for ${networkName} on port ${forkPort}`);
      
      return benchmarkConfig;
    } catch (error) {
      this.logger.error(`Failed to create live benchmark for ${networkName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Runs a comprehensive live benchmark including deployment and function calls
   */
  async runLiveBenchmark(
    benchmarkConfig: LiveBenchmarkConfig,
    compilation: CompilationResultDto,
    functionCalls: FunctionCallDto[] = [],
    constructorArgs: any[] = [],
    existingContractAddress?: string
  ): Promise<LiveBenchmarkResult> {
    const startTime = Date.now();
    
    if (!benchmarkConfig.provider || !benchmarkConfig.isActive) {
      throw new Error('Live benchmark is not active or provider not available');
    }

    try {
      // Get real-time gas price data
      const gasPriceData = await this.getRealTimeGasPrice(benchmarkConfig);
      
      // Get network metrics
      const networkMetrics = await this.getNetworkMetrics(benchmarkConfig.provider);
      
      let deploymentResult;
      let contractAddress: string;
      
      if (existingContractAddress) {
        // Use existing contract, skip deployment
        contractAddress = existingContractAddress;
        deploymentResult = {
          contractAddress: existingContractAddress,
          gasUsed: 0,
          gasPrice: 0n,
          totalCostWei: 0n,
          totalCostEth: '0',
          totalCostUsd: 0
        };
      } else {
        // Deploy contract and measure costs
        deploymentResult = await this.benchmarkDeployment(
          benchmarkConfig,
          compilation,
          constructorArgs,
          gasPriceData
        );
        contractAddress = deploymentResult.contractAddress;
      }
      
      // Benchmark function calls
      const functionResults = await this.benchmarkFunctionCalls(
        benchmarkConfig,
        compilation,
        functionCalls,
        contractAddress,
        gasPriceData
      );
      
      const executionTime = Date.now() - startTime;
      
      return {
        contractAddress,
        deploymentCost: deploymentResult,
        functionCosts: functionResults,
        feeComposition: {
          baseFee: gasPriceData.baseFeePerGas,
          priorityFee: gasPriceData.maxPriorityFeePerGas,
          maxFeePerGas: gasPriceData.maxFeePerGas,
          gasPrice: gasPriceData.gasPrice,
          l1DataFee: await this.calculateL1DataFee(benchmarkConfig, compilation.bytecode)
        },
        networkMetrics,
        success: true,
        executionTime
      };
    } catch (error) {
      this.logger.error(`Live benchmark failed: ${error.message}`);
      return {
        contractAddress: '',
        deploymentCost: {
          gasUsed: 0,
          gasPrice: 0n,
          totalCostWei: 0n,
          totalCostEth: '0',
          totalCostUsd: 0
        },
        functionCosts: [],
        feeComposition: {
          baseFee: 0n,
          priorityFee: 0n,
          maxFeePerGas: 0n,
          gasPrice: 0n
        },
        networkMetrics: {
          blockNumber: 0,
          blockTimestamp: 0,
          gasLimit: 0n,
          gasUsed: 0n,
          baseFeePerGas: 0n
        },
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Benchmarks contract deployment with real-time gas prices
   */
  private async benchmarkDeployment(
    benchmarkConfig: LiveBenchmarkConfig,
    compilation: CompilationResultDto,
    constructorArgs: any[],
    gasPriceData: GasPriceData
  ) {
    const signer = await this.getImpersonatedSigner(benchmarkConfig.provider!);
    
    // Create contract factory
    const factory = new ethers.ContractFactory(
      compilation.abi,
      compilation.bytecode,
      signer
    );

    // Deploy with real-time gas price
    const contract = await factory.deploy(...constructorArgs, {
      maxFeePerGas: gasPriceData.maxFeePerGas,
      maxPriorityFeePerGas: gasPriceData.maxPriorityFeePerGas
    });
    
    const deploymentTx = contract.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    const gasUsed = Number(receipt.gasUsed);
    const effectiveGasPrice = receipt.gasPrice || gasPriceData.gasPrice;
    const totalCostWei = BigInt(gasUsed) * effectiveGasPrice;
    const totalCostEth = ethers.formatEther(totalCostWei);
    const totalCostUsd = parseFloat(totalCostEth) * this.ethPriceUsd;

    const contractAddress = await contract.getAddress();

    return {
      contractAddress,
      gasUsed,
      gasPrice: effectiveGasPrice,
      totalCostWei,
      totalCostEth,
      totalCostUsd
    };
  }

  /**
   * Benchmarks function calls with real-time gas prices
   */
  private async benchmarkFunctionCalls(
    benchmarkConfig: LiveBenchmarkConfig,
    compilation: CompilationResultDto,
    functionCalls: FunctionCallDto[],
    contractAddress: string,
    gasPriceData: GasPriceData
  ): Promise<Array<{
    functionName: string;
    gasUsed: number;
    gasPrice: bigint;
    totalCostWei: bigint;
    totalCostEth: string;
    totalCostUsd: number;
    l1DataCost?: number;
    l2ExecutionCost?: number;
  }>> {
    if (functionCalls.length === 0) {
      return [];
    }

    const signer = await this.getImpersonatedSigner(benchmarkConfig.provider!);
    
    // Connect to existing contract
    const contract = new ethers.Contract(
      contractAddress,
      compilation.abi,
      signer
    );

    const results: Array<{
      functionName: string;
      gasUsed: number;
      gasPrice: bigint;
      totalCostWei: bigint;
      totalCostEth: string;
      totalCostUsd: number;
      l1DataCost?: number;
      l2ExecutionCost?: number;
    }> = [];
    
    for (const functionCall of functionCalls) {
      try {
        const functionParams = functionCall.parameters || [];
        
        // Execute function call with real-time gas price
        const tx = await contract[functionCall.functionName](...functionParams, {
          maxFeePerGas: gasPriceData.maxFeePerGas,
          maxPriorityFeePerGas: gasPriceData.maxPriorityFeePerGas
        });
        
        const receipt = await tx.wait();
        const gasUsed = Number(receipt.gasUsed);
        const effectiveGasPrice = receipt.gasPrice || gasPriceData.gasPrice;
        const totalCostWei = BigInt(gasUsed) * effectiveGasPrice;
        const totalCostEth = ethers.formatEther(totalCostWei);
        const totalCostUsd = parseFloat(totalCostEth) * this.ethPriceUsd;

        // Calculate L2-specific costs if applicable
        const l1DataCost = await this.calculateL1DataCost(benchmarkConfig, tx.data);
        const l2ExecutionCost = gasUsed - (l1DataCost || 0);

        results.push({
          functionName: functionCall.functionName,
          gasUsed,
          gasPrice: effectiveGasPrice,
          totalCostWei,
          totalCostEth,
          totalCostUsd,
          l1DataCost,
          l2ExecutionCost
        });
      } catch (error) {
        this.logger.warn(`Function ${functionCall.functionName} benchmark failed: ${error.message}`);
        results.push({
          functionName: functionCall.functionName,
          gasUsed: 0,
          gasPrice: 0n,
          totalCostWei: 0n,
          totalCostEth: '0',
          totalCostUsd: 0
        });
      }
    }

    return results;
  }

  /**
   * Gets real-time gas price data from the live network
   */
  private async getRealTimeGasPrice(benchmarkConfig: LiveBenchmarkConfig): Promise<GasPriceData> {
    try {
      // Use Alchemy's enhanced API for gas price data
      const response = await axios.post(benchmarkConfig.alchemyRpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      });

      const gasPrice = BigInt(response.data.result);
      
      // Get fee data for EIP-1559 networks
      const liveProvider = new ethers.JsonRpcProvider(benchmarkConfig.alchemyRpcUrl);
      const feeData = await liveProvider.getFeeData();
      
      return {
        baseFeePerGas: feeData.gasPrice || gasPrice,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || gasPrice / 10n,
        maxFeePerGas: feeData.maxFeePerGas || gasPrice,
        gasPrice
      };
    } catch (error) {
      this.logger.warn(`Failed to get real-time gas price: ${error.message}`);
      // Fallback to forked network gas price
      const feeData = await benchmarkConfig.provider!.getFeeData();
      return {
        baseFeePerGas: feeData.gasPrice || 20000000000n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 2000000000n,
        maxFeePerGas: feeData.maxFeePerGas || 22000000000n,
        gasPrice: feeData.gasPrice || 20000000000n
      };
    }
  }

  /**
   * Gets current network metrics
   */
  private async getNetworkMetrics(provider: ethers.Provider) {
    const latestBlock = await provider.getBlock('latest');
    if (!latestBlock) {
      throw new Error('Could not fetch latest block');
    }

    return {
      blockNumber: latestBlock.number,
      blockTimestamp: latestBlock.timestamp,
      gasLimit: latestBlock.gasLimit,
      gasUsed: latestBlock.gasUsed,
      baseFeePerGas: latestBlock.baseFeePerGas || 0n
    };
  }

  /**
   * Calculates L1 data cost for Layer 2 transactions
   */
  private async calculateL1DataCost(
    benchmarkConfig: LiveBenchmarkConfig,
    transactionData: string
  ): Promise<number | undefined> {
    // Only calculate for L2 networks
    if (!this.isLayer2Network(benchmarkConfig.network)) {
      return undefined;
    }

    // Calculate calldata cost (16 gas per non-zero byte, 4 gas per zero byte)
    let calldataGas = 0;
    const data = transactionData.startsWith('0x') ? transactionData.slice(2) : transactionData;
    
    for (let i = 0; i < data.length; i += 2) {
      const byte = data.substr(i, 2);
      if (byte === '00') {
        calldataGas += 4;
      } else {
        calldataGas += 16;
      }
    }

    // Add fixed overhead for transaction
    const fixedOverhead = 21000;
    const totalL1Gas = calldataGas + fixedOverhead;

    // Apply L2-specific multipliers
    let multiplier = 1.0;
    const networkName = benchmarkConfig.network.toLowerCase();
    
    if (networkName.includes('arbitrum')) {
      multiplier = 1.5;
    } else if (networkName.includes('optimism') || networkName.includes('base')) {
      multiplier = 1.24;
    } else if (networkName.includes('scroll')) {
      multiplier = 1.2;
    } else if (networkName.includes('ink')) {
      multiplier = 1.24;
    } else if (networkName.includes('linea')) {
      multiplier = 1.1;
    } else if (networkName.includes('polygon')) {
      multiplier = 0.1;
    }

    return Math.floor(totalL1Gas * multiplier);
  }

  /**
   * Calculates L1 data fee for Layer 2 transactions
   */
  private async calculateL1DataFee(
    benchmarkConfig: LiveBenchmarkConfig,
    bytecode: string
  ): Promise<bigint | undefined> {
    const l1DataCost = await this.calculateL1DataCost(benchmarkConfig, bytecode);
    if (!l1DataCost) {
      return undefined;
    }

    // Get L1 gas price (this would typically come from the L1 network)
    const l1GasPrice = 20000000000n; // 20 gwei - should be fetched from L1 in production
    
    return BigInt(l1DataCost) * l1GasPrice;
  }

  /**
   * Checks if a network is Layer 2
   */
  private isLayer2Network(networkName: string): boolean {
    const l2Networks = ['arbitrum', 'optimism', 'base', 'scroll', 'linea', 'ink', 'polygon'];
    return l2Networks.some(l2 => networkName.toLowerCase().includes(l2));
  }

  /**
   * Network configurations with direct environment variable access
   */
  private readonly networkConfigs: Record<string, { rpcUrl: string; chainId: number }> = {
    // Testnet configurations
    'sepolia': {
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
      chainId: 11155111
    },
    'arbitrum-sepolia': {
      rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/demo',
      chainId: 421614
    },
    'optimism-sepolia': {
      rpcUrl: process.env.OP_SEPOLIA_RPC_URL || 'https://opt-sepolia.g.alchemy.com/v2/demo',
      chainId: 11155420
    },
    'base-sepolia': {
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/demo',
      chainId: 84532
    },
    'polygon-amoy': {
      rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/demo',
      chainId: 80002
    },
    
    // Mainnet configurations
    'mainnet': {
      rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      chainId: 1
    },
    'arbitrum': {
      rpcUrl: process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
      chainId: 42161
    },
    'optimism': {
      rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/demo',
      chainId: 10
    },
    'base': {
      rpcUrl: process.env.BASE_MAINNET_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/demo',
      chainId: 8453
    },
    'polygon': {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      chainId: 137
    }
  };

  /**
   * Builds Alchemy RPC URL for the network
   */
  private buildAlchemyRpcUrl(networkConfig: { name: string; rpcUrl: string }): string {
    // Return the configured RPC URL directly (already includes Alchemy URLs)
    return networkConfig.rpcUrl;
  }

  /**
   * Gets network configuration
   */
  private async getNetworkConfig(networkName: string): Promise<{ name: string; chainId: number; rpcUrl: string }> {
    const config = this.networkConfigs[networkName];
    
    if (!config) {
      throw new Error(`Network ${networkName} not found`);
    }
    
    return {
      name: networkName,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl
    };
  }

  /**
   * Starts a Hardhat fork process for live benchmarking
   */
  private async startHardhatFork(benchmarkConfig: LiveBenchmarkConfig): Promise<void> {
    const optimalBlock = await this.getOptimalForkBlock(benchmarkConfig);
    const forkUrl = benchmarkConfig.alchemyRpcUrl;
    
    this.logger.log(`Starting Hardhat fork:`);
    this.logger.log(`- Fork URL: ${forkUrl}`);
    this.logger.log(`- Block Number: ${optimalBlock}`);
    this.logger.log(`- Fork Port: ${benchmarkConfig.forkPort}`);
    this.logger.log(`- Hardhat Project Root: ${this.hardhatProjectRoot}`);
    
    // Set environment variables for Hardhat config
    process.env.FORK_URL = forkUrl;
    process.env.FORK_BLOCK_NUMBER = optimalBlock.toString();
    
    const command = 'npx';
    const args = [
      'hardhat',
      'node',
      '--port',
      benchmarkConfig.forkPort.toString(),
      '--hostname',
      '127.0.0.1'
    ];
    
    this.logger.log(`- Command: ${command} ${args.join(' ')}`);
    
    try {
      // Start the fork process
      const hardhatProcess = spawn(command, args, {
        cwd: this.hardhatProjectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
        shell: true
      });
      
      benchmarkConfig.hardhatProcess = hardhatProcess;
      
      // Handle process output
      // hardhatProcess.stdout?.on('data', (data) => {
      //   this.logger.debug(`Hardhat fork stdout: ${data}`);
      // });
      
      hardhatProcess.stderr?.on('data', (data) => {
        this.logger.warn(`Hardhat fork stderr: ${data}`);
      });
      
      hardhatProcess.on('error', (error) => {
        this.logger.error(`Hardhat fork process error: ${error.message}`);
      });
      
      // Wait for the fork to be ready
      await this.waitForForkReady(benchmarkConfig.forkPort);
      
    } catch (error) {
      throw new Error(`Failed to start Hardhat fork: ${error.message}`);
    }
  }

  /**
   * Waits for the fork to be ready
   */
  private async waitForForkReady(port: number, maxAttempts: number = 15): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`);
        await provider.getBlockNumber();
        return; // Fork is ready
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Fork not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      }
    }
  }

  /**
   * Gets an impersonated signer with funds
   */
  private async getImpersonatedSigner(provider: ethers.Provider): Promise<ethers.Signer> {
    // Use a well-known address with funds (like Vitalik's address)
    const impersonatedAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    
    try {
      const jsonRpcProvider = provider as ethers.JsonRpcProvider;
      
      // Impersonate the account
      await jsonRpcProvider.send('hardhat_impersonateAccount', [impersonatedAddress]);
      
      // Fund the account if needed
      await jsonRpcProvider.send('hardhat_setBalance', [
        impersonatedAddress,
        '0x21E19E0C9BAB2400000' // 10,000 ETH
      ]);
      
      return await jsonRpcProvider.getSigner(impersonatedAddress);
    } catch (error) {
      // Fallback to the first available signer
      const jsonRpcProvider = provider as ethers.JsonRpcProvider;
      const accounts = await jsonRpcProvider.listAccounts();
      if (accounts.length > 0) {
        return await jsonRpcProvider.getSigner(accounts[0].address);
      }
      throw new Error('No signers available');
    }
  }

  /**
   * Gets the optimal block number for forking (recent but stable)
   */
  private async getOptimalForkBlock(benchmarkConfig: LiveBenchmarkConfig): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(benchmarkConfig.alchemyRpcUrl);
      const latestBlock = await provider.getBlockNumber();
      
      // Use a block that's a few blocks behind for stability
      const stableBlock = Math.max(latestBlock - 10, 0);
      
      return benchmarkConfig.blockNumber || stableBlock;
    } catch (error) {
      this.logger.warn(`Could not get optimal fork block: ${error.message}`);
      return benchmarkConfig.blockNumber || 0;
    }
  }

  /**
   * Cleans up a specific live benchmark
   */
  async cleanupLiveBenchmark(benchmarkKey: string): Promise<void> {
    const benchmark = this.activeBenchmarks.get(benchmarkKey);
    if (benchmark && benchmark.isActive) {
      try {
        // Stop the Hardhat fork process
        if (benchmark.hardhatProcess) {
          benchmark.hardhatProcess.kill('SIGTERM');
        }
        
        benchmark.isActive = false;
        this.activeBenchmarks.delete(benchmarkKey);
        this.logger.log(`Cleaned up live benchmark for ${benchmark.network}`);
      } catch (error) {
        this.logger.warn(`Failed to cleanup live benchmark: ${error.message}`);
      }
    }
  }

  /**
   * Cleans up all active live benchmarks
   */
  async cleanupAllLiveBenchmarks(): Promise<void> {
    const cleanupPromises = Array.from(this.activeBenchmarks.keys()).map(key => 
      this.cleanupLiveBenchmark(key)
    );
    await Promise.all(cleanupPromises);
  }

  /**
   * Gets active benchmark sessions
   */
  getActiveBenchmarks(): LiveBenchmarkConfig[] {
    return Array.from(this.activeBenchmarks.values()).filter(b => b.isActive);
  }
}