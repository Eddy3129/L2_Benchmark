import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums for test types and configurations
export enum SequencerTestType {
  LOW_FEE_TEST = 'low_fee_test',
  STUCK_TRANSACTION_TEST = 'stuck_transaction_test',
  FEE_MARKET_STRESS = 'fee_market_stress'
}

export enum L1FinalityStatus {
  MONITORING = 'monitoring',
  COMPLETED = 'completed',
  FAILED = 'failed'
}



// Sequencer Performance DTOs
export class RunSequencerTestDto {
  @ApiProperty({ description: 'L2 network to test', example: 'arbitrumSepolia' })
  @IsString()
  l2Network: string;

  @ApiProperty({ enum: SequencerTestType, description: 'Type of sequencer test to run' })
  @IsEnum(SequencerTestType)
  testType: SequencerTestType;

  @ApiPropertyOptional({ description: 'Number of transactions to send', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  transactionCount?: number;

  @ApiPropertyOptional({ description: 'Test duration in seconds', default: 300, minimum: 60, maximum: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  testDurationSeconds?: number;

  @ApiPropertyOptional({ description: 'Minimum fee per gas in wei', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minFeePerGas?: number;

  @ApiPropertyOptional({ description: 'Maximum fee per gas in wei' })
  @IsOptional()
  @IsNumber()
  maxFeePerGas?: number;

  @ApiPropertyOptional({ description: 'Whether to save results to database', default: true })
  @IsOptional()
  @IsBoolean()
  saveToDatabase?: boolean;
}

export class SequencerTestResultDto {
  @ApiProperty({ description: 'Test session ID' })
  sessionId: string;

  @ApiProperty({ description: 'L2 network tested' })
  l2Network: string;

  @ApiProperty({ enum: SequencerTestType, description: 'Type of test performed' })
  testType: SequencerTestType;

  @ApiProperty({ description: 'Test configuration used' })
  testConfig: {
    transactionCount: number;
    testDurationSeconds: number;
    minFeePerGas: number;
    maxFeePerGas?: number;
  };

  @ApiProperty({ description: 'Real-time transaction status' })
  realTimeStatus: {
    transactionsSent: number;
    transactionsConfirmed: number;
    transactionsPending: number;
    transactionsFailed: number;
    lowFeeTransactions: {
      sent: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
    normalFeeTransactions: {
      sent: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
  };

  @ApiProperty({ description: 'Performance metrics calculated' })
  metrics: {
    inclusionRate: number;
    avgConfirmationLatency: number;
    parallelProcessingCapability: number;
    censorshipResistanceScore: number;
  };

  @ApiProperty({ description: 'Total test cost in ETH' })
  totalTestCostETH: string;

  @ApiProperty({ description: 'Total test cost in USD' })
  totalTestCostUSD: number;

  @ApiProperty({ description: 'Test status' })
  status: string;

  @ApiProperty({ description: 'Test start timestamp' })
  startedAt: Date;

  @ApiProperty({ description: 'Test completion timestamp' })
  completedAt?: Date;

  @ApiProperty({ description: 'Error message if test failed' })
  errorMessage?: string;
}

// L1 Finality DTOs
export class StartL1FinalityTrackingDto {
  @ApiProperty({ description: 'L2 network to monitor', example: 'arbitrumSepolia' })
  @IsString()
  l2Network: string;

  @ApiProperty({ description: 'L1 network for settlement tracking', example: 'sepolia' })
  @IsString()
  l1Network: string;

  @ApiPropertyOptional({ description: 'Monitoring duration in hours', default: 24, minimum: 1, maximum: 168 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  monitoringDurationHours?: number;

  @ApiPropertyOptional({ description: 'Batch poster addresses to monitor' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  batchPosterAddresses?: string[];

  @ApiPropertyOptional({ description: 'Whether to save results to database', default: true })
  @IsOptional()
  @IsBoolean()
  saveToDatabase?: boolean;
}

export class StopL1FinalityTrackingDto {
  @ApiProperty({ description: 'Tracking session ID to stop' })
  @IsUUID()
  sessionId: string;
}

export class L1FinalityResultDto {
  @ApiProperty({ description: 'Tracking session ID' })
  sessionId: string;

  @ApiProperty({ description: 'L2 network being monitored' })
  l2Network: string;

  @ApiProperty({ description: 'L1 network for settlement' })
  l1Network: string;

  @ApiProperty({ enum: L1FinalityStatus, description: 'Current tracking status' })
  status: L1FinalityStatus;

  @ApiProperty({ description: 'Finality metrics' })
  metrics: {
    avgTimeToL1Settlement: number; // in seconds
    avgL1SettlementCostPerBatch: string; // in ETH
    avgAmortizedL1CostPerTransaction: string; // in ETH
    finalityConfidenceLevel: number; // percentage
  };

  @ApiProperty({ description: 'Number of batches tracked' })
  batchesTracked: number;

  @ApiProperty({ description: 'Total L2 transactions in tracked batches' })
  totalL2Transactions: number;

  @ApiProperty({ description: 'Tracking start timestamp' })
  startedAt: Date;

  @ApiProperty({ description: 'Tracking end timestamp', required: false })
  completedAt?: Date;
}



// Query DTOs for retrieving historical data
export class GetSequencerHistoryDto {
  @ApiPropertyOptional({ description: 'L2 network filter' })
  @IsOptional()
  @IsString()
  l2Network?: string;

  @ApiPropertyOptional({ enum: SequencerTestType, description: 'Test type filter' })
  @IsOptional()
  @IsEnum(SequencerTestType)
  testType?: SequencerTestType;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 50, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class GetL1FinalityHistoryDto {
  @ApiPropertyOptional({ description: 'L2 network filter' })
  @IsOptional()
  @IsString()
  l2Network?: string;

  @ApiPropertyOptional({ description: 'L1 network filter' })
  @IsOptional()
  @IsString()
  l1Network?: string;

  @ApiPropertyOptional({ enum: L1FinalityStatus, description: 'Status filter' })
  @IsOptional()
  @IsEnum(L1FinalityStatus)
  status?: L1FinalityStatus;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 50, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}