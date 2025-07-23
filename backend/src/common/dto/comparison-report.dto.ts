import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsUUID,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { PaginationQueryDto, DateRangeQueryDto } from './base.dto';
import { NetworkAnalysisResultDto, GasEstimateDto } from './gas-analysis.dto';

// Enums
export enum ComparisonType {
  NETWORK_COMPARISON = 'network_comparison',
  BLOB_COST_COMPARISON = 'blob_cost_comparison',
  HISTORICAL_COMPARISON = 'historical_comparison',
  OPTIMIZATION_COMPARISON = 'optimization_comparison',
}

export enum ReportStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

// Type alias for backward compatibility
export type ReportType = ComparisonType;

export enum SavingsMetric {
  ABSOLUTE_ETH = 'absolute_eth',
  ABSOLUTE_USD = 'absolute_usd',
  COST_USD = 'cost_usd',
  PERCENTAGE = 'percentage',
  GAS_REDUCTION = 'gas_reduction',
}

// Configuration DTO - moved before request DTOs to avoid initialization error
export class ComparisonReportConfigDto {
  @ApiPropertyOptional({ description: 'Include deployment costs' })
  @IsOptional()
  @IsBoolean()
  includeDeployment?: boolean;

  @ApiPropertyOptional({ description: 'Include function call costs' })
  @IsOptional()
  @IsBoolean()
  includeFunctionCalls?: boolean;

  @ApiPropertyOptional({ description: 'Include blob costs' })
  @IsOptional()
  @IsBoolean()
  includeBlobCosts?: boolean;

  @ApiPropertyOptional({ description: 'Include historical data' })
  @IsOptional()
  @IsBoolean()
  includeHistoricalData?: boolean;

  @ApiPropertyOptional({ description: 'Primary savings metric' })
  @IsOptional()
  @IsEnum(SavingsMetric)
  primaryMetric?: SavingsMetric;

  @ApiPropertyOptional({ description: 'Currency for cost calculations' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Time period for historical data (days)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  historicalPeriodDays?: number;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  includeDetailedBreakdown?: boolean;

  @ApiPropertyOptional({ description: 'Include charts and visualizations' })
  @IsOptional()
  @IsBoolean()
  includeVisualizations?: boolean;
}

// Request DTOs
export class CreateComparisonReportDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Comparison type', enum: ComparisonType })
  @IsEnum(ComparisonType)
  type: ComparisonType;

  @ApiProperty({ description: 'Contract name' })
  @IsString()
  contractName: string;

  @ApiProperty({ description: 'Baseline network' })
  @IsString()
  baselineNetwork: string;

  @ApiProperty({ description: 'Networks to compare', type: [String] })
  @IsArray()
  @IsString({ each: true })
  comparisonNetworks: string[];

  @ApiPropertyOptional({ description: 'Analysis IDs to include' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  analysisIds?: string[];

  @ApiPropertyOptional({ description: 'Report configuration' })
  @IsOptional()
  @IsObject()
  config?: ComparisonReportConfigDto;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Auto-save report' })
  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;

  @ApiPropertyOptional({ description: 'Report status', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'User ID who created the report' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateComparisonReportDto {
  @ApiPropertyOptional({ description: 'Report title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Report status' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Report configuration' })
  @IsOptional()
  @IsObject()
  config?: ComparisonReportConfigDto;
}

export class CreateComparisonReportRequestDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Comparison type', enum: ComparisonType })
  @IsEnum(ComparisonType)
  type: ComparisonType;

  @ApiProperty({ description: 'Contract name' })
  @IsString()
  contractName: string;

  @ApiProperty({ description: 'Baseline network' })
  @IsString()
  baselineNetwork: string;

  @ApiProperty({ description: 'Networks to compare', type: [String] })
  @IsArray()
  @IsString({ each: true })
  comparisonNetworks: string[];

  @ApiPropertyOptional({ description: 'Analysis IDs to include' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  analysisIds?: string[];

  @ApiPropertyOptional({ description: 'Report configuration' })
  @IsOptional()
  @IsObject()
  config?: ComparisonReportConfigDto;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Auto-save report' })
  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;
}

// Query DTOs
export class ComparisonReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by report type' })
  @IsOptional()
  @IsEnum(ComparisonType)
  type?: ComparisonType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Filter by contract name' })
  @IsOptional()
  @IsString()
  contractName?: string;

  @ApiPropertyOptional({ description: 'Filter by baseline network' })
  @IsOptional()
  @IsString()
  baselineNetwork?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Date range filter' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeQueryDto)
  dateRange?: DateRangeQueryDto;
}

// Response DTOs
export class SavingsBreakdownDto {
  @ApiProperty({ description: 'Deployment cost savings' })
  deployment: {
    baseline: GasEstimateDto;
    comparison: GasEstimateDto;
    savings: {
      absoluteETH: string;
      absoluteUSD: number;
      percentage: number;
      gasReduction: number;
    };
  };

  @ApiPropertyOptional({ description: 'Function call savings' })
  functionCalls?: Record<string, {
    baseline: GasEstimateDto;
    comparison: GasEstimateDto;
    savings: {
      absoluteETH: string;
      absoluteUSD: number;
      percentage: number;
      gasReduction: number;
    };
  }>;

  @ApiProperty({ description: 'Total savings summary' })
  total: {
    absoluteETH: string;
    absoluteUSD: number;
    percentage: number;
    gasReduction: number;
  };

  @ApiPropertyOptional({ description: 'Blob cost savings (if applicable)' })
  blobCosts?: {
    baseline: number;
    comparison: number;
    savings: {
      absoluteETH: string;
      absoluteUSD: number;
      percentage: number;
    };
  };
}

export class NetworkComparisonDetailDto {
  @ApiProperty({ description: 'Network information' })
  network: {
    name: string;
    displayName: string;
    chainId: number;
    type: string;
    category: string;
  };

  @ApiProperty({ description: 'Analysis result' })
  analysisResult: NetworkAnalysisResultDto;

  @ApiProperty({ description: 'Savings breakdown' })
  savingsBreakdown: SavingsBreakdownDto;

  @ApiProperty({ description: 'Performance metrics' })
  performance: {
    analysisTime: number;
    networkLatency: number;
    successRate: number;
  };

  @ApiPropertyOptional({ description: 'Historical comparison' })
  historicalComparison?: {
    averageSavings: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    dataPoints: Array<{
      date: string;
      savings: number;
    }>;
  };
}

export class ComparisonReportDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report title' })
  title: string;

  @ApiPropertyOptional({ description: 'Report description' })
  description?: string;

  @ApiProperty({ description: 'Report type' })
  type: ComparisonType;

  @ApiProperty({ description: 'Report status' })
  status: ReportStatus;

  @ApiProperty({ description: 'Contract information' })
  contract: {
    name: string;
    sourceCodeHash: string;
    compilationSettings: {
      version: string;
      optimization: {
        enabled: boolean;
        runs: number;
      };
    };
  };

  @ApiProperty({ description: 'Baseline network analysis' })
  baseline: NetworkAnalysisResultDto;

  @ApiProperty({ description: 'Comparison network analyses' })
  comparisons: NetworkComparisonDetailDto[];

  @ApiProperty({ description: 'Overall summary' })
  summary: {
    totalNetworks: number;
    bestNetwork: {
      name: string;
      totalSavings: string;
      savingsPercentage: number;
    };
    worstNetwork: {
      name: string;
      additionalCost: string;
      costIncreasePercentage: number;
    };
    averageSavings: {
      absoluteETH: string;
      absoluteUSD: number;
      percentage: number;
    };
  };

  @ApiProperty({ description: 'Report configuration' })
  config: ComparisonReportConfigDto;

  @ApiPropertyOptional({ description: 'Report tags' })
  tags?: string[];

  @ApiProperty({ description: 'Report timestamps' })
  timestamps: {
    created: string;
    updated: string;
    completed?: string;
  };

  @ApiProperty({ description: 'Report metadata' })
  metadata: {
    version?: string;
    generatedBy?: string;
    analysisIds?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
    userId?: string;
    analysisCount?: number;
    totalDuration?: number;
    dataSourceVersion?: string;
  };

  @ApiPropertyOptional({ description: 'Error information (if failed)' })
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export class BlobCostComparisonDto {
  @ApiProperty({ description: 'Comparison ID' })
  id: string;

  @ApiProperty({ description: 'Data analyzed' })
  data: {
    type: 'bytecode' | 'source';
    size: number;
    hash: string;
  };

  @ApiProperty({ description: 'Network blob cost comparisons' })
  networkComparisons: Array<{
    network: string;
    blobCost: {
      gasUsed: number;
      gasPriceGwei: number;
      totalCostETH: string;
      totalCostUSD: number;
    };
    savings: {
      comparedToBaseline: {
        absoluteETH: string;
        absoluteUSD: number;
        percentage: number;
      };
    };
  }>;

  @ApiProperty({ description: 'Baseline network' })
  baseline: string;

  @ApiProperty({ description: 'Analysis timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    cheapestNetwork: string;
    mostExpensiveNetwork: string;
    maxSavings: {
      absoluteETH: string;
      percentage: number;
    };
    averageCost: {
      ETH: string;
      USD: number;
    };
  };
}

export class ComparisonReportStatsDto {
  @ApiProperty({ description: 'Total reports count' })
  totalReports: number;

  @ApiProperty({ description: 'Reports by type' })
  byType: Record<ComparisonType, number>;

  @ApiProperty({ description: 'Reports by status' })
  byStatus: Record<ReportStatus, number>;

  @ApiProperty({ description: 'Most compared networks' })
  topNetworks: Array<{
    network: string;
    count: number;
    averageSavings: number;
  }>;

  @ApiProperty({ description: 'Most analyzed contracts' })
  topContracts: Array<{
    contractName: string;
    count: number;
    averageSavings: number;
  }>;

  @ApiProperty({ description: 'Recent activity' })
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };

  @ApiProperty({ description: 'Average metrics' })
  averages: {
    reportGenerationTime: number;
    networksPerReport: number;
    savingsPercentage: number;
  };

  @ApiProperty({ description: 'Statistics timestamp' })
  timestamp: string;
}