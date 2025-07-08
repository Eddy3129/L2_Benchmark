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
  IsDateString,
} from 'class-validator';
import { PaginationQueryDto, DateRangeQueryDto } from './base.dto';

// Enums
export enum BenchmarkType {
  SEQUENCER_PERFORMANCE = 'sequencer_performance',
  L1_FINALITY = 'l1_finality',
  NETWORK_LATENCY = 'network_latency',
  THROUGHPUT = 'throughput',
  COST_EFFICIENCY = 'cost_efficiency',
  CUSTOM = 'custom',
}

export enum BenchmarkStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TestSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MetricType {
  LATENCY = 'latency',
  THROUGHPUT = 'throughput',
  SUCCESS_RATE = 'success_rate',
  COST = 'cost',
  FINALITY_TIME = 'finality_time',
  BLOCK_TIME = 'block_time',
}

// Request DTOs
export class CreateBenchmarkSessionRequestDto {
  @ApiProperty({ description: 'Session name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Benchmark type', enum: BenchmarkType })
  @IsEnum(BenchmarkType)
  type: BenchmarkType;

  @ApiProperty({ description: 'Networks to benchmark', type: [String] })
  @IsArray()
  @IsString({ each: true })
  networks: string[];

  @ApiProperty({ description: 'Benchmark configuration' })
  @ValidateNested()
  @Type(() => BenchmarkConfigDto)
  config: BenchmarkConfigDto;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Auto-start benchmark' })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  @IsDateString()
  scheduledStartTime?: string;
}

export class BenchmarkConfigDto {
  @ApiProperty({ description: 'Test duration in seconds' })
  @IsNumber()
  @Min(1)
  @Max(3600) // Max 1 hour
  duration: number;

  @ApiProperty({ description: 'Number of concurrent requests' })
  @IsNumber()
  @Min(1)
  @Max(100)
  concurrency: number;

  @ApiProperty({ description: 'Request rate per second' })
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  requestRate: number;

  @ApiPropertyOptional({ description: 'Test severity level' })
  @IsOptional()
  @IsEnum(TestSeverity)
  severity?: TestSeverity;

  @ApiPropertyOptional({ description: 'Warm-up period in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  warmupPeriod?: number;

  @ApiPropertyOptional({ description: 'Cool-down period in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  cooldownPeriod?: number;

  @ApiPropertyOptional({ description: 'Custom test parameters' })
  @IsOptional()
  @IsObject()
  customParams?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Enable detailed logging' })
  @IsOptional()
  @IsBoolean()
  enableDetailedLogging?: boolean;

  @ApiPropertyOptional({ description: 'Timeout for individual requests (ms)' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  requestTimeout?: number;

  @ApiPropertyOptional({ description: 'Retry configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryConfigDto)
  retryConfig?: RetryConfigDto;
}

export class RetryConfigDto {
  @ApiProperty({ description: 'Enable retries' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Maximum retry attempts' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Retry delay in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  retryDelay?: number;

  @ApiPropertyOptional({ description: 'Exponential backoff multiplier' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  backoffMultiplier?: number;
}

export class StartBenchmarkRequestDto {
  @ApiProperty({ description: 'Benchmark session ID' })
  @IsUUID(4)
  sessionId: string;

  @ApiPropertyOptional({ description: 'Override configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BenchmarkConfigDto)
  configOverride?: Partial<BenchmarkConfigDto>;
}

export class StopBenchmarkRequestDto {
  @ApiProperty({ description: 'Benchmark session ID' })
  @IsUUID(4)
  sessionId: string;

  @ApiPropertyOptional({ description: 'Reason for stopping' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Query DTOs
export class BenchmarkSessionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by benchmark type' })
  @IsOptional()
  @IsEnum(BenchmarkType)
  type?: BenchmarkType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(BenchmarkStatus)
  status?: BenchmarkStatus;

  @ApiPropertyOptional({ description: 'Filter by network' })
  @IsOptional()
  @IsString()
  network?: string;

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
export class BenchmarkMetricDto {
  @ApiProperty({ description: 'Metric type' })
  type: MetricType;

  @ApiProperty({ description: 'Metric name' })
  name: string;

  @ApiProperty({ description: 'Metric value' })
  value: number;

  @ApiProperty({ description: 'Metric unit' })
  unit: string;

  @ApiPropertyOptional({ description: 'Metric description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Threshold values' })
  thresholds?: {
    good: number;
    warning: number;
    critical: number;
  };

  @ApiProperty({ description: 'Metric status based on thresholds' })
  status: 'good' | 'warning' | 'critical' | 'unknown';
}

export class NetworkBenchmarkResultDto {
  @ApiProperty({ description: 'Network name' })
  network: string;

  @ApiProperty({ description: 'Network display name' })
  networkDisplayName: string;

  @ApiProperty({ description: 'Chain ID' })
  chainId: number;

  @ApiProperty({ description: 'Benchmark status' })
  status: BenchmarkStatus;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiPropertyOptional({ description: 'End time' })
  endTime?: string;

  @ApiProperty({ description: 'Duration in milliseconds' })
  duration: number;

  @ApiProperty({ description: 'Benchmark metrics' })
  metrics: BenchmarkMetricDto[];

  @ApiProperty({ description: 'Performance summary' })
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  };

  @ApiPropertyOptional({ description: 'Error information' })
  errors?: Array<{
    timestamp: string;
    error: string;
    count: number;
  }>;

  @ApiPropertyOptional({ description: 'Detailed performance data' })
  detailedData?: {
    latencyDistribution: Array<{ bucket: string; count: number }>;
    throughputOverTime: Array<{ timestamp: string; value: number }>;
    errorRateOverTime: Array<{ timestamp: string; value: number }>;
  };
}

export class BenchmarkSessionDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Session name' })
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  description?: string;

  @ApiProperty({ description: 'Benchmark type' })
  type: BenchmarkType;

  @ApiProperty({ description: 'Session status' })
  status: BenchmarkStatus;

  @ApiProperty({ description: 'Networks being benchmarked' })
  networks: string[];

  @ApiProperty({ description: 'Benchmark configuration' })
  config: BenchmarkConfigDto;

  @ApiProperty({ description: 'Network results' })
  results: NetworkBenchmarkResultDto[];

  @ApiProperty({ description: 'Overall summary' })
  summary: {
    totalNetworks: number;
    completedNetworks: number;
    failedNetworks: number;
    bestPerformingNetwork: {
      name: string;
      score: number;
    };
    worstPerformingNetwork: {
      name: string;
      score: number;
    };
    averageMetrics: {
      latency: number;
      throughput: number;
      successRate: number;
    };
  };

  @ApiPropertyOptional({ description: 'Session tags' })
  tags?: string[];

  @ApiProperty({ description: 'Session timestamps' })
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
    updated: string;
  };

  @ApiProperty({ description: 'Session metadata' })
  metadata: {
    version: string;
    createdBy: string;
    totalDuration: number;
    dataPoints: number;
  };

  @ApiPropertyOptional({ description: 'Error information (if failed)' })
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export class SequencerPerformanceResultDto {
  @ApiProperty({ description: 'Test ID' })
  id: string;

  @ApiProperty({ description: 'Network name' })
  network: string;

  @ApiProperty({ description: 'Sequencer endpoint' })
  sequencerEndpoint: string;

  @ApiProperty({ description: 'Test configuration' })
  testConfig: {
    duration: number;
    concurrency: number;
    requestRate: number;
  };

  @ApiProperty({ description: 'Performance metrics' })
  metrics: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    successRate: number;
    errorRate: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };

  @ApiProperty({ description: 'Test timestamps' })
  timestamps: {
    started: string;
    completed: string;
    duration: number;
  };

  @ApiPropertyOptional({ description: 'Detailed results' })
  detailedResults?: {
    latencyPercentiles: Record<string, number>;
    throughputOverTime: Array<{ timestamp: string; value: number }>;
    errorBreakdown: Record<string, number>;
  };
}

export class L1FinalityResultDto {
  @ApiProperty({ description: 'Test ID' })
  id: string;

  @ApiProperty({ description: 'L2 network name' })
  l2Network: string;

  @ApiProperty({ description: 'L1 network name' })
  l1Network: string;

  @ApiProperty({ description: 'Finality metrics' })
  metrics: {
    averageFinalityTime: number;
    minFinalityTime: number;
    maxFinalityTime: number;
    p95FinalityTime: number;
    p99FinalityTime: number;
    finalityRate: number;
    totalTransactions: number;
    finalizedTransactions: number;
    pendingTransactions: number;
  };

  @ApiProperty({ description: 'Test period' })
  testPeriod: {
    startTime: string;
    endTime: string;
    duration: number;
  };

  @ApiPropertyOptional({ description: 'Detailed finality data' })
  detailedData?: {
    finalityTimeDistribution: Array<{ bucket: string; count: number }>;
    finalityOverTime: Array<{ timestamp: string; finalityTime: number }>;
    batchSubmissionTimes: Array<{ timestamp: string; batchSize: number; submissionTime: number }>;
  };
}

export class BenchmarkStatsDto {
  @ApiProperty({ description: 'Total benchmark sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Sessions by type' })
  byType: Record<BenchmarkType, number>;

  @ApiProperty({ description: 'Sessions by status' })
  byStatus: Record<BenchmarkStatus, number>;

  @ApiProperty({ description: 'Most benchmarked networks' })
  topNetworks: Array<{
    network: string;
    count: number;
    averageScore: number;
  }>;

  @ApiProperty({ description: 'Recent activity' })
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };

  @ApiProperty({ description: 'Average metrics across all benchmarks' })
  averageMetrics: {
    sessionDuration: number;
    networksPerSession: number;
    successRate: number;
    averageLatency: number;
    averageThroughput: number;
  };

  @ApiProperty({ description: 'Performance trends' })
  trends: {
    latencyTrend: 'improving' | 'degrading' | 'stable';
    throughputTrend: 'improving' | 'degrading' | 'stable';
    successRateTrend: 'improving' | 'degrading' | 'stable';
  };

  @ApiProperty({ description: 'Statistics timestamp' })
  timestamp: string;
}