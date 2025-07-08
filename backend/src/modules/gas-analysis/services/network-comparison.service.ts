import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { GasAnalysis } from '../entities/gas-analysis.entity';
import { NetworkResult } from '../entities/network-result.entity';
import { CompilationResult } from '../entities/compilation-result.entity';
import {
  CompareNetworksRequestDto,
  NetworkComparisonDto,
  GasAnalysisQueryDto,
  GasAnalysisResultDto,
  OptimizationLevel,
  GasEstimationType,
  AnalysisType,
} from '../../../common/dto/gas-analysis.dto';
import {
  PaginatedResponseDto,
  SuccessResponseDto,
  PaginationMetaDto,
} from '../../../common/dto/base.dto';
import { ContractCompilationService } from './contract-compilation.service';
import { NetworkAnalysisService } from './network-analysis.service';
import { GasEstimationService } from './gas-estimation.service';
import { ValidationUtils, NumberUtils } from '../../../common/utils';
import { CONSTANTS } from '../../../common/constants';

@Injectable()
export class NetworkComparisonService extends BaseService {
  constructor(
    @InjectRepository(GasAnalysis)
    private readonly gasAnalysisRepository: Repository<GasAnalysis>,
    @InjectRepository(NetworkResult)
    private readonly networkResultRepository: Repository<NetworkResult>,
    @InjectRepository(CompilationResult)
    private readonly compilationResultRepository: Repository<CompilationResult>,
    private readonly compilationService: ContractCompilationService,
    private readonly networkAnalysisService: NetworkAnalysisService,
    private readonly gasEstimationService: GasEstimationService,
  ) {
    super();
  }

  /**
   * Compare gas costs across multiple networks
   */
  async compareNetworks(
    request: CompareNetworksRequestDto,
  ): Promise<SuccessResponseDto<NetworkComparisonDto>> {
    try {
      this.logger.log(
        `Starting network comparison for contract: ${request.contractName}`,
      );

      // Validate networks
      const allNetworks = [request.baselineNetwork, ...request.comparisonNetworks];
      this.validateNetworks(allNetworks);

      // Compile contract
      const compilationResult = await this.compilationService.compileContract({
        contractName: request.contractName,
        sourceCode: request.sourceCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: OptimizationLevel.MEDIUM,
        optimizationRuns: request.optimizationSettings?.runs || 200,
      });

      if (!compilationResult.success) {
        throw new Error(
          `Compilation failed: ${compilationResult.errors?.join(', ')}`,
        );
      }

      // Analyze gas costs for each network
      const networkResults = await Promise.all(
        allNetworks.map(async (networkId) => {
          const result = await this.networkAnalysisService.analyzeNetwork({
            network: networkId,
            compilation: compilationResult,
            functionCalls: [],
            constructorArgs: [],
            gasEstimationType: 'both' as any
          });
          return result;
        }),
      );

      // Create gas analysis record
      const gasAnalysis = await this.createGasAnalysisRecord(
        request,
        compilationResult,
        networkResults,
      );

      // Build comparison result
      const comparison = this.buildNetworkComparison(
        gasAnalysis,
        networkResults,
      );

      this.logger.log(
        `Network comparison completed for analysis ID: ${gasAnalysis.id}`,
      );

      return {
        success: true,
        message: 'Quick comparison completed successfully',
        data: comparison,
      };
    } catch (error) {
      this.logger.error(
        `Network comparison failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to compare networks: ${error.message}`);
    }
  }

  /**
   * Get comparison history with pagination
   */
  async getComparisonHistory(
    query: GasAnalysisQueryDto,
  ): Promise<PaginatedResponseDto<GasAnalysisResultDto>> {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = query;

      const queryBuilder = this.gasAnalysisRepository
        .createQueryBuilder('analysis')
        .leftJoinAndSelect('analysis.compilationResult', 'compilation')
        .leftJoinAndSelect('analysis.networkResults', 'networks')
        .where('analysis.analysisType = :type', { type: 'network_comparison' });

      // Apply filters
      if (filters.contractName) {
        queryBuilder.andWhere('analysis.contractName ILIKE :contractName', {
          contractName: `%${filters.contractName}%`,
        });
      }

      if (filters.network) {
        queryBuilder.andWhere('networks.network = :network', {
          network: filters.network,
        });
      }

      if (filters.dateRange?.startDate) {
        queryBuilder.andWhere('analysis.createdAt >= :startDate', {
          startDate: filters.dateRange.startDate,
        });
      }

      if (filters.dateRange?.endDate) {
        queryBuilder.andWhere('analysis.createdAt <= :endDate', {
          endDate: filters.dateRange.endDate,
        });
      }

      // Apply sorting
      const sortField = sortBy || 'createdAt';
      const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`analysis.${sortField}`, order);

      // Apply pagination
      const offset = ((page || 1) - 1) * (limit || CONSTANTS.PAGINATION.DEFAULT_LIMIT);
      queryBuilder.skip(offset).take(limit || CONSTANTS.PAGINATION.DEFAULT_LIMIT);

      const [analyses, total] = await queryBuilder.getManyAndCount();

      const results = analyses.map((analysis) =>
        this.mapToGasAnalysisResult(analysis),
      );

      const meta = new PaginationMetaDto(
        page || 1,
        limit || CONSTANTS.PAGINATION.DEFAULT_LIMIT,
        total
      );

      return new PaginatedResponseDto(
        results,
        meta,
        'Comparison history retrieved successfully'
      );
    } catch (error) {
      this.logger.error(
        `Failed to get comparison history: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to retrieve comparison history');
    }
  }

  /**
   * Get comparison by ID
   */
  async getComparisonById(
    id: string,
  ): Promise<SuccessResponseDto<GasAnalysisResultDto>> {
    try {
      ValidationUtils.validateUUID(id);

      const analysis = await this.gasAnalysisRepository.findOne({
        where: { id, analysisType: AnalysisType.BASIC },
        relations: ['compilationResult', 'networkResults'],
      });

      if (!analysis) {
        throw new Error('Network comparison not found');
      }

      const result = this.mapToGasAnalysisResult(analysis);

      return {
        success: true,
        message: 'Network comparison retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get comparison by ID: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to retrieve network comparison');
    }
  }

  /**
   * Perform quick comparison between two networks
   */
  async quickComparison(
    network1: string,
    network2: string,
    contractBytecode: string,
  ): Promise<SuccessResponseDto<any>> {
    try {
      this.logger.log(
        `Starting quick comparison between ${network1} and ${network2}`,
      );

      // Validate networks
      this.validateNetworks([network1, network2]);

      // Get gas estimates for both networks
      const [result1, result2] = await Promise.all([
        this.networkAnalysisService.analyzeNetwork({
          network: network1,
          compilation: { success: true, bytecode: contractBytecode, abi: [], compilerVersion: '0.8.19', optimizationSettings: { enabled: false, runs: 200 } },
          functionCalls: [],
          constructorArgs: [],
          gasEstimationType: 'both' as any
        }),
        this.networkAnalysisService.analyzeNetwork({
          network: network2,
          compilation: { success: true, bytecode: contractBytecode, abi: [], compilerVersion: '0.8.19', optimizationSettings: { enabled: false, runs: 200 } },
          functionCalls: [],
          constructorArgs: [],
          gasEstimationType: 'both' as any
        }),
      ]);

      // Calculate comparison metrics
      const comparison = {
        network1: {
          id: network1,
          name: result1.networkDisplayName,
          deploymentCost: result1.deploymentGas,
          gasPrice: result1.deploymentGas.gasPrice,
          totalCostUSD: result1.deploymentGas.totalCostUSD,
        },
        network2: {
          id: network2,
          name: result2.networkDisplayName,
          deploymentCost: result2.deploymentGas,
          gasPrice: result2.deploymentGas.gasPrice,
          totalCostUSD: result2.deploymentGas.totalCostUSD,
        },
        savings: {
          gasDifference: result1.deploymentGas.gasLimit - result2.deploymentGas.gasLimit,
          costDifferenceUSD: result1.deploymentGas.totalCostUSD - result2.deploymentGas.totalCostUSD,
          percentageSaving: Math.abs(result1.deploymentGas.totalCostUSD - result2.deploymentGas.totalCostUSD) / Math.max(result1.deploymentGas.totalCostUSD, result2.deploymentGas.totalCostUSD) * 100,
          cheaperNetwork: result1.deploymentGas.totalCostUSD < result2.deploymentGas.totalCostUSD ? network1 : network2,
        },
        timestamp: new Date().toISOString(),
      };

      return this.createSuccessResponse(
        comparison,
        'Quick network comparison completed successfully'
      );
    } catch (error) {
      this.logger.error(
        `Quick comparison failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to perform quick comparison: ${error.message}`);
    }
  }

  /**
   * Get supported networks for comparison
   */
  async getSupportedNetworks(): Promise<SuccessResponseDto<any[]>> {
    try {
      const networks = [
        {
          id: 'ethereum',
          name: 'Ethereum Mainnet',
          chainId: 1,
          type: 'mainnet',
          gasToken: 'ETH',
          averageBlockTime: 12,
          supported: true,
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum One',
          chainId: 42161,
          type: 'l2',
          gasToken: 'ETH',
          averageBlockTime: 0.25,
          supported: true,
        },
        {
          id: 'optimism',
          name: 'Optimism',
          chainId: 10,
          type: 'l2',
          gasToken: 'ETH',
          averageBlockTime: 2,
          supported: true,
        },
        {
          id: 'polygon',
          name: 'Polygon',
          chainId: 137,
          type: 'sidechain',
          gasToken: 'MATIC',
          averageBlockTime: 2,
          supported: true,
        },
        {
          id: 'base',
          name: 'Base',
          chainId: 8453,
          type: 'l2',
          gasToken: 'ETH',
          averageBlockTime: 2,
          supported: true,
        },
      ];

      return {
        success: true,
        message: 'Supported networks retrieved successfully',
        data: networks,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get supported networks: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to retrieve supported networks');
    }
  }

  /**
   * Get popular network pairs for comparison
   */
  async getPopularNetworkPairs(): Promise<SuccessResponseDto<any[]>> {
    try {
      const popularPairs = [
        {
          pair: ['ethereum', 'arbitrum'],
          name: 'Ethereum vs Arbitrum',
          description: 'Compare mainnet costs with L2 scaling solution',
          avgSavings: '85%',
          popularity: 95,
        },
        {
          pair: ['ethereum', 'optimism'],
          name: 'Ethereum vs Optimism',
          description: 'Compare mainnet costs with optimistic rollup',
          avgSavings: '80%',
          popularity: 90,
        },
        {
          pair: ['ethereum', 'polygon'],
          name: 'Ethereum vs Polygon',
          description: 'Compare mainnet costs with sidechain solution',
          avgSavings: '95%',
          popularity: 85,
        },
        {
          pair: ['arbitrum', 'optimism'],
          name: 'Arbitrum vs Optimism',
          description: 'Compare L2 scaling solutions',
          avgSavings: '15%',
          popularity: 75,
        },
        {
          pair: ['ethereum', 'base'],
          name: 'Ethereum vs Base',
          description: 'Compare mainnet costs with Coinbase L2',
          avgSavings: '82%',
          popularity: 70,
        },
      ];

      return {
        success: true,
        message: 'Popular network pairs retrieved successfully',
        data: popularPairs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get popular network pairs: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to retrieve popular network pairs');
    }
  }

  /**
   * Validate network IDs
   */
  public validateNetworks(networks: string[]): void {
    const supportedNetworks = [
      // Mainnets
      'ethereum',
      'arbitrum',
      'optimism',
      'polygon',
      'base',
      'polygon-zkevm',
      'zksync-era',
      // Testnets
      'sepolia',
      'arbitrumSepolia',
      'arbitrum-sepolia',
      'optimismSepolia',
      'optimism-sepolia',
      'baseSepolia',
      'base-sepolia',
      'polygonAmoy',
      'polygonZkEvm',
      'zkSyncSepolia',
      // Local networks
      'hardhat',
      'localhost',
    ];

    for (const network of networks) {
      if (!supportedNetworks.includes(network)) {
        throw new Error(`Unsupported network: ${network}`);
      }
    }

    if (networks.length < 2) {
      throw new Error('At least 2 networks are required for comparison');
    }

    if (networks.length > 5) {
      throw new Error('Maximum 5 networks can be compared at once');
    }
  }

  /**
   * Create gas analysis record
   */
  private async createGasAnalysisRecord(
    request: CompareNetworksRequestDto,
    compilationResult: any,
    networkResults: any[],
  ): Promise<GasAnalysis> {
    const startTime = Date.now();

    // Save compilation result
    const compilation = this.compilationResultRepository.create({
      success: compilationResult.success,
      bytecode: compilationResult.bytecode,
      abi: compilationResult.abi,
      compilerVersion: compilationResult.compilerVersion,
      optimizationSettings: {
        enabled: compilationResult.optimizationEnabled || false,
        runs: compilationResult.optimizationRuns || 200,
      },
      bytecodeSize: compilationResult.bytecodeSize,
      errors: compilationResult.errors,
      warnings: compilationResult.warnings,
      compilationTime: compilationResult.compilationTime,
      gasEstimates: compilationResult.gasEstimates,
      bytecodeAnalysis: compilationResult.bytecodeAnalysis,
    });

    const savedCompilation: CompilationResult = await this.compilationResultRepository.save(
      compilation,
    ) as unknown as CompilationResult;

    // Create and save network results first
    const networkResultEntities = networkResults.map((result) => {
      return this.networkResultRepository.create({
        network: result.networkId || result.network,
        networkDisplayName: result.networkName || result.networkDisplayName,
        chainId: result.chainId,
        deploymentGas: result.deploymentGas,
        functionGasEstimates: result.functionGasEstimates,
        networkStatus: result.networkStatus ? {
          blockNumber: result.networkStatus.blockNumber || 0,
          chainId: result.chainId || 0,
          isConnected: result.networkStatus.isConnected || false,
          lastChecked: new Date().toISOString(),
          latency: result.networkStatus.latency || 0,
          gasPrice: result.networkStatus.gasPrice,
          baseFee: result.networkStatus.baseFee,
        } : undefined,
        blockNumber: result.blockNumber,
        timestamp: result.timestamp,
        metadata: result.metadata,
      });
    });

    const savedNetworkResults: NetworkResult[] = [];
    for (const entity of networkResultEntities) {
      const saved = await this.networkResultRepository.save(entity) as unknown as NetworkResult;
      savedNetworkResults.push(saved);
    }

    // Create gas analysis
    const gasAnalysis = new GasAnalysis();
    gasAnalysis.contractName = request.contractName;
    gasAnalysis.sourceCodeHash = this.generateSourceCodeHash(request.sourceCode);
    gasAnalysis.analysisType = 'network_comparison' as any;
    gasAnalysis.duration = Date.now() - startTime;
    gasAnalysis.metadata = {
      networks: [request.baselineNetwork, ...request.comparisonNetworks],
      solidityVersion: request.solidityVersion,
      optimizationSettings: request.optimizationSettings,
      functionCalls: request.functionCalls,
    };
    gasAnalysis.compilation = savedCompilation;
    gasAnalysis.networkResults = savedNetworkResults;

    return await this.gasAnalysisRepository.save(gasAnalysis as GasAnalysis);
  }

  /**
   * Build network comparison result
   */
  private buildNetworkComparison(
    gasAnalysis: GasAnalysis,
    networkResults: any[],
  ): NetworkComparisonDto {
    const networks = networkResults.map((result) => ({
      networkId: result.networkId || result.network,
      networkName: result.networkName || result.networkDisplayName || result.network,
      chainId: result.chainId,
      deploymentCost: result.deploymentGas,
      gasPrice: result.deploymentGas?.gasPrice,
      totalCostUSD: result.totalCostUSD || (result.deploymentGas?.gasCostUSD || 0),
      savings: 0, // Will be calculated below
      rank: 0, // Will be calculated below
    }));

    // Sort by total cost and calculate savings
    networks.sort((a, b) => a.totalCostUSD - b.totalCostUSD);
    const cheapestCost = networks[0].totalCostUSD;
    const mostExpensiveCost = networks[networks.length - 1].totalCostUSD;

    networks.forEach((network, index) => {
      network.rank = index + 1;
      network.savings = NumberUtils.calculatePercentage(
        mostExpensiveCost - network.totalCostUSD,
        mostExpensiveCost,
      );
    });

    // For now, return a simplified structure that matches NetworkComparisonDto
    // This needs to be properly implemented based on the actual DTO structure
    const baseline = networkResults[0];
    const comparisons = networkResults.slice(1);
    
    return {
      baseline: {
        network: baseline.network,
        networkDisplayName: baseline.networkDisplayName || baseline.network,
        chainId: baseline.chainId,
        deploymentGas: baseline.deploymentGas || { gasLimit: 0, gasPrice: 0, totalCost: '0', totalCostUSD: 0 },
        functionGasEstimates: baseline.functionGasEstimates || {},
        timestamp: baseline.timestamp || new Date().toISOString(),
        contractAddress: baseline.contractAddress,
        transactionHash: baseline.transactionHash,
        blockNumber: baseline.blockNumber,
      },
      comparisons: comparisons.map(comp => ({
        network: {
          network: comp.network,
          networkDisplayName: comp.networkDisplayName || comp.network,
          chainId: comp.chainId,
          deploymentGas: comp.deploymentGas || { gasLimit: 0, gasPrice: 0, totalCost: '0', totalCostUSD: 0 },
          functionGasEstimates: comp.functionGasEstimates || {},
          timestamp: comp.timestamp || new Date().toISOString(),
          contractAddress: comp.contractAddress,
          transactionHash: comp.transactionHash,
          blockNumber: comp.blockNumber,
        },
        savings: {
          deploymentSavings: { absolute: '0', percentage: 0, gasReduction: 0 },
          functionSavings: {},
          totalSavings: { absolute: '0', percentage: 0 },
        },
      })),
      metadata: {
        comparisonId: gasAnalysis.id,
        timestamp: gasAnalysis.createdAt.toISOString(),
        contractName: gasAnalysis.contractName,
        baselineNetwork: baseline.network,
        comparisonNetworks: comparisons.map(c => c.network),
      },
    };
  }

  /**
   * Map gas analysis entity to result DTO
   */
  private mapToGasAnalysisResult(analysis: GasAnalysis): GasAnalysisResultDto {
    return {
      id: analysis.id,
      contractName: analysis.contractName,
      analysisType: analysis.analysisType,
      duration: analysis.duration || 0,
      createdAt: analysis.createdAt.toISOString(),
      compilation: analysis.compilation
        ? {
            success: analysis.compilation.success,
            bytecode: analysis.compilation.bytecode || '',
            abi: analysis.compilation.abi || [],
            compilerVersion: analysis.compilation.compilerVersion || '0.8.19',
            optimizationSettings: {
              enabled: analysis.compilation.isOptimized || false,
              runs: analysis.compilation.optimizationRuns || 200,
            },
            errors: analysis.compilation.errors,
            warnings: analysis.compilation.warnings,
            compilationTime: analysis.compilation.compilationTime,
            bytecodeSize: analysis.compilation.bytecodeSize,
            gasEstimates: analysis.compilation.gasEstimates,
            bytecodeAnalysis: analysis.compilation.bytecodeAnalysis ? {
              size: analysis.compilation.bytecodeAnalysis.size?.bytes || 0,
              complexityScore: analysis.compilation.bytecodeAnalysis.complexity?.score || 0,
              opcodeCount: analysis.compilation.bytecodeAnalysis.opcodeDistribution?.length || 0,
              topOpcodes: analysis.compilation.bytecodeAnalysis.opcodeDistribution?.map(op => ({
                opcode: op.name,
                count: op.count,
                percentage: op.percentage,
              })) || [],
              deploymentCostMultiplier: 1,
            } : undefined,
          }
        : {
            success: false,
            bytecode: '',
            abi: [],
            compilerVersion: '0.8.19',
            optimizationSettings: { enabled: false, runs: 200 },
          },
      networkResults: analysis.networkResults?.map((result) => ({
        network: result.network,
        networkDisplayName: result.networkDisplayName || result.network,
        chainId: result.chainId || 0,
        deploymentGas: {
           gasLimit: result.deploymentGas?.gasUsed || 0,
           gasPrice: (result.deploymentGas?.gasPrice || 0) / 1e9, // Convert wei to gwei
           totalCost: result.deploymentGas?.gasCost || '0',
           totalCostUSD: result.deploymentGas?.gasCostUSD || 0,
           gasUsed: result.deploymentGas?.gasUsed,
           effectiveGasPrice: result.deploymentGas?.gasPrice,
           gasCost: result.deploymentGas?.gasCost,
         },
        functionGasEstimates: result.functionGasEstimates || {},
        timestamp: result.timestamp || new Date().toISOString(),
        contractAddress: result.contractAddress,
        blockNumber: result.blockNumber,
        transactionHash: result.transactionHash,
        networkStatus: result.networkStatus ? {
          isOnline: result.networkStatus.isConnected,
          latency: result.networkStatus.latency || 0,
          blockHeight: result.networkStatus.blockNumber || 0,
        } : undefined,
      })) || [],
      metadata: analysis.metadata ? {
        solidityVersion: analysis.metadata.solidityVersion || '',
        optimizationLevel: (analysis.metadata.optimizationLevel as OptimizationLevel) || OptimizationLevel.MEDIUM,
        gasEstimationType: (analysis.metadata.gasEstimationType as GasEstimationType) || GasEstimationType.BOTH,
        totalNetworks: analysis.metadata.totalNetworks || 0,
        successfulNetworks: analysis.metadata.successfulNetworks || 0,
        failedNetworks: analysis.metadata.failedNetworks || [],
      } : undefined,
    };
  }

  /**
   * Generate source code hash
   */
  private generateSourceCodeHash(sourceCode: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(sourceCode).digest('hex');
  }

  /**
   * Quick comparison between networks (simplified version)
   */
  async quickCompare(request: CompareNetworksRequestDto): Promise<any> {
    try {
      this.logger.log(
        `Starting quick comparison for contract: ${request.contractName}`,
      );

      // Validate networks
      const allNetworks = [request.baselineNetwork, ...request.comparisonNetworks];
      this.validateNetworks(allNetworks);

      // For quick comparison, we'll use the existing quickComparison method
      // with the first comparison network
      const comparisonNetwork = request.comparisonNetworks[0];
      
      return await this.quickComparison(
        request.baselineNetwork,
        comparisonNetwork,
        request.sourceCode, // Using source code as bytecode for now
      );
    } catch (error) {
      this.logger.error(
        `Failed to perform quick comparison: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}