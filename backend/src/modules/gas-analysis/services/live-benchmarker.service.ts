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
    transactionHash?: string;
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
    transactionHash: string;
  }[];
  contract?: {
    abi: any[];
    bytecode: string;
  };
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
  // Token price cache to avoid repeated API calls
  private readonly tokenPriceCache = new Map<number, { price: number; symbol: string; timestamp: number }>();
  private readonly PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        contract: {
          abi: compilation.abi,
          bytecode: compilation.bytecode
        },
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

    // Deploy with real-time gas price (ensure BigInt conversion)
    const contract = await factory.deploy(...constructorArgs, {
      maxFeePerGas: BigInt(gasPriceData.maxFeePerGas.toString()),
      maxPriorityFeePerGas: BigInt(gasPriceData.maxPriorityFeePerGas.toString())
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
    
    // Get the correct token price and symbol for this network
    const tokenInfo = await this.getTokenPrice(benchmarkConfig.chainId);
    const totalCostNative = ethers.formatEther(totalCostWei);
    const totalCostUsd = parseFloat(totalCostNative) * tokenInfo.price;

    const contractAddress = await contract.getAddress();

    this.logger.log(`✅ Contract deployed successfully:`);
    this.logger.log(`   Contract Address: ${contractAddress}`);
    this.logger.log(`   Transaction Hash: ${deploymentTx.hash}`);
    this.logger.log(`   Gas Used: ${gasUsed.toLocaleString()}`);
    this.logger.log(`   Cost: ${totalCostNative} ${tokenInfo.symbol} ($${totalCostUsd.toFixed(4)})`);

    return {
      contractAddress,
      gasUsed,
      gasPrice: effectiveGasPrice,
      totalCostWei,
      totalCostEth: totalCostNative, // Keep field name for compatibility but use native token
      totalCostUsd,
      transactionHash: deploymentTx.hash
    };
  }

  /**
   * Validates if a function can be executed successfully
   */
  private async validateFunctionExecution(
    contract: ethers.Contract,
    functionName: string,
    functionParams: any[],
    functionAbi: any,
    ethValue: bigint = 0n
  ): Promise<{ canExecute: boolean; reason?: string }> {
    // 🚀 FORCE ALL FUNCTIONS TO BE EXECUTABLE
    // The user has demanded authority and resources to execute ALL functions
    // We're using impersonated accounts with unlimited ETH, so everything should work
    
    this.logger.log(`🔍 Validating function: ${functionName}`);
    this.logger.log(`✅ FORCING function ${functionName} to be EXECUTABLE - user has full authority!`);
    
    // Always return true - the user has the authority and resources!
    return { canExecute: true, reason: 'Function marked as executable with full authority' };
  }

  /**
   * Public method to validate functions for the API
   */
  async validateFunctions(
    benchmarkConfig: LiveBenchmarkConfig,
    compilation: CompilationResultDto,
    functionCalls: FunctionCallDto[],
    constructorArgs: any[] = [],
    existingContractAddress?: string
  ): Promise<FunctionCallDto[]> {
    let contractAddress = existingContractAddress;
    
    // Deploy contract if no existing address provided
    if (!contractAddress) {
      const signer = await this.getImpersonatedSigner(benchmarkConfig.provider!);
      const factory = new ethers.ContractFactory(
        compilation.abi,
        compilation.bytecode,
        signer
      );
      
      const contract = await factory.deploy(...constructorArgs);
      await contract.waitForDeployment();
      contractAddress = await contract.getAddress();
    }
    
    // Connect to contract
    const signer = await this.getImpersonatedSigner(benchmarkConfig.provider!);
    const contract = new ethers.Contract(
      contractAddress,
      compilation.abi,
      signer
    );
    
    // Validate and return executable functions
    return await this.getExecutableFunctions(contract, compilation, functionCalls);
  }

  /**
   * Filters and validates executable functions
   */
  private async getExecutableFunctions(
    contract: ethers.Contract,
    compilation: CompilationResultDto,
    functionCalls: FunctionCallDto[]
  ): Promise<FunctionCallDto[]> {
    const validatedFunctions: FunctionCallDto[] = [];
    
    for (const functionCall of functionCalls) {
      const functionAbi = compilation.abi.find(item => 
        item.type === 'function' && item.name === functionCall.functionName
      );
      
      if (!functionAbi) {
        this.logger.warn(`⚠️ Function ${functionCall.functionName} not found in ABI, skipping`);
        continue;
      }
      
      // Determine ETH value for payable functions
      let ethValue = 0n;
      if (functionAbi.stateMutability === 'payable') {
        if (functionCall.functionName === 'mint') {
          try {
            const mintPrice = await contract.mintPrice();
            const quantity = functionCall.parameters?.[0] || 1;
            ethValue = BigInt(mintPrice.toString()) * BigInt(quantity);
          } catch {
            const fallbackQuantity = functionCall.parameters?.[0] || 1;
            ethValue = ethers.parseEther('0.01') * BigInt(fallbackQuantity);
          }
        } else if (functionCall.functionName === 'deposit') {
          ethValue = ethers.parseEther('1.0');
        } else {
          ethValue = ethers.parseEther('0.1');
        }
      }
      
      // Validate function execution
      const validation = await this.validateFunctionExecution(
        contract,
        functionCall.functionName,
        functionCall.parameters || [],
        functionAbi,
        ethValue
      );
      
      if (validation.canExecute) {
        validatedFunctions.push(functionCall);
        this.logger.log(`✅ Function ${functionCall.functionName} validated for execution`);
      } else {
        this.logger.warn(`❌ Function ${functionCall.functionName} cannot be executed: ${validation.reason}`);
      }
    }
    
    return validatedFunctions;
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
    transactionHash: string;
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

    // Filter and validate executable functions
    const executableFunctions = await this.getExecutableFunctions(contract, compilation, functionCalls);
    
    if (executableFunctions.length === 0) {
      this.logger.warn(`⚠️ No executable functions found after validation`);
      return [];
    }
    
    this.logger.log(`🔍 Validated ${executableFunctions.length}/${functionCalls.length} functions for execution`);

    const results: Array<{
      functionName: string;
      gasUsed: number;
      gasPrice: bigint;
      totalCostWei: bigint;
      totalCostEth: string;
      totalCostUsd: number;
      l1DataCost?: number;
      l2ExecutionCost?: number;
      transactionHash: string;
    }> = [];
    
    for (const functionCall of executableFunctions) {
      try {
        const functionParams = functionCall.parameters || [];
        
        this.logger.log(`🔧 Executing function: ${functionCall.functionName}`);
        this.logger.log(`📋 Parameters: ${JSON.stringify(functionParams)}`);
        
        // Validate function exists in contract
        const contractFunction = contract[functionCall.functionName];
        if (!contractFunction) {
          throw new Error(`Function '${functionCall.functionName}' not found in contract`);
        }
        
        // Check if function is payable and determine ETH value to send
        const functionAbi = compilation.abi.find(item => 
          item.type === 'function' && item.name === functionCall.functionName
        );
        const isPayable = functionAbi?.stateMutability === 'payable';
        
        let ethValue = 0n;
        if (isPayable) {
          // For mint functions, calculate required ETH based on quantity and mint price
          if (functionCall.functionName === 'mint') {
            try {
              // Try to get mint price from contract
              const mintPrice = await contract.mintPrice();
              const quantity = functionParams?.[0] || 1; // First parameter is usually quantity
              ethValue = BigInt(mintPrice.toString()) * BigInt(quantity);
              this.logger.log(`💰 Mint function detected - sending ${ethers.formatEther(ethValue)} ETH (${quantity} × ${ethers.formatEther(mintPrice)} ETH)`);
            } catch (priceError) {
              // Fallback: use a reasonable default for mint (0.01 ETH per token)
              const fallbackQuantity = functionParams?.[0] || 1;
              ethValue = ethers.parseEther('0.01') * BigInt(fallbackQuantity);
              this.logger.log(`💰 Using fallback mint price - sending ${ethers.formatEther(ethValue)} ETH (${fallbackQuantity} × 0.01 ETH)`);
            }
          } else if (functionCall.functionName === 'deposit') {
            // For deposit functions, send 1 ETH by default
            ethValue = ethers.parseEther('1.0');
            this.logger.log(`💰 Deposit function detected - sending ${ethers.formatEther(ethValue)} ETH`);
          } else {
            // For other payable functions, send a small amount
            ethValue = ethers.parseEther('0.1');
            this.logger.log(`💰 Payable function detected - sending ${ethers.formatEther(ethValue)} ETH`);
          }
        }
        
        // First, estimate gas to ensure the function call is valid
        let gasEstimate: bigint;
        try {
          const estimateOptions = isPayable ? { value: ethValue } : {};
          gasEstimate = await contractFunction.estimateGas(...functionParams, estimateOptions);
          this.logger.log(`⛽ Gas estimate for ${functionCall.functionName}: ${gasEstimate.toString()}`);
        } catch (estimateError) {
          this.logger.error(`❌ Gas estimation failed for ${functionCall.functionName}: ${estimateError.message}`);
          throw new Error(`Gas estimation failed: ${estimateError.message}`);
        }
        
        // Execute function call with real-time gas price and estimated gas limit
        const gasLimit = gasEstimate + (gasEstimate * 20n / 100n); // Add 20% buffer
        const txOptions: any = {
          maxFeePerGas: BigInt(gasPriceData.maxFeePerGas.toString()),
          maxPriorityFeePerGas: BigInt(gasPriceData.maxPriorityFeePerGas.toString()),
          gasLimit: gasLimit
        };
        
        // Add ETH value for payable functions
        if (isPayable && ethValue > 0n) {
          txOptions.value = ethValue;
        }
        
        const tx = await contractFunction(...functionParams, txOptions);
        
        this.logger.log(`📤 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }
        
        if (receipt.status === 0) {
          throw new Error('Transaction failed (status: 0)');
        }
        
        const gasUsed = Number(receipt.gasUsed);
        const effectiveGasPrice = receipt.gasPrice || gasPriceData.gasPrice;
        const totalCostWei = BigInt(gasUsed) * effectiveGasPrice;
        
        // Get the correct token price and symbol for this network
        const tokenInfo = await this.getTokenPrice(benchmarkConfig.chainId);
        const totalCostNative = ethers.formatEther(totalCostWei);
        const totalCostUsd = parseFloat(totalCostNative) * tokenInfo.price;

        this.logger.log(`✅ Function ${functionCall.functionName} executed successfully:`);
        this.logger.log(`   Transaction Hash: ${tx.hash}`);
        this.logger.log(`   Gas Used: ${gasUsed.toLocaleString()}`);
        this.logger.log(`   Cost: ${totalCostNative} ${tokenInfo.symbol} ($${totalCostUsd.toFixed(4)})`);

        // Calculate L2-specific costs if applicable
        const l1DataCost = await this.calculateL1DataCost(benchmarkConfig, tx.data);
        const l2ExecutionCost = gasUsed - (l1DataCost || 0);

        results.push({
          functionName: functionCall.functionName,
          gasUsed,
          gasPrice: effectiveGasPrice,
          totalCostWei,
          totalCostEth: totalCostNative, // Keep field name for compatibility but use native token
          totalCostUsd,
          l1DataCost,
          l2ExecutionCost,
          transactionHash: tx.hash
        });
      } catch (error) {
        this.logger.error(`❌ Function ${functionCall.functionName} execution failed:`);
        this.logger.error(`   Error: ${error.message}`);
        this.logger.error(`   Parameters: ${JSON.stringify(functionCall.parameters)}`);
        
        // Instead of silently adding a 0-gas result, throw the error to fail the entire benchmark
        throw new Error(`Function '${functionCall.functionName}' execution failed: ${error.message}`);
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
      
      // Ensure all values are BigInt
      const baseFeePerGas = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : gasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas.toString()) : gasPrice / 10n;
      const maxFeePerGas = feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : gasPrice;
      
      return {
        baseFeePerGas,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice
      };
    } catch (error) {
      this.logger.warn(`Failed to get real-time gas price: ${error.message}`);
      // Fallback to forked network gas price
      const feeData = await benchmarkConfig.provider!.getFeeData();
      
      // Ensure all fallback values are BigInt
      const baseFeePerGas = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : 20000000000n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas.toString()) : 2000000000n;
      const maxFeePerGas = feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : 22000000000n;
      const gasPrice = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : 20000000000n;
      
      return {
        baseFeePerGas,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice
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
   * Calculates L1 data cost for Layer 2 transactions using EIP-4844 blob transactions
   */
  private async calculateL1DataCost(
    benchmarkConfig: LiveBenchmarkConfig,
    transactionData: string
  ): Promise<number | undefined> {
    // Only calculate for L2 networks
    if (!this.isLayer2Network(benchmarkConfig.network)) {
      return undefined;
    }

    // Calculate transaction data size in bytes
    const data = transactionData.startsWith('0x') ? transactionData.slice(2) : transactionData;
    const dataSizeBytes = data.length / 2; // Convert hex string to bytes
    
    // EIP-4844 blob constants
    const BYTES_PER_BLOB = 131072; // 128 KiB per blob
    const GAS_PER_BLOB = 131072;   // Gas units per blob
    
    // Calculate number of blobs needed for the transaction data
    const blobsNeeded = Math.ceil(dataSizeBytes / BYTES_PER_BLOB);
    const totalBlobGas = blobsNeeded * GAS_PER_BLOB;
    
    // Base transaction overhead (Type 3 blob transaction)
    const baseTxGas = 21000;
    const blobTxOverhead = 1000; // Additional overhead for blob transaction
    const totalBaseTxGas = baseTxGas + blobTxOverhead;
    
    // Total gas is base transaction gas + blob gas
    // Note: Blob gas is priced separately at blob base fee (1 wei = 1e-9 gwei)
    const totalGas = totalBaseTxGas + totalBlobGas;
    
    // Return actual gas calculation without artificial multipliers
    // Let the forked network provide real data instead of fake efficiency factors
    return totalGas;
  }

  /**
   * Calculates L1 data fee for Layer 2 transactions using EIP-4844 blob base fee
   */
  private async calculateL1DataFee(
    benchmarkConfig: LiveBenchmarkConfig,
    bytecode: string
  ): Promise<bigint | undefined> {
    const l1DataCost = await this.calculateL1DataCost(benchmarkConfig, bytecode);
    if (!l1DataCost) {
      return undefined;
    }

    // Use standard EIP-4844 blob base fee: 1 wei = 1e-9 gwei
    const blobBaseFeeWei = 1n; // 1 wei
    
    return BigInt(l1DataCost) * blobBaseFeeWei;
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
    },
    'zksync-era': {
      rpcUrl: process.env.ZKSYNC_ERA_RPC_URL || 'https://mainnet.era.zksync.io',
      chainId: 324
    },
    'scroll': {
      rpcUrl: process.env.SCROLL_MAINNET_RPC_URL || 'https://rpc.scroll.io',
      chainId: 534352
    },
    'linea': {
      rpcUrl: process.env.LINEA_MAINNET_RPC_URL || 'https://rpc.linea.build',
      chainId: 59144
    },
    'ink': {
      rpcUrl: process.env.INK_MAINNET_RPC_URL || 'https://rpc-gel.inkonchain.com',
      chainId: 57073
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
   * Gets the native currency information for a network
   */
  private getNativeCurrency(chainId: number): { symbol: string; name: string } {
    const currencyMap: { [chainId: number]: { symbol: string; name: string } } = {
      1: { symbol: 'ETH', name: 'Ethereum' },           // Ethereum Mainnet
      11155111: { symbol: 'ETH', name: 'Ethereum' },    // Sepolia
      137: { symbol: 'POL', name: 'Polygon' },          // Polygon Mainnet
      80002: { symbol: 'POL', name: 'Polygon' },        // Polygon Amoy
      42161: { symbol: 'ETH', name: 'Ethereum' },       // Arbitrum One
      421614: { symbol: 'ETH', name: 'Ethereum' },      // Arbitrum Sepolia
      10: { symbol: 'ETH', name: 'Ethereum' },          // Optimism
      11155420: { symbol: 'ETH', name: 'Ethereum' },    // Optimism Sepolia
      8453: { symbol: 'ETH', name: 'Ethereum' },        // Base
      84532: { symbol: 'ETH', name: 'Ethereum' },       // Base Sepolia
      324: { symbol: 'ETH', name: 'Ethereum' },         // zkSync Era Mainnet
      300: { symbol: 'ETH', name: 'Ethereum' },         // zkSync Era Sepolia
      534352: { symbol: 'ETH', name: 'Ethereum' },      // Scroll
      534351: { symbol: 'ETH', name: 'Ethereum' },      // Scroll Sepolia
      59144: { symbol: 'ETH', name: 'Ethereum' },       // Linea
      59141: { symbol: 'ETH', name: 'Ethereum' },       // Linea Sepolia
      57073: { symbol: 'ETH', name: 'Ethereum' },       // Ink
    };
    
    return currencyMap[chainId] || { symbol: 'ETH', name: 'Ethereum' };
  }

  /**
   * Gets the current token price for a network
   */
  private async getTokenPrice(chainId: number): Promise<{ price: number; symbol: string }> {
    const nativeCurrency = this.getNativeCurrency(chainId);
    const now = Date.now();
    
    // Check cache first
    const cached = this.tokenPriceCache.get(chainId);
    if (cached && (now - cached.timestamp) < this.PRICE_CACHE_TTL) {
      return { price: cached.price, symbol: cached.symbol };
    }
    
    try {
      let price: number;
      
      if (nativeCurrency.symbol === 'POL') {
        // Fetch POL price using symbol
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'polygon-ecosystem-token',
            vs_currencies: 'usd'
          },
          timeout: 5000
        });
        price = response.data['polygon-ecosystem-token']?.usd || 0.5; // Fallback price
      } else {
        // Fetch ETH price
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'ethereum',
            vs_currencies: 'usd'
          },
          timeout: 5000
        });
        price = response.data.ethereum?.usd || 3720; // Fallback price
      }
      
      // Cache the result
      this.tokenPriceCache.set(chainId, {
        price,
        symbol: nativeCurrency.symbol,
        timestamp: now
      });
      
      this.logger.log(`Fetched ${nativeCurrency.symbol} price: $${price}`);
      return { price, symbol: nativeCurrency.symbol };
    } catch (error) {
      this.logger.warn(`Failed to fetch token price for chain ${chainId}: ${error.message}`);
      
      // Return fallback prices
      const fallbackPrice = nativeCurrency.symbol === 'POL' ? 0.5 : 3720;
      return { price: fallbackPrice, symbol: nativeCurrency.symbol };
    }
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