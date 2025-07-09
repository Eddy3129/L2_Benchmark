import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// Base service
import { BaseService } from '../../../common/base.service';

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

// Entities
import { GasAnalysis } from '../entities/gas-analysis.entity';
import { NetworkResult } from '../entities/network-result.entity';
import { CompilationResult } from '../entities/compilation-result.entity';

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
export class GasAnalysisService extends BaseService {
  protected readonly logger = new Logger(GasAnalysisService.name);

  constructor(
    @InjectRepository(GasAnalysis)
    private readonly gasAnalysisRepository: Repository<GasAnalysis>,
    @InjectRepository(NetworkResult)
    private readonly networkResultRepository: Repository<NetworkResult>,
    @InjectRepository(CompilationResult)
    private readonly compilationResultRepository: Repository<CompilationResult>,
    private readonly configService: ConfigService,
    private readonly contractCompilationService: ContractCompilationService,
    private readonly networkAnalysisService: NetworkAnalysisService,
    private readonly bytecodeAnalysisService: BytecodeAnalysisService,
  ) {
    super();
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
      const analysis = new GasAnalysis();
      analysis.contractName = request.contractName;
      analysis.sourceCodeHash = StringUtils.generateRandomString(32); // In real implementation, use proper hash
      analysis.analysisType = request.analysisType || AnalysisType.BASIC;
      analysis.duration = Date.now() - startTime;
      
      // Save compilation result
      const compilationEntity = new CompilationResult();
      Object.assign(compilationEntity, compilation);
      if (bytecodeAnalysis) {
        compilationEntity.bytecodeAnalysis = bytecodeAnalysis as any;
      }
      
      const savedCompilation = await this.compilationResultRepository.save(compilationEntity);
      analysis.compilation = savedCompilation;
      
      // Save network results
      const networkEntities = successfulResults.map(result => {
        const entity = new NetworkResult();
        Object.assign(entity, result);
        return entity;
      });
      
      const savedNetworkResults = await this.networkResultRepository.save(networkEntities);
      analysis.networkResults = savedNetworkResults;
      
      // Save analysis if requested
      let savedAnalysis;
      if (request.saveResults !== false) {
        savedAnalysis = await this.gasAnalysisRepository.save(analysis);
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
            enabled: compilation.optimizationSettings.enabled,
            runs: compilation.optimizationSettings.runs,
          },
          bytecodeAnalysis: bytecodeAnalysis as any,
        },
        networkResults: successfulResults,
        analysisType: request.analysisType || AnalysisType.BASIC,
        createdAt: new Date().toISOString(),
        duration: analysis.duration,
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
      
      // Build query
      const queryBuilder = this.gasAnalysisRepository
        .createQueryBuilder('analysis')
        .leftJoinAndSelect('analysis.compilation', 'compilation')
        .leftJoinAndSelect('analysis.networkResults', 'networkResults')
        .orderBy('analysis.createdAt', query.sortOrder || 'DESC');
      
      // Apply filters
      if (query.contractName) {
        queryBuilder.andWhere('analysis.contractName ILIKE :contractName', {
          contractName: `%${query.contractName}%`,
        });
      }
      
      if (query.network) {
        queryBuilder.andWhere('networkResults.network = :network', {
          network: query.network,
        });
      }
      
      if (query.analysisType) {
        queryBuilder.andWhere('analysis.analysisType = :analysisType', {
          analysisType: query.analysisType,
        });
      }
      
      if (query.dateRange?.startDate) {
        queryBuilder.andWhere('analysis.createdAt >= :startDate', {
          startDate: query.dateRange.startDate,
        });
      }
      
      if (query.dateRange?.endDate) {
        queryBuilder.andWhere('analysis.createdAt <= :endDate', {
          endDate: query.dateRange.endDate,
        });
      }
      
      // Get total count
      const totalItems = await queryBuilder.getCount();
      
      // Get paginated results
      const analyses = await queryBuilder
        .skip(skip)
        .take(limit)
        .getMany();
      
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
      const analysis = await this.gasAnalysisRepository.findOne({
        where: { id },
        relations: ['compilation', 'networkResults'],
      });
      
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
      const totalAnalyses = await this.gasAnalysisRepository.count();
      
      const recentAnalyses = await this.gasAnalysisRepository
        .createQueryBuilder('analysis')
        .select('COUNT(*)', 'count')
        .addSelect('DATE_TRUNC(\'day\', analysis.createdAt)', 'date')
        .where('analysis.createdAt >= :date', {
          date: DateUtils.getLastNDays(30).startDate,
        })
        .groupBy('DATE_TRUNC(\'day\', analysis.createdAt)')
        .orderBy('date', 'DESC')
        .getRawMany();
      
      const topContracts = await this.gasAnalysisRepository
        .createQueryBuilder('analysis')
        .select('analysis.contractName', 'contractName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analysis.contractName')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();
      
      const averageDuration = await this.gasAnalysisRepository
        .createQueryBuilder('analysis')
        .select('AVG(analysis.duration)', 'avgDuration')
        .getRawOne();
      
      return {
        totalAnalyses,
        recentActivity: {
          last30Days: recentAnalyses.reduce((sum, item) => sum + parseInt(item.count), 0),
          dailyBreakdown: recentAnalyses,
        },
        topContracts,
        averageDuration: Math.round(averageDuration?.avgDuration || 0),
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
      id: analysis.id,
      contractName: analysis.contractName,
      compilation: {
        success: compilation.success,
        bytecode: compilation.bytecode || '',
        abi: compilation.abi || [],
        compilerVersion: compilation.compilerVersion || '0.8.19',
        optimizationSettings: compilation.optimizationSettings || { enabled: false, runs: 200 },
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
      analysisType: analysis.analysisType,
      createdAt: analysis.createdAt.toISOString(),
      duration: analysis.duration || 0,
      metadata: {
        solidityVersion: compilation.compilerVersion || '0.8.19',
        optimizationLevel: compilation.optimizationSettings?.enabled ? 'medium' as any : 'none' as any,
        gasEstimationType: 'both' as any,
        totalNetworks: networkResults.length,
        successfulNetworks: networkResults.filter(r => r.deploymentGas).length,
        failedNetworks: networkResults.filter(r => !r.deploymentGas).map(r => r.network),
      },
    };
  }
}