import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepositoryService } from '../../../common/base.service';
import { ComparisonReport } from '../entities/comparison-report.entity';
import {
  CreateComparisonReportDto,
  UpdateComparisonReportDto,
  ComparisonReportDto,
  ComparisonReportStatsDto,
  ReportStatus,
  ReportType,
  SavingsMetric
} from '../../../common/dto/comparison-report.dto';

@Injectable()
export class ComparisonReportService extends BaseRepositoryService<ComparisonReport> {
  protected readonly logger = new Logger(ComparisonReportService.name);

  constructor(
    @InjectRepository(ComparisonReport)
    private readonly comparisonReportRepository: Repository<ComparisonReport>
  ) {
    super(comparisonReportRepository);
  }

  /**
   * Create a new comparison report
   */
  async createReport(request: CreateComparisonReportDto): Promise<ComparisonReportDto> {
    try {
      this.validateCreateRequest(request);
      
      const reportEntity = this.createReportEntity(request);
      const savedReport = await this.comparisonReportRepository.save(reportEntity);
      
      return this.transformToComparisonReportDto(savedReport);
    } catch (error) {
      this.logger.error(`Failed to create comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to create comparison report: ${error.message}`);
    }
  }

  /**
   * Update an existing comparison report
   */
  async updateReport(id: string, request: UpdateComparisonReportDto): Promise<ComparisonReportDto> {
    try {
      const existingReport = await this.comparisonReportRepository.findOne({ where: { id } });
      if (!existingReport) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }

      const updatedEntity = {
        ...existingReport,
        ...request,
        updatedAt: new Date()
      };

      const savedReport = await this.comparisonReportRepository.save(updatedEntity);
      return this.transformToComparisonReportDto(savedReport);
    } catch (error) {
      this.logger.error(`Failed to update comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to update comparison report: ${error.message}`);
    }
  }

  /**
   * Get comparison report by ID
   */
  async getReportById(id: string): Promise<ComparisonReportDto> {
    try {
      const report = await this.comparisonReportRepository.findOne({ where: { id } });
      if (!report) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }
      return this.transformToComparisonReportDto(report);
    } catch (error) {
      this.logger.error(`Failed to get comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to get comparison report: ${error.message}`);
    }
  }

  /**
   * Get all comparison reports with optional filtering
   */
  async getAllReports(filters?: {
    status?: ReportStatus;
    type?: ReportType;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ComparisonReportDto[]> {
    try {
      const queryBuilder = this.comparisonReportRepository.createQueryBuilder('report');
      
      if (filters?.status) {
        queryBuilder.andWhere('report.status = :status', { status: filters.status });
      }
      
      if (filters?.type) {
        queryBuilder.andWhere('report.type = :type', { type: filters.type });
      }
      
      if (filters?.userId) {
        queryBuilder.andWhere('report.metadata ->> \'userId\' = :userId', { userId: filters.userId });
      }
      
      if (filters?.limit) {
        queryBuilder.limit(filters.limit);
      }
      
      if (filters?.offset) {
        queryBuilder.offset(filters.offset);
      }
      
      queryBuilder.orderBy('report.createdAt', 'DESC');
      
      const reports = await queryBuilder.getMany();
      return reports.map(report => this.transformToComparisonReportDto(report));
    } catch (error) {
      this.logger.error(`Failed to get all comparison reports: ${error.message}`, error.stack);
      throw new Error(`Failed to get all comparison reports: ${error.message}`);
    }
  }

  /**
   * Delete comparison report by ID
   */
  async deleteReport(id: string): Promise<void> {
    try {
      const result = await this.comparisonReportRepository.delete(id);
      if (result.affected === 0) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to delete comparison report: ${error.message}`);
    }
  }

  /**
   * Get comparison report statistics
   */
  async getReportStats(): Promise<ComparisonReportStatsDto> {
    try {
      const totalReports = await this.comparisonReportRepository.count();
      
      // Get counts by status
      const statusCounts = await this.comparisonReportRepository
        .createQueryBuilder('report')
        .select('report.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('report.status')
        .getRawMany();
      
      // Initialize all status counts
      const byStatus = {
        [ReportStatus.PENDING]: 0,
        [ReportStatus.PROCESSING]: 0,
        [ReportStatus.COMPLETED]: 0,
        [ReportStatus.FAILED]: 0,
        [ReportStatus.DRAFT]: 0,
        [ReportStatus.PUBLISHED]: 0,
        [ReportStatus.ARCHIVED]: 0
      };
      
      // Update with actual counts
      statusCounts.forEach(({ status, count }) => {
        if (byStatus.hasOwnProperty(status)) {
          byStatus[status] = parseInt(count, 10);
        }
      });
      
      // Get counts by type
      const typeCounts = await this.comparisonReportRepository
        .createQueryBuilder('report')
        .select('report.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('report.type')
        .getRawMany();
      
      const byType = {
        network_comparison: 0,
        blob_cost_comparison: 0,
        historical_comparison: 0,
        optimization_comparison: 0
      };
      typeCounts.forEach(({ type, count }) => {
        if (byType.hasOwnProperty(type)) {
          byType[type] = parseInt(count, 10);
        }
      });
      
      return {
        totalReports,
        byStatus,
        byType,
        topNetworks: [],
        topContracts: [],
        recentActivity: {
          last24Hours: 0,
          last7Days: 0,
          last30Days: 0
        },
        averages: {
          reportGenerationTime: 0,
          networksPerReport: 0,
          savingsPercentage: 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get report statistics: ${error.message}`, error.stack);
      throw new Error(`Failed to get report statistics: ${error.message}`);
    }
  }

  /**
   * Validate create request
   */
  private validateCreateRequest(request: CreateComparisonReportDto): void {
    if (!request.analysisIds || !Array.isArray(request.analysisIds) || request.analysisIds.length === 0) {
      throw new Error('analysisIds is required and must be a non-empty array');
    }
    
    if (!request.comparisonNetworks || !Array.isArray(request.comparisonNetworks) || request.comparisonNetworks.length === 0) {
      throw new Error('comparisonNetworks is required and must be a non-empty array');
    }
    
    if (!request.type) {
      throw new Error('type is required');
    }
  }

  /**
   * Create report entity from request
   */
  private createReportEntity(request: CreateComparisonReportDto): Partial<ComparisonReport> {
    const now = new Date();
    
    return {
      title: request.title || `Comparison Report - ${now.toISOString()}`,
      description: request.description || '',
      reportType: request.type,
      status: request.status || ReportStatus.PENDING,
      contractName: request.title || 'Unknown Contract',
      sourceCodeHash: 'placeholder-hash',
      networksCompared: request.comparisonNetworks || [],
      comparisonConfig: request.config || {
        optimizationLevel: 'medium',
        evmVersion: 'london',
        includeDeployment: true,
        includeFunctionCalls: true
      },
      savingsBreakdown: {
        metric: 'gas_cost' as SavingsMetric,
        totalSavings: 0,
        savingsPercentage: 0,
        bestNetwork: '',
        worstNetwork: '',
        breakdown: []
      },
      executiveSummary: {
        keyFindings: [],
        recommendations: [],
        riskAssessment: 'pending',
        implementationComplexity: 'medium' as const
      },
      generationDuration: 0,
      metadata: {
        generatedBy: 'system',
        version: '1.0.0',
        analysisIds: request.analysisIds || [],
        tags: request.tags || [],
        customFields: {},
        userId: request.userId
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Publish a comparison report
   */
  async publishReport(id: string): Promise<ComparisonReportDto> {
    try {
      const report = await this.comparisonReportRepository.findOne({ where: { id } });
      if (!report) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }

      report.status = ReportStatus.PUBLISHED;
      report.updatedAt = new Date();
      
      const savedReport = await this.comparisonReportRepository.save(report);
      return this.transformToComparisonReportDto(savedReport);
    } catch (error) {
      this.logger.error(`Failed to publish comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to publish comparison report: ${error.message}`);
    }
  }

  /**
   * Archive a comparison report
   */
  async archiveReport(id: string): Promise<ComparisonReportDto> {
    try {
      const report = await this.comparisonReportRepository.findOne({ where: { id } });
      if (!report) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }

      report.status = ReportStatus.ARCHIVED;
      report.updatedAt = new Date();
      
      const savedReport = await this.comparisonReportRepository.save(report);
      return this.transformToComparisonReportDto(savedReport);
    } catch (error) {
      this.logger.error(`Failed to archive comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to archive comparison report: ${error.message}`);
    }
  }

  /**
   * Search for similar reports
   */
  async searchSimilarReports(
    contractName?: string,
    networks?: string[],
    limit?: number
  ): Promise<ComparisonReportDto[]> {
    try {
      const queryBuilder = this.comparisonReportRepository.createQueryBuilder('report');
      
      if (contractName) {
        queryBuilder.andWhere('LOWER(report.title) LIKE LOWER(:contractName)', { 
          contractName: `%${contractName}%` 
        });
      }
      
      if (networks && networks.length > 0) {
        queryBuilder.andWhere('report.reportData ->> \'comparisonNetworks\' @> :networks', {
          networks: JSON.stringify(networks)
        });
      }
      
      if (limit) {
        queryBuilder.limit(limit);
      }
      
      queryBuilder.orderBy('report.createdAt', 'DESC');
      
      const reports = await queryBuilder.getMany();
      return reports.map(report => this.transformToComparisonReportDto(report));
    } catch (error) {
      this.logger.error(`Failed to search similar reports: ${error.message}`, error.stack);
      throw new Error(`Failed to search similar reports: ${error.message}`);
    }
  }

  /**
   * Transform entity to DTO
   */
  private transformToComparisonReportDto(entity: ComparisonReport): ComparisonReportDto {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      type: entity.reportType,
      status: entity.status,
      contract: {
        name: entity.title || 'Unknown',
        sourceCodeHash: 'hash',
        compilationSettings: {
          version: '0.8.0',
          optimization: {
            enabled: true,
            runs: 200
          }
        }
      },
      baseline: {
        network: 'ethereum',
        networkDisplayName: 'Ethereum',
        chainId: 1,
        deploymentGas: {
          gasLimit: 0,
          gasPrice: 0,
          totalCost: '0',
          totalCostUSD: 0
        },
        functionGasEstimates: {},
        timestamp: new Date().toISOString(),
        blockNumber: 0
      },
      comparisons: [],
      summary: {
        totalNetworks: 0,
        bestNetwork: { name: '', totalSavings: '0', savingsPercentage: 0 },
        worstNetwork: { name: '', additionalCost: '0', costIncreasePercentage: 0 },
        averageSavings: { absoluteETH: '0', absoluteUSD: 0, percentage: 0 }
      },
      config: entity.comparisonConfig || {},
      tags: entity.metadata?.tags || [],
      timestamps: {
        created: entity.createdAt.toISOString(),
        updated: entity.updatedAt.toISOString()
      },
      metadata: entity.metadata || {}
    };
  }
}