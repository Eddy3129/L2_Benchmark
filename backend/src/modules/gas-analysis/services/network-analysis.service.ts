import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// Base service
import { BaseService } from '../../../common/base.service';

// DTOs
import {
  NetworkAnalysisResultDto,
  CompilationResultDto,
  FunctionCallDto,
  GasEstimationType,
} from '../../../common/dto/gas-analysis.dto';

// Utilities and constants
import { NumberUtils, ValidationUtils } from '../../../common/utils';
import { ERROR_MESSAGES } from '../../../common/constants';
import { NetworkConfigService, NetworkConfig } from '../../../config/network.config';

interface AnalyzeNetworkRequest {
  network: string;
  compilation: CompilationResultDto;
  functionCalls: FunctionCallDto[];
  constructorArgs: any[];
  gasEstimationType?: GasEstimationType;
}

// Using shared GasEstimate interface from types.ts
// Local interface for internal calculations
interface LocalGasEstimate {
  functionName: string;
  gasUsed: number;
  gasPrice: number;
  gasCost: string; // in ETH
  gasCostUSD?: number;
}

@Injectable()
export class NetworkAnalysisService extends BaseService {
  private readonly providerCache = new Map<string, ethers.Provider>();
  private readonly gasCache = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /**
   * Analyzes gas costs for a contract on a specific network
   */
  async analyzeNetwork(request: AnalyzeNetworkRequest): Promise<NetworkAnalysisResultDto> {
    try {
      const startTime = Date.now();
      
      // Get network configuration
      const networkConfig = NetworkConfigService.getNetwork(request.network);
      if (!networkConfig) {
        throw new BadRequestException(`Network '${request.network}' not supported`);
      }
      
      // Get provider
      const provider = await this.getProvider(networkConfig);
      
      // Estimate deployment gas
      const deploymentGas = await this.estimateDeploymentGas(
        provider,
        request.compilation,
        request.constructorArgs
      );
      
      // Estimate function gas costs
      const functionGasEstimates = await this.estimateFunctionGas(
        provider,
        request.compilation,
        request.functionCalls,
        request.gasEstimationType
      );
      
      // Get current gas price
      const gasPrice = await this.getCurrentGasPrice(provider, networkConfig);
      
      // Calculate costs
      const deploymentCost = this.calculateGasCost(deploymentGas, gasPrice);
      const functionCosts = functionGasEstimates.map(estimate => ({
        ...estimate,
        gasCost: this.calculateGasCost(estimate.gasUsed, gasPrice),
      }));
      
      // Convert function costs array to Record<string, GasEstimateDto>
      const functionGasEstimatesRecord: Record<string, any> = {};
      functionCosts.forEach(estimate => {
        functionGasEstimatesRecord[estimate.functionName] = {
          gasLimit: estimate.gasUsed,
          gasPrice: estimate.gasPrice,
          totalCost: estimate.gasCost,
          totalCostUSD: estimate.gasCostUSD || 0,
          gasUsed: estimate.gasUsed,
          effectiveGasPrice: estimate.gasPrice,
        };
      });
      
      // Get network status
      const networkStatus = await this.getNetworkStatus(provider);
      
      const result: NetworkAnalysisResultDto = {
        network: request.network,
        networkDisplayName: networkConfig.name,
        chainId: networkConfig.chainId,
        deploymentGas: {
          gasLimit: deploymentGas,
          gasPrice: gasPrice,
          totalCost: deploymentCost,
          totalCostUSD: await this.convertToUSD(deploymentCost, request.network) || 0,
          gasUsed: deploymentGas,
          gasCost: deploymentCost,
        },
        functionGasEstimates: functionGasEstimatesRecord,
        timestamp: new Date().toISOString(),
        networkStatus: {
          isOnline: networkStatus.isConnected,
          latency: 0, // Default value
          blockHeight: networkStatus.blockNumber,
        },
      };
      
      return result;
    } catch (error) {
      this.handleError(error, `Failed to analyze network '${request.network}'`);
    }
  }

  /**
   * Estimates deployment gas for a contract
   */
  async estimateDeploymentGas(
    provider: ethers.Provider,
    compilation: CompilationResultDto,
    constructorArgs: any[] = []
  ): Promise<number> {
    try {
      if (!compilation.success || !compilation.bytecode) {
        throw new BadRequestException('Invalid compilation result for gas estimation');
      }
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        compilation.abi,
        compilation.bytecode,
        provider
      );
      
      // Estimate deployment gas
      const deployTransaction = await factory.getDeployTransaction(...constructorArgs);
      const gasEstimate = await provider.estimateGas(deployTransaction);
      
      return Number(gasEstimate);
    } catch (error) {
      this.logger.warn(`Failed to estimate deployment gas: ${error.message}`);
      
      // Fallback to bytecode size estimation
      return this.estimateGasFromBytecode(compilation.bytecode);
    }
  }

  /**
   * Estimates gas for function calls
   */
  async estimateFunctionGas(
    provider: ethers.Provider,
    compilation: CompilationResultDto,
    functionCalls: FunctionCallDto[],
    estimationType: GasEstimationType = GasEstimationType.STATIC
  ): Promise<LocalGasEstimate[]> {
    try {
      const estimates: LocalGasEstimate[] = [];
      
      if (functionCalls.length === 0) {
        // If no specific functions provided, estimate common functions
        return this.estimateCommonFunctions(compilation);
      }
      
      for (const functionCall of functionCalls) {
        try {
          let gasUsed: number;
          
          switch (estimationType) {
            case GasEstimationType.STATIC:
              gasUsed = this.estimateStaticGas(compilation, functionCall);
              break;
            
            case GasEstimationType.SIMULATION:
              gasUsed = await this.estimateSimulationGas(provider, compilation, functionCall);
              break;
            
            case GasEstimationType.HISTORICAL:
              gasUsed = await this.estimateHistoricalGas(functionCall.functionName);
              break;
            
            default:
              gasUsed = this.estimateStaticGas(compilation, functionCall);
          }
          
          estimates.push({
            functionName: functionCall.functionName,
            gasUsed,
            gasPrice: 0, // Will be filled later
            gasCost: '0', // Will be calculated later
          });
        } catch (error) {
          this.logger.warn(`Failed to estimate gas for function '${functionCall.functionName}': ${error.message}`);
          
          // Add fallback estimate
          estimates.push({
            functionName: functionCall.functionName,
            gasUsed: 50000, // Default fallback
            gasPrice: 0,
            gasCost: '0',
          });
        }
      }
      
      return estimates;
    } catch (error) {
      this.handleError(error, 'Failed to estimate function gas');
    }
  }

  /**
   * Gets current gas price for the network
   */
  async getCurrentGasPrice(provider: ethers.Provider, networkConfig: NetworkConfig): Promise<number> {
    try {
      const cacheKey = `gasPrice_${networkConfig.name}`;
      
      // Check cache (5 minute TTL)
      const cached = this.gasCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.gasPrice;
      }
      
      // Get current gas price
      const feeData = await provider.getFeeData();
      let gasPrice: number;
      
      if (feeData.gasPrice) {
        gasPrice = Number(feeData.gasPrice);
      } else if (feeData.maxFeePerGas) {
        // EIP-1559 networks
        gasPrice = Number(feeData.maxFeePerGas);
      } else {
        // Fallback to network default
        gasPrice = this.getDefaultGasPrice(networkConfig);
      }
      
      // Cache the result
      this.gasCache.set(cacheKey, {
        gasPrice,
        timestamp: Date.now(),
      });
      
      return gasPrice;
    } catch (error) {
      this.logger.warn(`Failed to get gas price for ${networkConfig.name}: ${error.message}`);
      return this.getDefaultGasPrice(networkConfig);
    }
  }

  /**
   * Gets network status information
   */
  async getNetworkStatus(provider: ethers.Provider): Promise<any> {
    try {
      const [blockNumber, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
      ]);
      
      return {
        blockNumber,
        chainId: Number(network.chainId),
        isConnected: true,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(`Failed to get network status: ${error.message}`);
      return {
        blockNumber: 0,
        chainId: 0,
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Converts gas cost to USD
   */
  async convertToUSD(gasCostETH: string, network: string): Promise<number | undefined> {
    try {
      // In a real implementation, you'd fetch current ETH/token prices
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
    
    try {
      let provider: ethers.Provider;
      
      if (networkConfig.rpcUrl.startsWith('wss://')) {
        provider = new ethers.WebSocketProvider(networkConfig.rpcUrl);
      } else {
        provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      }
      
      // Test connection
      await provider.getBlockNumber();
      
      this.providerCache.set(cacheKey, provider);
      this.logger.debug(`Connected to ${networkConfig.name} provider`);
      
      return provider;
    } catch (error) {
      throw new BadRequestException(`Failed to connect to ${networkConfig.name}: ${error.message}`);
    }
  }

  /**
   * Estimates gas from bytecode size (fallback method)
   */
  private estimateGasFromBytecode(bytecode: string): number {
    const bytecodeSize = bytecode.length / 2; // Convert hex to bytes
    
    // Base deployment cost + cost per byte
    const baseGas = 21000; // Base transaction cost
    const creationGas = 32000; // Contract creation cost
    const codeDepositGas = bytecodeSize * 200; // Cost per byte of code
    
    return baseGas + creationGas + codeDepositGas;
  }

  /**
   * Estimates static gas for a function
   */
  private estimateStaticGas(compilation: CompilationResultDto, functionCall: FunctionCallDto): number {
    // Try to get gas estimate from compilation
    if (compilation.gasEstimates?.external?.[functionCall.functionName]) {
      return compilation.gasEstimates.external[functionCall.functionName];
    }
    
    // Fallback to function complexity estimation
    return this.estimateGasFromFunctionComplexity(functionCall);
  }

  /**
   * Estimates gas through simulation
   */
  private async estimateSimulationGas(
    provider: ethers.Provider,
    compilation: CompilationResultDto,
    functionCall: FunctionCallDto
  ): Promise<number> {
    try {
      // This would require deploying the contract and calling the function
      // For now, fall back to static estimation
      return this.estimateStaticGas(compilation, functionCall);
    } catch (error) {
      this.logger.warn(`Simulation gas estimation failed: ${error.message}`);
      return this.estimateStaticGas(compilation, functionCall);
    }
  }

  /**
   * Estimates gas from historical data
   */
  private async estimateHistoricalGas(functionName: string): Promise<number> {
    try {
      // In a real implementation, this would query historical gas usage data
      // For now, return a reasonable default based on function name patterns
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
      };
      
      const lowerFunctionName = functionName.toLowerCase();
      for (const [pattern, gas] of Object.entries(gasEstimates)) {
        if (lowerFunctionName.includes(pattern)) {
          return gas;
        }
      }
      
      return 50000; // Default fallback
    } catch (error) {
      this.logger.warn(`Historical gas estimation failed: ${error.message}`);
      return 50000;
    }
  }

  /**
   * Estimates common functions if none specified
   */
  private estimateCommonFunctions(compilation: CompilationResultDto): LocalGasEstimate[] {
    const commonFunctions = [
      { name: 'transfer', gas: 21000 },
      { name: 'approve', gas: 46000 },
      { name: 'mint', gas: 70000 },
      { name: 'burn', gas: 30000 },
    ];
    
    return commonFunctions.map(func => ({
      functionName: func.name,
      gasUsed: func.gas,
      gasPrice: 0,
      gasCost: '0',
    }));
  }

  /**
   * Estimates gas from function complexity
   */
  private estimateGasFromFunctionComplexity(functionCall: FunctionCallDto): number {
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
    
    return Math.min(baseGas, 500000); // Cap at reasonable maximum
  }

  /**
   * Calculates gas cost in ETH
   */
  private calculateGasCost(gasUsed: number, gasPrice: number): string {
    const costWei = BigInt(gasUsed) * BigInt(gasPrice);
    return ethers.formatEther(costWei);
  }

  /**
   * Gets default gas price for network
   */
  private getDefaultGasPrice(networkConfig: NetworkConfig): number {
    // Default gas prices in wei
    const defaults = {
      ethereum: 20000000000, // 20 gwei
      polygon: 30000000000, // 30 gwei
      arbitrum: 100000000, // 0.1 gwei
      optimism: 1000000, // 0.001 gwei
      base: 1000000, // 0.001 gwei
      avalanche: 25000000000, // 25 gwei
      fantom: 20000000000, // 20 gwei
      bsc: 5000000000, // 5 gwei
    };
    
    const networkName = networkConfig.name.toLowerCase();
    for (const [name, price] of Object.entries(defaults)) {
      if (networkName.includes(name)) {
        return price;
      }
    }
    
    return 20000000000; // Default 20 gwei
  }

  /**
   * Clears provider and gas caches
   */
  clearCache(): void {
    this.providerCache.clear();
    this.gasCache.clear();
    this.logger.log('Network analysis cache cleared');
  }
}