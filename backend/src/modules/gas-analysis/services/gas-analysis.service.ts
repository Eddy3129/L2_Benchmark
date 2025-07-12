import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Base service
import { BaseDataService } from '../../../common/base.service';
import { DataStorageService } from '../../../shared/data-storage.service';

// DTOs
import {
  AnalyzeContractRequestDto,
  GasAnalysisResultDto,
  GasAnalysisQueryDto,
  NetworkAnalysisResultDto,
  AnalysisType,
  OptimizationLevel,
  GasEstimationType,
} from '../../../common/dto/gas-analysis.dto';
import { PaginationMetaDto } from '../../../common/dto/base.dto';

// Local interface definitions since entities were removed
interface GasAnalysis {
  id?: string;
  contractName?: string;
  analysisType?: string;
  contractInfo?: {
    contractName?: string;
    sourceCodeHash?: string;
    sourceCode?: string;
    contractPath?: string;
    language?: string;
    version?: string;
  };
  analysisConfig?: {
    analysisType?: string;
    gasEstimationType?: string;
    optimizationLevel?: string;
    targetNetworks?: string[];
    includeL2Networks?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
  analysisResults?: {
    duration?: number;
    totalNetworks?: number;
    successfulNetworks?: number;
    failedNetworks?: string[];
    averageGasCost?: number;
    lowestGasCost?: { network: string; gasUsed: number };
    highestGasCost?: { network: string; gasUsed: number };
    gasSavings?: { amount: number; percentage: number };
  };
  metadata?: {
    networks?: string[];
    solidityVersion?: string;
    optimizationSettings?: any;
    functionCalls?: any[];
    totalNetworks?: number;
    successfulNetworks?: number;
    failedNetworks?: string[];
    optimizationLevel?: string;
    gasEstimationType?: string;
  };
  compilation?: any;
  networkResults?: NetworkResult[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface NetworkResult {
  id?: string;
  network?: string;
  networkDisplayName?: string;
  chainId?: number;
  gasEstimates?: any;
  deploymentGas?: any;
  functionGasEstimates?: any;
  deploymentCost?: number;
  executionCosts?: any;
  timestamp?: string;
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: number;
  networkStatus?: {
    isConnected?: boolean;
    latency?: number;
    blockNumber?: number;
  };
  createdAt?: Date;
}

interface CompilationResult {
  id?: string;
  success?: boolean;
  errors?: string[];
  bytecode?: string;
  abi?: any[];
  metadata?: any;
  bytecodeAnalysis?: any;
}

// Services
import { ContractCompilationService } from './contract-compilation.service';
import { NetworkAnalysisService } from './network-analysis.service';
import { BytecodeAnalysisService } from './bytecode-analysis.service';
import { NetworkConfigService } from '../../../config/network.config';
import { ValidationUtils } from '../../../shared/validation-utils';

// Types for network analysis result
// NetworkAnalysisResultDto is imported from DTO file

class DateUtils {
  static getLastNDays(days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  }
}

class StringUtils {
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Constants
const ERROR_MESSAGES = {
  COMPILATION: {
    FAILED: 'Contract compilation failed'
  },
  VALIDATION: {
    INVALID_NETWORK: 'Invalid network specified',
    INVALID_CONTRACT_NAME: 'Invalid contract name',
    INVALID_CODE: 'Invalid Solidity code',
    INVALID_SOLIDITY_VERSION: 'Invalid Solidity version'
  }
};

const SUCCESS_MESSAGES = {
  ANALYSIS: {
    COMPLETED: 'Analysis completed successfully'
  }
};

const PAGINATION_CONSTANTS = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};



@Injectable()
export class GasAnalysisService extends BaseDataService<GasAnalysis> {
  protected readonly logger = new Logger(GasAnalysisService.name);

  constructor(
    private readonly dataStorageService: DataStorageService,
    private readonly configService: ConfigService,
    private readonly contractCompilationService: ContractCompilationService,
    private readonly networkAnalysisService: NetworkAnalysisService,
    private readonly bytecodeAnalysisService: BytecodeAnalysisService,
  ) {
    super(dataStorageService, 'gasAnalyses');
  }

  /**
   * Analyzes contract gas costs across multiple networks
   */
  async analyzeContract(request: AnalyzeContractRequestDto): Promise<GasAnalysisResultDto> {
    try {
      const startTime = Date.now();
      
      // Validate request
      await this.validateAnalysisRequest(request);
      
      // Compile contract
      const compilation = await this.contractCompilationService.compileContract({
        contractName: request.contractName,
        sourceCode: request.sourceCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: request.optimizationLevel || OptimizationLevel.MEDIUM,
        optimizationRuns: request.optimizationRuns || 200,
      });
      
      if (!compilation.success) {
        throw new BadRequestException({
          message: ERROR_MESSAGES.COMPILATION.FAILED,
          errors: compilation.errors,
        });
      }
      
      // Perform bytecode analysis if requested
      let bytecodeAnalysis;
      if (request.includeBytecodeAnalysis) {
        bytecodeAnalysis = await this.bytecodeAnalysisService.analyzeBytecode(compilation.bytecode);
      }
      
      // Analyze networks in parallel
      const networkPromises = request.networks.map(network =>
        this.networkAnalysisService.analyzeNetwork({
          network,
          compilation,
          functionCalls: request.functionCalls || [],
          constructorArgs: request.constructorArgs || [],
          gasEstimationType: request.gasEstimationType,
        })
      );
      
      const networkResults = await Promise.allSettled(networkPromises);
      
      // Process results
      const successfulResults: NetworkAnalysisResultDto[] = [];
      const failedNetworks: string[] = [];
      
      networkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          failedNetworks.push(request.networks[index]);
          this.logger.error(`Network analysis failed for ${request.networks[index]}:`, result.reason);
        }
      });
      
      if (successfulResults.length === 0) {
        throw new BadRequestException('All network analyses failed');
      }
      
      // Create analysis entity
      const analysis: GasAnalysis = {
        contractInfo: {
          contractName: request.contractName,
          sourceCodeHash: StringUtils.generateRandomString(32), // In real implementation, use proper hash
          sourceCode: request.sourceCode,
          contractPath: '',
          language: 'solidity',
          version: request.solidityVersion || '0.8.19'
        },
        analysisConfig: {
          analysisType: request.analysisType || AnalysisType.BASIC,
          gasEstimationType: request.gasEstimationType || 'both',
          optimizationLevel: request.optimizationLevel || 'medium',
          targetNetworks: request.networks,
          includeL2Networks: true,
          maxRetries: 3,
          timeout: 30000
        },
        analysisResults: {
          duration: Date.now() - startTime,
          totalNetworks: request.networks.length,
          successfulNetworks: successfulResults.length,
          failedNetworks,
          averageGasCost: 0,
          lowestGasCost: { network: '', gasUsed: 0 },
          highestGasCost: { network: '', gasUsed: 0 },
          gasSavings: { amount: 0, percentage: 0 }
        }
      };
      
      // Save compilation result
      const compilationEntity: CompilationResult = {
        ...compilation,
        bytecodeAnalysis: bytecodeAnalysis as any
      };
      
      const savedCompilation = await this.dataStorageService.create('compilationResults', compilationEntity);
      analysis.compilation = savedCompilation;
      
      // Save network results
      const networkEntities = successfulResults.map(result => ({
        ...result
      } as NetworkResult));
      
      const savedNetworkResults = await Promise.all(
        networkEntities.map(entity => this.dataStorageService.create('networkResults', entity))
      );
      analysis.networkResults = savedNetworkResults;
      
      // Save analysis if requested
      let savedAnalysis;
      if (request.saveResults !== false) {
        savedAnalysis = await this.create(analysis);
      }
      
      // Transform to DTO
      const result: GasAnalysisResultDto = {
        id: savedAnalysis?.id || StringUtils.generateRandomString(16),
        contractName: request.contractName,
        compilation: {
          success: compilation.success,
          bytecode: compilation.bytecode,
          abi: compilation.abi,
          compilerVersion: compilation.compilerVersion,
          optimizationSettings: {
          enabled: compilation.optimizationSettings?.enabled || false,
          runs: compilation.optimizationSettings?.runs || 200,
        },
          bytecodeAnalysis: bytecodeAnalysis as any,
        },
        networkResults: successfulResults,
        analysisType: request.analysisType || AnalysisType.BASIC,
        createdAt: new Date().toISOString(),
        duration: analysis.analysisResults?.duration || 0,
        metadata: {
          solidityVersion: request.solidityVersion || '0.8.19',
          optimizationLevel: request.optimizationLevel || 'medium' as any,
          gasEstimationType: request.gasEstimationType || 'both' as any,
          totalNetworks: request.networks.length,
          successfulNetworks: successfulResults.length,
          failedNetworks,
        },
      };
      
      return result;
    } catch (error) {
      this.handleError(error, 'Failed to analyze contract');
    }
  }

  /**
   * Retrieves paginated gas analysis history
   */
  async getAnalysisHistory(query: GasAnalysisQueryDto): Promise<{
    data: GasAnalysisResultDto[];
    meta: PaginationMetaDto;
  }> {
    try {
      const { limit, offset } = ValidationUtils.validatePaginationParams(String(query.limit), query.page ? String((parseInt(String(query.page)) - 1) * parseInt(String(query.limit || '10'))) : undefined);
      const page = query.page ? parseInt(String(query.page)) : 1;
      const skip = (page - 1) * limit;
      
      // Get all analyses and apply manual filtering
      const allAnalyses = await this.findAll();
      
      // Apply filters
      let filteredAnalyses = allAnalyses.filter(analysis => {
        if (query.contractName && !analysis.contractInfo?.contractName?.toLowerCase().includes(query.contractName.toLowerCase())) {
          return false;
        }
        
        if (query.analysisType && analysis.analysisConfig?.analysisType !== query.analysisType) {
          return false;
        }
        
        if (query.dateRange?.startDate && analysis.createdAt && new Date(analysis.createdAt) < new Date(query.dateRange.startDate)) {
          return false;
        }
        
        if (query.dateRange?.endDate && analysis.createdAt && new Date(analysis.createdAt) > new Date(query.dateRange.endDate)) {
          return false;
        }
        
        return true;
      });
      
      // Sort
      filteredAnalyses.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return query.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });
      
      const totalItems = filteredAnalyses.length;
      
      // Apply pagination
      const analyses = filteredAnalyses.slice(skip, skip + limit);
      
      // Transform to DTOs
      const data = analyses.map(analysis => this.transformAnalysisToDto(analysis));
      
      const meta = new PaginationMetaDto(page, limit, totalItems);
      
      return { data, meta };
    } catch (error) {
      this.handleError(error, 'Failed to retrieve analysis history');
    }
  }

  /**
   * Retrieves a specific gas analysis by ID
   */
  async getAnalysisById(id: string): Promise<GasAnalysisResultDto> {
    try {
      const analysis = await this.findById(id);
      
      if (!analysis) {
        throw new NotFoundException(`Gas analysis with ID '${id}' not found`);
      }
      
      return this.transformAnalysisToDto(analysis);
    } catch (error) {
      this.handleError(error, `Failed to retrieve analysis with ID '${id}'`);
    }
  }

  /**
   * Validates Solidity code without performing full analysis
   */
  async validateSolidityCode(
    sourceCode: string,
    solidityVersion?: string,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      // Basic validation
      const basicValidation = ValidationUtils.validateSolidityCode(sourceCode);
      if (!basicValidation.isValid) {
        return {
          isValid: false,
          errors: basicValidation.errors,
          warnings: [],
        };
      }
      
      // Compilation validation
      const compilation = await this.contractCompilationService.validateCode({
        sourceCode,
        solidityVersion: solidityVersion || '0.8.19',
      });
      
      return {
        isValid: compilation.success,
        errors: compilation.errors || [],
        warnings: compilation.warnings || [],
      };
    } catch (error) {
      this.handleError(error, 'Failed to validate Solidity code');
    }
  }

  /**
   * Retrieves analysis statistics
   */
  async getAnalysisStatistics(): Promise<any> {
    try {
      const allAnalyses = await this.findAll();
      const totalAnalyses = allAnalyses.length;
      
      // Calculate recent analyses (last 30 days)
      const thirtyDaysAgo = DateUtils.getLastNDays(30).startDate;
      const recentAnalyses = allAnalyses.filter(analysis => 
        analysis.createdAt && new Date(analysis.createdAt) >= thirtyDaysAgo
      );
      
      // Group by day for daily breakdown
      const dailyBreakdown = recentAnalyses.reduce((acc, analysis) => {
        if (analysis.createdAt) {
          const date = new Date(analysis.createdAt).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const dailyBreakdownArray = Object.entries(dailyBreakdown)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Calculate top contracts
      const contractCounts = allAnalyses.reduce((acc, analysis) => {
        const contractName = analysis.contractInfo?.contractName || 'Unknown';
        acc[contractName] = (acc[contractName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topContracts = Object.entries(contractCounts)
        .map(([contractName, count]) => ({ contractName, count }))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10);
      
      // Calculate average duration
      const durationsWithValues = allAnalyses
        .map(analysis => analysis.analysisResults?.duration)
        .filter(duration => duration !== undefined && duration !== null) as number[];
      
      const averageDuration = durationsWithValues.length > 0 
        ? Math.round(durationsWithValues.reduce((sum, duration) => sum + duration, 0) / durationsWithValues.length)
        : 0;
      
      return {
        totalAnalyses,
        recentActivity: {
          last30Days: recentAnalyses.length,
          dailyBreakdown: dailyBreakdownArray,
        },
        topContracts,
        averageDuration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError(error, 'Failed to retrieve analysis statistics');
    }
  }

  /**
   * Validates networks for analysis
   */
  async validateNetworks(networks: string[]): Promise<void> {
    const { invalid } = NetworkConfigService.validateNetworks(networks);
    if (invalid.length > 0) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.VALIDATION.INVALID_NETWORK,
        invalidNetworks: invalid,
      });
    }
  }

  /**
   * Validates analysis request
   */
  private async validateAnalysisRequest(request: AnalyzeContractRequestDto): Promise<void> {
    // Validate contract name
    if (!ValidationUtils.validateContractName(request.contractName)) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.INVALID_CONTRACT_NAME);
    }
    
    // Validate Solidity code
    const codeValidation = ValidationUtils.validateSolidityCode(request.sourceCode);
    if (!codeValidation.isValid) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.VALIDATION.INVALID_CODE,
        errors: codeValidation.errors,
      });
    }
    
    // Validate Solidity version
    if (request.solidityVersion && !ValidationUtils.validateSolidityVersion(request.solidityVersion)) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.INVALID_SOLIDITY_VERSION);
    }
    
    // Validate networks
    if (!request.networks || request.networks.length === 0) {
      throw new BadRequestException('At least one network must be specified');
    }
    
    await this.validateNetworks(request.networks);
  }

  /**
   * Transforms entity to DTO
   */
  private transformAnalysisToDto(analysis: GasAnalysis): GasAnalysisResultDto {
    // Safely handle compilation data
    const compilation = analysis.compilation;
    if (!compilation) {
      throw new Error('Compilation data is required for analysis result');
    }

    // Safely handle network results
    const networkResults = analysis.networkResults || [];
    
    return {
      id: analysis.id || StringUtils.generateRandomString(16),
      contractName: analysis.contractName || analysis.contractInfo?.contractName || 'Unknown Contract',
      compilation: {
        success: compilation.success,
        bytecode: compilation.bytecode || '',
        abi: compilation.abi || [],
        compilerVersion: compilation.compilerVersion || '0.8.19',
        optimizationSettings: { enabled: compilation.optimizationEnabled, runs: compilation.optimizationRuns || 200 },
        bytecodeAnalysis: compilation.bytecodeAnalysis as any,
        errors: compilation.errors,
        warnings: compilation.warnings,
      },
      networkResults: networkResults.map(result => ({
        network: result.network,
        networkDisplayName: result.networkDisplayName || result.network,
        chainId: result.chainId,
        deploymentGas: result.deploymentGas || {
          gasLimit: 0,
          gasPrice: 0,
          totalCost: '0',
          totalCostUSD: 0,
        },
        functionGasEstimates: result.functionGasEstimates || {},
        timestamp: result.timestamp || new Date().toISOString(),
        contractAddress: result.contractAddress,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        networkStatus: result.networkStatus ? {
          isOnline: result.networkStatus.isConnected,
          latency: result.networkStatus.latency || 0,
          blockHeight: result.networkStatus.blockNumber || 0,
        } : undefined,
      } as NetworkAnalysisResultDto)),
      analysisType: (analysis.analysisType || analysis.analysisConfig?.analysisType || AnalysisType.BASIC) as AnalysisType,
      createdAt: analysis.createdAt?.toISOString() || new Date().toISOString(),
      duration: analysis.analysisResults?.duration || 0,
      metadata: {
        solidityVersion: compilation.compilerVersion || '0.8.19',
        optimizationLevel: compilation.optimizationEnabled ? 'medium' as any : 'none' as any,
        gasEstimationType: 'both' as any,
        totalNetworks: networkResults.length,
        successfulNetworks: networkResults.filter(r => r.deploymentGas).length,
        failedNetworks: networkResults.filter(r => !r.deploymentGas).map(r => r.network || 'unknown'),
      },
    };
  }
}