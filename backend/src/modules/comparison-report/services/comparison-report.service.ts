import { Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '../../../shared/data-storage.service';
import { BaseDataService } from '../../../common/base.service';
import {
  CreateComparisonReportDto,
  UpdateComparisonReportDto,
  ComparisonReportDto,
  ComparisonReportStatsDto,
  ReportStatus,
  ReportType,
  SavingsMetric,
  ComparisonType
} from '../../../common/dto/comparison-report.dto';

// Define ComparisonReport interface since TypeORM entities are removed
interface ComparisonReport {
  id: string;
  title: string;
  description?: string;
  reportType: ComparisonType;
  status: ReportStatus;
  contractName: string;
  sourceCodeHash: string;
  networksCompared: string[];
  comparisonConfig: any;
  savingsBreakdown: {
    breakdown: Array<{
      networkId: string;
      networkName?: string;
      cost: number;
      gasUsed: number;
      savings: number;
      rank?: number;
    }>;
  };
  executiveSummary: any;
  chartData: any;
  metadata: any;
  totalGasDifference: number;
  savingsPercentage: number;
  maxSavings?: number;
  avgSavings?: number;
  mostExpensiveNetwork?: string;
  cheapestNetwork?: string;
  totalNetworks?: number;
  sections?: Array<{
    sectionType: string;
    title: string;
    content: string;
  }>;
  generationDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ComparisonReportService extends BaseDataService<any> {
  protected readonly logger = new Logger(ComparisonReportService.name);

  constructor(
    private readonly dataStorageService: DataStorageService
  ) {
    super(dataStorageService, 'comparisonReports');
  }

  /**
   * Create a new comparison report
   */
  async createReport(request: CreateComparisonReportDto): Promise<ComparisonReportDto> {
    try {
      this.validateCreateRequest(request);
      
      const reportEntity = this.createReportEntity(request);
      const savedReport = await this.create(reportEntity);
      
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
      const savedReport = await this.updateById(id, request);
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
      const report = await this.findById(id);
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
      let reports = await this.findAll();
      
      // Apply filters
      if (filters?.status) {
        reports = reports.filter(report => report.status === filters.status);
      }
      
      if (filters?.type) {
        reports = reports.filter(report => report.type === filters.type);
      }
      
      if (filters?.userId) {
        reports = reports.filter(report => report.metadata?.userId === filters.userId);
      }
      
      // Sort by createdAt DESC
      reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      const offset = filters?.offset || 0;
      const limit = filters?.limit || reports.length;
      reports = reports.slice(offset, offset + limit);
      
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
      await this.deleteById(id);
    } catch (error) {
      this.logger.error(`Failed to delete comparison report: ${error.message}`, error.stack);
      throw new Error(`Failed to delete comparison report: ${error.message}`);
    }
  }

  /**
   * Get comparison report statistics
   */
  async getReportStatistics(): Promise<ComparisonReportStatsDto> {
    return this.getReportStats();
  }

  /**
   * Get comparison report statistics (alias for controller compatibility)
   */
  async getReportStats(): Promise<ComparisonReportStatsDto> {
    try {
      const allReports = await this.findAll();
      const totalReports = allReports.length;
      
      const byStatus = allReports.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, {} as Record<ReportStatus, number>);
      
      const byType = allReports.reduce((acc, report) => {
        acc[report.reportType] = (acc[report.reportType] || 0) + 1;
        return acc;
      }, {} as Record<ComparisonType, number>);
      
      // Calculate top networks
      const networkCounts = allReports.reduce((acc, report) => {
        report.networksCompared?.forEach(network => {
          if (!acc[network]) {
            acc[network] = { count: 0, totalSavings: 0 };
          }
          acc[network].count++;
          // Add mock savings data
          acc[network].totalSavings += Math.random() * 50;
        });
        return acc;
      }, {} as Record<string, { count: number; totalSavings: number }>);
      
      const topNetworks = Object.entries(networkCounts)
        .map(([network, data]) => ({
          network,
          count: (data as { count: number; totalSavings: number }).count,
          averageSavings: (data as { count: number; totalSavings: number }).totalSavings / (data as { count: number; totalSavings: number }).count
        }))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 5);
      
      // Calculate top contracts
      const contractCounts = allReports.reduce((acc, report) => {
        const contractName = report.contractName || 'Unknown';
        if (!acc[contractName]) {
          acc[contractName] = { count: 0, totalSavings: 0 };
        }
        acc[contractName].count++;
        // Add mock savings data
        acc[contractName].totalSavings += Math.random() * 30;
        return acc;
      }, {} as Record<string, { count: number; totalSavings: number }>);
      
      const topContracts = Object.entries(contractCounts)
        .map(([contractName, data]) => ({
          contractName,
          count: (data as { count: number; totalSavings: number }).count,
          averageSavings: (data as { count: number; totalSavings: number }).totalSavings / (data as { count: number; totalSavings: number }).count
        }))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 5);
      
      // Calculate recent activity
      const now = new Date();
      const last24Hours = allReports.filter(report => 
        new Date(report.createdAt) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
      ).length;
      const last7Days = allReports.filter(report => 
        new Date(report.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      ).length;
      const last30Days = allReports.filter(report => 
        new Date(report.createdAt) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      
      return {
        totalReports,
        byType,
        byStatus,
        topNetworks,
        topContracts,
        recentActivity: {
          last24Hours,
          last7Days,
          last30Days
        },
        averages: {
          reportGenerationTime: 45.5, // Mock data
          networksPerReport: allReports.length > 0 ? 
            allReports.reduce((sum, report) => sum + (report.networksCompared?.length || 0), 0) / allReports.length : 0,
          savingsPercentage: 25.3 // Mock data
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
      const report = await this.findById(id);
      if (!report) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }

      report.status = ReportStatus.PUBLISHED;
      report.updatedAt = new Date();
      
      const savedReport = await this.updateById(id, report);
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
      const report = await this.findById(id);
      if (!report) {
        throw new Error(`Comparison report with ID ${id} not found`);
      }

      report.status = ReportStatus.ARCHIVED;
      report.updatedAt = new Date();
      
      const savedReport = await this.updateById(id, report);
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
      let reports = await this.findAll();
      
      if (contractName) {
        reports = reports.filter(report => 
          report.title && report.title.toLowerCase().includes(contractName.toLowerCase())
        );
      }
      
      if (networks && networks.length > 0) {
        reports = reports.filter(report => 
          report.networksCompared && 
          networks.some(network => report.networksCompared.includes(network))
        );
      }
      
      reports = reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (limit) {
        reports = reports.slice(0, limit);
      }
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
      status: entity.status as ReportStatus,
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