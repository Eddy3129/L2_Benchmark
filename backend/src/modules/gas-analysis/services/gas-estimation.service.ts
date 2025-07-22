import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// Base service
import { BaseService } from '../../../common/base.service';

// Services
import { ForkingService } from './forking.service';
import { BlocknativeApiService } from '../../../shared/blocknative-api.service';

// DTOs
import {
  GasEstimateDto,
  GasEstimationType,
  FunctionCallDto,
  CompilationResultDto,
} from '../../../common/dto/gas-analysis.dto';

// Utilities and constants
import { NumberUtils, ValidationUtils } from '../../../common/utils';
import { NetworkConfigService, NetworkConfig } from '../../../config/network.config';

interface EstimationRequest {
  network: string;
  compilation: CompilationResultDto;
  functionCall?: FunctionCallDto;
  estimationType: GasEstimationType;
  constructorArgs?: any[];
}

interface HistoricalGasData {
  functionName: string;
  averageGas: number;
  minGas: number;
  maxGas: number;
  sampleSize: number;
  lastUpdated: Date;
}

interface GasPriceData {
  network: string;
  gasPrice: number;
  maxFeePerGas?: number;
  maxPriorityFeePerGas?: number;
  baseFee?: number;
  timestamp: Date;
}

@Injectable()
export class GasEstimationService extends BaseService {
  private readonly historicalDataCache = new Map<string, HistoricalGasData>();
  private readonly gasPriceCache = new Map<string, GasPriceData>();
  private readonly providerCache = new Map<string, ethers.Provider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly forkingService: ForkingService,
    private readonly blocknativeApi: BlocknativeApiService
  ) {
    super();
  }

  /**
   * Estimates gas for contract deployment
   */
  async estimateDeploymentGas(request: EstimationRequest): Promise<GasEstimateDto> {
    try {
      const networkConfig = NetworkConfigService.getNetwork(request.network);
      if (!networkConfig) {
        throw new BadRequestException(`Network '${request.network}' not supported`);
      }

      let gasEstimate: number;
      let confidence: number;
      const metadata: any = {};

      switch (request.estimationType) {
        case GasEstimationType.STATIC:
          gasEstimate = this.estimateStaticDeploymentGas(request.compilation);
          confidence = 0.7;
          metadata.method = 'bytecode_analysis';
          break;

        case GasEstimationType.SIMULATION:
          gasEstimate = await this.estimateSimulationDeploymentGas(request);
          confidence = 0.9;
          metadata.method = 'network_simulation';
          break;

        case GasEstimationType.HISTORICAL:
          gasEstimate = await this.estimateHistoricalDeploymentGas(request);
          confidence = 0.8;
          metadata.method = 'historical_data';
          break;

        default:
          gasEstimate = this.estimateStaticDeploymentGas(request.compilation);
          confidence = 0.7;
          metadata.method = 'default_static';
      }

      // Get current gas price
      const gasPriceData = await this.getCurrentGasPrice(request.network);
      
      // Calculate costs
      const gasCostWei = BigInt(gasEstimate) * BigInt(gasPriceData.gasPrice);
      const gasCostEth = ethers.formatEther(gasCostWei);
      const gasCostUSD = await this.convertToUSD(gasCostEth, request.network);

      return {
        gasLimit: gasEstimate,
        gasPrice: gasPriceData.gasPrice,
        totalCost: gasCostEth,
        totalCostUSD: gasCostUSD || 0,
        gasUsed: gasEstimate,
        gasCost: gasCostEth,
      };
    } catch (error) {
      this.handleError(error, `Failed to estimate deployment gas for ${request.network}`);
    }
  }

  /**
   * Estimates gas for function execution
   */
  async estimateFunctionGas(request: EstimationRequest): Promise<GasEstimateDto> {
    try {
      if (!request.functionCall) {
        throw new BadRequestException('Function call data required for function gas estimation');
      }

      const networkConfig = NetworkConfigService.getNetwork(request.network);
      if (!networkConfig) {
        throw new BadRequestException(`Network '${request.network}' not supported`);
      }

      let gasEstimate: number;
      let confidence: number;
      const metadata: any = {};

      switch (request.estimationType) {
        case GasEstimationType.STATIC:
          gasEstimate = this.estimateStaticFunctionGas(request.compilation, request.functionCall);
          confidence = 0.6;
          metadata.method = 'static_analysis';
          break;

        case GasEstimationType.SIMULATION:
          gasEstimate = await this.estimateSimulationFunctionGas(request);
          confidence = 0.95;
          metadata.method = 'network_simulation';
          break;

        case GasEstimationType.HISTORICAL:
          gasEstimate = await this.estimateHistoricalFunctionGas(request.functionCall.functionName);
          confidence = 0.85;
          metadata.method = 'historical_data';
          break;

        default:
          gasEstimate = this.estimateStaticFunctionGas(request.compilation, request.functionCall);
          confidence = 0.6;
          metadata.method = 'default_static';
      }

      // Get current gas price
      const gasPriceData = await this.getCurrentGasPrice(request.network);
      
      // Calculate costs
      const gasCostWei = BigInt(gasEstimate) * BigInt(gasPriceData.gasPrice);
      const gasCostEth = ethers.formatEther(gasCostWei);
      const gasCostUSD = await this.convertToUSD(gasCostEth, request.network);

      return {
        gasLimit: gasEstimate,
        gasPrice: gasPriceData.gasPrice,
        totalCost: gasCostEth,
        totalCostUSD: gasCostUSD || 0,
        gasUsed: gasEstimate,
        gasCost: gasCostEth,
      };
    } catch (error) {
      this.handleError(error, `Failed to estimate function gas for ${request.functionCall?.functionName}`);
    }
  }

  /**
   * Gets gas price recommendations for different transaction speeds
   */
  async getGasPriceRecommendations(network: string): Promise<any> {
    try {
      const networkConfig = NetworkConfigService.getNetwork(network);
      if (!networkConfig) {
        throw new BadRequestException(`Network '${network}' not supported`);
      }

      const provider = await this.getProvider(networkConfig);
      const feeData = await provider.getFeeData();

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 network
        const baseFee = feeData.gasPrice ? Number(feeData.gasPrice) - Number(feeData.maxPriorityFeePerGas) : 0;
        
        return {
          type: 'eip1559',
          baseFee,
          recommendations: {
            slow: {
              maxFeePerGas: Number(feeData.maxFeePerGas) * 0.8,
              maxPriorityFeePerGas: Number(feeData.maxPriorityFeePerGas) * 0.8,
              estimatedTime: '5-10 minutes',
            },
            standard: {
              maxFeePerGas: Number(feeData.maxFeePerGas),
              maxPriorityFeePerGas: Number(feeData.maxPriorityFeePerGas),
              estimatedTime: '1-3 minutes',
            },
            fast: {
              maxFeePerGas: Number(feeData.maxFeePerGas) * 1.2,
              maxPriorityFeePerGas: Number(feeData.maxPriorityFeePerGas) * 1.2,
              estimatedTime: '30-60 seconds',
            },
          },
        };
      } else {
        // Legacy network
        const gasPrice = Number(feeData.gasPrice || 0);
        
        return {
          type: 'legacy',
          recommendations: {
            slow: {
              gasPrice: gasPrice * 0.8,
              estimatedTime: '5-10 minutes',
            },
            standard: {
              gasPrice: gasPrice,
              estimatedTime: '1-3 minutes',
            },
            fast: {
              gasPrice: gasPrice * 1.2,
              estimatedTime: '30-60 seconds',
            },
          },
        };
      }
    } catch (error) {
      this.handleError(error, `Failed to get gas price recommendations for ${network}`);
    }
  }

  /**
   * Estimates gas using static analysis of bytecode
   */
  private estimateStaticDeploymentGas(compilation: CompilationResultDto): number {
    if (!compilation.success || !compilation.bytecode) {
      throw new BadRequestException('Invalid compilation result');
    }

    const bytecodeSize = compilation.bytecode.length / 2; // Convert hex to bytes
    
    // Base deployment cost calculation
    const baseGas = 21000; // Base transaction cost
    const creationGas = 32000; // Contract creation cost
    const codeDepositGas = bytecodeSize * 200; // Cost per byte of code
    
    // Add complexity factor based on bytecode analysis
    const complexityFactor = this.calculateComplexityFactor(compilation.bytecode);
    const complexityGas = bytecodeSize * complexityFactor;
    
    return baseGas + creationGas + codeDepositGas + complexityGas;
  }

  /**
   * Estimates gas using network simulation
   */
  private async estimateSimulationDeploymentGas(request: EstimationRequest): Promise<number> {
    try {
      const networkConfig = NetworkConfigService.getNetwork(request.network);
      if (!networkConfig) {
        throw new Error(`Network configuration not found for ${request.network}`);
      }

      // Use mainnet forking for accurate simulation
      if (this.shouldUseFork(networkConfig)) {
        return await this.estimateDeploymentWithFork(networkConfig, request);
      }
      
      // Fallback to direct provider estimation for local networks
      const provider = await this.getProvider(networkConfig);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        request.compilation.abi,
        request.compilation.bytecode,
        provider
      );
      
      // Estimate deployment gas
      const deployTransaction = await factory.getDeployTransaction(...(request.constructorArgs || []));
      const gasEstimate = await provider.estimateGas(deployTransaction);
      
      return Number(gasEstimate);
    } catch (error) {
      this.logger.warn(`Simulation estimation failed, falling back to static: ${error.message}`);
      return this.estimateStaticDeploymentGas(request.compilation);
    }
  }

  /**
   * Estimates gas using historical data
   */
  private async estimateHistoricalDeploymentGas(request: EstimationRequest): Promise<number> {
    try {
      const bytecodeSize = request.compilation.bytecode.length / 2;
      const sizeCategory = this.getSizeCategory(bytecodeSize);
      
      // In a real implementation, this would query historical deployment data
      // For now, use size-based estimates with historical adjustments
      const baseEstimate = this.estimateStaticDeploymentGas(request.compilation);
      
      // Apply historical adjustment factors
      const historicalFactors = {
        small: 0.9,   // Small contracts tend to use less gas
        medium: 1.0,  // Medium contracts are baseline
        large: 1.1,   // Large contracts tend to use more gas
        xlarge: 1.2,  // Extra large contracts have overhead
      };
      
      const factor = historicalFactors[sizeCategory] || 1.0;
      return Math.round(baseEstimate * factor);
    } catch (error) {
      this.logger.warn(`Historical estimation failed, falling back to static: ${error.message}`);
      return this.estimateStaticDeploymentGas(request.compilation);
    }
  }

  /**
   * Estimates function gas using static analysis
   */
  private estimateStaticFunctionGas(compilation: CompilationResultDto, functionCall: FunctionCallDto): number {
    // Try to get gas estimate from compilation
    if (compilation.gasEstimates?.external?.[functionCall.functionName]) {
      return compilation.gasEstimates.external[functionCall.functionName];
    }
    
    // Fallback to pattern-based estimation
    return this.estimateGasFromFunctionPattern(functionCall);
  }

  /**
   * Estimates function gas using network simulation
   */
  private async estimateSimulationFunctionGas(request: EstimationRequest): Promise<number> {
    try {
      const networkConfig = NetworkConfigService.getNetwork(request.network);
      if (!networkConfig || !request.functionCall) {
        throw new Error('Invalid network configuration or function call');
      }

      // Use mainnet forking for accurate simulation
      if (this.shouldUseFork(networkConfig)) {
        return await this.estimateFunctionWithFork(networkConfig, request);
      }
      
      // Fallback to static estimation for local networks
      return this.estimateStaticFunctionGas(request.compilation, request.functionCall);
    } catch (error) {
      this.logger.warn(`Function simulation failed: ${error.message}`);
      return this.estimateStaticFunctionGas(request.compilation, request.functionCall!);
    }
  }

  /**
   * Estimates function gas using historical data
   */
  private async estimateHistoricalFunctionGas(functionName: string): Promise<number> {
    const cacheKey = `historical_${functionName.toLowerCase()}`;
    
    if (this.historicalDataCache.has(cacheKey)) {
      const data = this.historicalDataCache.get(cacheKey)!;
      return data.averageGas;
    }
    
    // In a real implementation, this would query historical transaction data
    // For now, use pattern-based estimates
    const gasEstimates = {
      transfer: 21000,
      approve: 46000,
      mint: 70000,
      burn: 30000,
      swap: 150000,
      deposit: 80000,
      withdraw: 60000,
      stake: 100000,
      unstake: 80000,
      claim: 50000,
      vote: 60000,
      delegate: 45000,
    };
    
    const lowerFunctionName = functionName.toLowerCase();
    for (const [pattern, gas] of Object.entries(gasEstimates)) {
      if (lowerFunctionName.includes(pattern)) {
        return gas;
      }
    }
    
    return 50000; // Default fallback
  }

  /**
   * Gets current gas price for network using Blocknative API
   */
  private async getCurrentGasPrice(network: string): Promise<GasPriceData> {
    const cacheKey = `gasPrice_${network}`;
    
    // Check cache (5 minute TTL)
    const cached = this.gasPriceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < 5 * 60 * 1000) {
      return cached;
    }
    
    try {
      const networkConfig = NetworkConfigService.getNetwork(network)!;
      
      // Try Blocknative API first for professional gas price data
      const blocknativeData = await this.getBlocknativeGasPrice(networkConfig.chainId, 95);
      if (blocknativeData) {
        const gasPriceData: GasPriceData = {
          network,
          gasPrice: Math.round(blocknativeData.totalFee * 1_000_000_000), // Convert gwei to wei
          maxFeePerGas: Math.round(blocknativeData.totalFee * 1_000_000_000),
          maxPriorityFeePerGas: Math.round(blocknativeData.priorityFee * 1_000_000_000),
          baseFee: Math.round(blocknativeData.baseFee * 1_000_000_000),
          timestamp: new Date(),
        };
        
        this.gasPriceCache.set(cacheKey, gasPriceData);
        return gasPriceData;
      }
      
      // Fallback to RPC provider if Blocknative fails
      const provider = await this.getProvider(networkConfig);
      const feeData = await provider.getFeeData();
      
      const gasPriceData: GasPriceData = {
        network,
        gasPrice: Number(feeData.gasPrice || 0),
        maxFeePerGas: feeData.maxFeePerGas ? Number(feeData.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? Number(feeData.maxPriorityFeePerGas) : undefined,
        baseFee: feeData.gasPrice && feeData.maxPriorityFeePerGas 
          ? Number(feeData.gasPrice) - Number(feeData.maxPriorityFeePerGas)
          : undefined,
        timestamp: new Date(),
      };
      
      this.gasPriceCache.set(cacheKey, gasPriceData);
      return gasPriceData;
    } catch (error) {
      this.logger.warn(`Failed to get gas price for ${network}: ${error.message}`);
      
      // Only use hardcoded defaults as last resort
      return {
        network,
        gasPrice: this.getDefaultGasPrice(network),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Converts ETH amount to USD
   */
  private async convertToUSD(ethAmount: string, network: string): Promise<number | undefined> {
    try {
      // In a real implementation, you'd fetch current ETH/token prices from an API
      // For now, return undefined to indicate USD conversion is not available
      return undefined;
    } catch (error) {
      this.logger.warn(`Failed to convert to USD: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Gets provider for network
   */
  private async getProvider(networkConfig: NetworkConfig): Promise<ethers.Provider> {
    const cacheKey = networkConfig.name;
    
    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey)!;
    }
    
    let provider: ethers.Provider;
    
    if (networkConfig.rpcUrl.startsWith('wss://')) {
      provider = new ethers.WebSocketProvider(networkConfig.rpcUrl);
    } else {
      provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    }
    
    this.providerCache.set(cacheKey, provider);
    return provider;
  }

  /**
   * Calculates complexity factor from bytecode
   */
  private calculateComplexityFactor(bytecode: string): number {
    // Count expensive operations in bytecode
    const expensiveOps = {
      '54': 2, // SLOAD
      '55': 5, // SSTORE
      '20': 1, // SHA3
      'f1': 3, // CALL
      'f2': 3, // CALLCODE
      'f4': 3, // DELEGATECALL
    };
    
    let complexityScore = 0;
    for (let i = 0; i < bytecode.length; i += 2) {
      const opcode = bytecode.substr(i, 2);
      if (expensiveOps[opcode]) {
        complexityScore += expensiveOps[opcode];
      }
    }
    
    return Math.min(complexityScore, 50); // Cap complexity factor
  }

  /**
   * Gets size category for bytecode
   */
  private getSizeCategory(sizeInBytes: number): string {
    if (sizeInBytes < 5000) return 'small';
    if (sizeInBytes < 15000) return 'medium';
    if (sizeInBytes < 20000) return 'large';
    return 'xlarge';
  }

  /**
   * Estimates gas from function pattern
   */
  private estimateGasFromFunctionPattern(functionCall: FunctionCallDto): number {
    let baseGas = 21000; // Base transaction cost
    
    // Add gas based on number of parameters
    baseGas += (functionCall.parameters?.length || 0) * 1000;
    
    // Add gas based on function name patterns
    const functionName = functionCall.functionName.toLowerCase();
    if (functionName.includes('transfer')) baseGas += 10000;
    if (functionName.includes('approve')) baseGas += 25000;
    if (functionName.includes('mint')) baseGas += 50000;
    if (functionName.includes('burn')) baseGas += 10000;
    if (functionName.includes('swap')) baseGas += 100000;
    if (functionName.includes('stake')) baseGas += 80000;
    if (functionName.includes('vote')) baseGas += 40000;
    
    return Math.min(baseGas, 500000); // Cap at reasonable maximum
  }

  /**
   * Determines if forking should be used for the network
   */
  private shouldUseFork(networkConfig: NetworkConfig): boolean {
    // Use forking for mainnet and major L2 networks (not local networks)
    const networkName = networkConfig.name.toLowerCase();
    const isLocal = networkName.includes('hardhat') || networkName.includes('localhost') || networkConfig.chainId === 31337;
    
    // Use forking for major networks that benefit from real state
    const shouldFork = !isLocal && (
      networkName.includes('mainnet') ||
      networkName.includes('arbitrum') ||
      networkName.includes('optimism') ||
      networkName.includes('base') ||
      networkName.includes('polygon') ||
      networkName.includes('zksync') ||
      networkName.includes('linea') ||
      networkName.includes('scroll') ||
      networkName.includes('ink')
    );
    
    return shouldFork;
  }

  /**
   * Estimates deployment gas using mainnet fork
   */
  private async estimateDeploymentWithFork(
    networkConfig: NetworkConfig,
    request: EstimationRequest
  ): Promise<number> {
    try {
      // Get optimal block for forking
      const blockNumber = await this.forkingService.getOptimalForkBlock(networkConfig);
      
      // Create fork
      const fork = await this.forkingService.createFork(networkConfig, blockNumber);
      
      // Simulate deployment
      const result = await this.forkingService.simulateDeployment(
        fork,
        request.compilation,
        request.constructorArgs || []
      );
      
      if (result.success) {
        this.logger.log(`Fork simulation successful: ${result.gasUsed} gas used`);
        return result.gasUsed;
      } else {
        throw new Error(result.error || 'Fork simulation failed');
      }
    } catch (error) {
      this.logger.warn(`Fork-based estimation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimates function gas using mainnet fork
   */
  private async estimateFunctionWithFork(
    networkConfig: NetworkConfig,
    request: EstimationRequest
  ): Promise<number> {
    try {
      if (!request.functionCall) {
        throw new Error('Function call data is required');
      }
      
      // Get optimal block for forking
      const blockNumber = await this.forkingService.getOptimalForkBlock(networkConfig);
      
      // Create fork
      const fork = await this.forkingService.createFork(networkConfig, blockNumber);
      
      // Simulate function call
      const result = await this.forkingService.simulateFunctionCall(
        fork,
        request.compilation,
        request.functionCall,
        request.constructorArgs || []
      );
      
      if (result.success) {
        this.logger.log(`Fork function simulation successful: ${result.gasUsed} gas used`);
        return result.gasUsed;
      } else {
        // Even if execution failed, we might have a gas estimate
        if (result.gasUsed > 0) {
          this.logger.warn(`Function execution failed but gas estimated: ${result.gasUsed}`);
          return result.gasUsed;
        }
        throw new Error(result.error || 'Fork function simulation failed');
      }
    } catch (error) {
      this.logger.warn(`Fork-based function estimation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimates total L2 cost including L1 data cost
   */
  async estimateL2TotalCost(
    networkConfig: NetworkConfig,
    l2GasUsed: number,
    transactionData: string,
    l1GasPrice: number,
    l2GasPrice: number
  ): Promise<{ l2Cost: number; l1DataCost: number; totalCost: number }> {
    try {
      // Calculate L2 execution cost
      const l2Cost = l2GasUsed * l2GasPrice;
      
      // Calculate L1 data cost
      const l1DataGas = await this.forkingService.calculateL1DataCost(
        networkConfig,
        transactionData,
        l1GasPrice
      );
      const l1DataCost = l1DataGas * l1GasPrice;
      
      // Total cost
      const totalCost = l2Cost + l1DataCost;
      
      return {
        l2Cost,
        l1DataCost,
        totalCost
      };
    } catch (error) {
      this.logger.warn(`Failed to calculate L2 total cost: ${error.message}`);
      // Fallback to L2 cost only
      const l2Cost = l2GasUsed * l2GasPrice;
      return {
        l2Cost,
        l1DataCost: 0,
        totalCost: l2Cost
      };
    }
  }

  /**
   * Gets gas price from Blocknative API
   */
  private async getBlocknativeGasPrice(chainId: number, confidenceLevel: number = 95): Promise<{ baseFee: number; priorityFee: number; totalFee: number; confidence: number; source: string } | null> {
    const apiKey = process.env.BLOCKNATIVE_API_KEY;
    if (!apiKey) {
      this.logger.warn('BLOCKNATIVE_API_KEY not configured');
      return null;
    }

    // Map chain IDs to Blocknative supported mainnet chains only
    const supportedChains: { [chainId: number]: boolean } = {
      1: true,        // Ethereum Mainnet
      137: true,      // Polygon Mainnet
      42161: true,    // Arbitrum One
      10: true,       // Optimism Mainnet
      8453: true,     // Base Mainnet
      43114: true,    // Avalanche
      56: true,       // BSC
      100: true,      // Gnosis
      324: true,      // ZKsync
      59144: true,    // Linea
      534352: true,   // Scroll
      57073: true,    // Ink
    };

    if (!supportedChains[chainId]) {
      this.logger.warn(`Blocknative does not support chain ID ${chainId}`);
      return null;
    }

    try {
      const url = `https://api.blocknative.com/gasprices/blockprices?chainid=${chainId}&confidenceLevels=${confidenceLevel}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Blocknative API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const blockPrices = data.blockPrices?.[0];
      if (!blockPrices) {
        throw new Error('No block prices data available');
      }

      const estimatedPrices = blockPrices.estimatedPrices;
      if (!estimatedPrices || estimatedPrices.length === 0) {
        throw new Error('No estimated prices available');
      }

      let selectedPrice = estimatedPrices.find((price: any) => price.confidence === confidenceLevel);
      
      if (!selectedPrice) {
        selectedPrice = estimatedPrices.reduce((closest: any, current: any) => {
          return Math.abs(current.confidence - confidenceLevel) < Math.abs(closest.confidence - confidenceLevel) 
            ? current : closest;
        });
      }

      if (!selectedPrice) {
        throw new Error('No suitable gas price estimate found');
      }

      this.logger.log(`Blocknative gas price for chain ${chainId}: ${selectedPrice.maxFeePerGas} gwei (confidence: ${selectedPrice.confidence}%)`);

      return {
        baseFee: blockPrices.baseFeePerGas || 0,
        priorityFee: selectedPrice.maxPriorityFeePerGas || 0,
        totalFee: selectedPrice.maxFeePerGas || selectedPrice.price || 0,
        confidence: selectedPrice.confidence,
        source: 'blocknative'
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Blocknative gas prices for chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Gets default gas price for network (fallback only)
   */
  private getDefaultGasPrice(network: string): number {
    const defaults = {
      ethereum: 20000000000, // 20 gwei
      polygon: 30000000000, // 30 gwei
      arbitrum: 100000000, // 0.1 gwei
      optimism: 1000000, // 0.001 gwei
      base: 1000000, // 0.001 gwei
      scroll: 1000000, // 0.001 gwei
      ink: 1000000, // 0.001 gwei
      linea: 1000000, // 0.001 gwei
      avalanche: 25000000000, // 25 gwei
      fantom: 20000000000, // 20 gwei
      bsc: 5000000000, // 5 gwei
    };
    
    const networkName = network.toLowerCase();
    for (const [name, price] of Object.entries(defaults)) {
      if (networkName.includes(name)) {
        return price;
      }
    }
    
    return 20000000000; // Default 20 gwei
  }

  /**
   * Clears all caches
   */
  clearCache(): void {
    this.historicalDataCache.clear();
    this.gasPriceCache.clear();
    this.providerCache.clear();
    this.logger.log('Gas estimation cache cleared');
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  async onModuleDestroy() {
    await this.forkingService.cleanupAllForks();
  }
}