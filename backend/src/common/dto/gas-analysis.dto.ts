import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  Matches,
  Length,
  ValidateNested,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { VALIDATION_CONSTANTS, GAS_ANALYSIS_CONSTANTS } from '../constants';
import { PaginationQueryDto, DateRangeQueryDto } from './base.dto';

// Enums
export enum OptimizationLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  AGGRESSIVE = 'aggressive',
}

export enum AnalysisType {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export enum GasEstimationType {
  DEPLOYMENT = 'deployment',
  FUNCTION_CALL = 'function_call',
  BOTH = 'both',
  STATIC = 'static',
  SIMULATION = 'simulation',
  HISTORICAL = 'historical',
}

// Request DTOs
export class AnalyzeContractRequestDto {
  @ApiProperty({
    description: 'Contract name',
    minLength: VALIDATION_CONSTANTS.CONTRACT_NAME.MIN_LENGTH,
    maxLength: VALIDATION_CONSTANTS.CONTRACT_NAME.MAX_LENGTH,
    pattern: VALIDATION_CONSTANTS.CONTRACT_NAME.PATTERN.source,
  })
  @IsString()
  @Length(
    VALIDATION_CONSTANTS.CONTRACT_NAME.MIN_LENGTH,
    VALIDATION_CONSTANTS.CONTRACT_NAME.MAX_LENGTH
  )
  @Matches(VALIDATION_CONSTANTS.CONTRACT_NAME.PATTERN)
  contractName: string;

  @ApiProperty({
    description: 'Solidity source code',
    minLength: VALIDATION_CONSTANTS.CODE.MIN_LENGTH,
    maxLength: VALIDATION_CONSTANTS.CODE.MAX_LENGTH,
  })
  @IsString()
  @Length(VALIDATION_CONSTANTS.CODE.MIN_LENGTH, VALIDATION_CONSTANTS.CODE.MAX_LENGTH)
  sourceCode: string;

  @ApiProperty({
    description: 'Networks to analyze on',
    type: [String],
    example: ['sepolia', 'arbitrum-sepolia'],
  })
  @IsArray()
  @IsString({ each: true })
  networks: string[];

  @ApiPropertyOptional({
    description: 'Solidity compiler version',
    pattern: VALIDATION_CONSTANTS.SOLIDITY_VERSION.PATTERN.source,
    default: '0.8.19',
  })
  @IsOptional()
  @IsString()
  @Matches(VALIDATION_CONSTANTS.SOLIDITY_VERSION.PATTERN)
  solidityVersion?: string;

  @ApiPropertyOptional({
    description: 'Optimization level',
    enum: OptimizationLevel,
    default: OptimizationLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(OptimizationLevel)
  optimizationLevel?: OptimizationLevel;

  @ApiPropertyOptional({
    description: 'Number of optimization runs',
    minimum: 0,
    maximum: 10000,
    default: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  optimizationRuns?: number;

  @ApiPropertyOptional({
    description: 'Analysis type',
    enum: AnalysisType,
    default: AnalysisType.BASIC,
  })
  @IsOptional()
  @IsEnum(AnalysisType)
  analysisType?: AnalysisType;

  @ApiPropertyOptional({
    description: 'Gas estimation type',
    enum: GasEstimationType,
    default: GasEstimationType.BOTH,
  })
  @IsOptional()
  @IsEnum(GasEstimationType)
  gasEstimationType?: GasEstimationType;

  @ApiPropertyOptional({
    description: 'Constructor arguments for deployment',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  constructorArgs?: any[];

  @ApiPropertyOptional({
    description: 'Function calls to analyze',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionCallDto)
  functionCalls?: FunctionCallDto[];

  @ApiPropertyOptional({
    description: 'Include detailed bytecode analysis',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeBytecodeAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Save analysis results',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  saveResults?: boolean;
}

export class FunctionCallDto {
  @ApiProperty({ description: 'Function name' })
  @IsString()
  functionName: string;

  @ApiPropertyOptional({ description: 'Function arguments', type: [String] })
  @IsOptional()
  @IsArray()
  args?: any[];

  @ApiPropertyOptional({ description: 'Function parameters', type: [String] })
  @IsOptional()
  @IsArray()
  parameters?: any[];

  @ApiPropertyOptional({ description: 'Value to send with the call (in wei)' })
  @IsOptional()
  @IsString()
  value?: string;
}

export class CompareNetworksRequestDto {
  @ApiProperty({ description: 'Contract name' })
  @IsString()
  @Length(
    VALIDATION_CONSTANTS.CONTRACT_NAME.MIN_LENGTH,
    VALIDATION_CONSTANTS.CONTRACT_NAME.MAX_LENGTH
  )
  contractName: string;

  @ApiProperty({ description: 'Solidity source code' })
  @IsString()
  @Length(VALIDATION_CONSTANTS.CODE.MIN_LENGTH, VALIDATION_CONSTANTS.CODE.MAX_LENGTH)
  sourceCode: string;

  @ApiProperty({ description: 'Baseline network' })
  @IsString()
  baselineNetwork: string;

  @ApiProperty({ description: 'Networks to compare against', type: [String] })
  @IsArray()
  @IsString({ each: true })
  comparisonNetworks: string[];

  @ApiPropertyOptional({ description: 'Solidity compiler version' })
  @IsOptional()
  @IsString()
  solidityVersion?: string;

  @ApiPropertyOptional({ description: 'Optimization settings' })
  @IsOptional()
  @IsObject()
  optimizationSettings?: {
    enabled: boolean;
    runs: number;
  };

  @ApiPropertyOptional({ description: 'Function calls to compare' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionCallDto)
  functionCalls?: FunctionCallDto[];
}

export class BlobCostComparisonRequestDto {
  @ApiProperty({ description: 'Contract bytecode or source code' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'Networks to compare blob costs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  networks: string[];

  @ApiPropertyOptional({ description: 'Data type', enum: ['bytecode', 'source'] })
  @IsOptional()
  @IsEnum(['bytecode', 'source'])
  dataType?: 'bytecode' | 'source';
}

// Query DTOs
export class GasAnalysisQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by contract name' })
  @IsOptional()
  @IsString()
  contractName?: string;

  @ApiPropertyOptional({ description: 'Filter by network' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ description: 'Filter by analysis type' })
  @IsOptional()
  @IsEnum(AnalysisType)
  analysisType?: AnalysisType;

  @ApiPropertyOptional({ description: 'Date range filter' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeQueryDto)
  dateRange?: DateRangeQueryDto;
}

// Response DTOs
export class GasEstimateDto {
  @ApiProperty({ description: 'Gas limit estimate' })
  gasLimit: number;

  @ApiProperty({ description: 'Gas price in gwei' })
  gasPrice: number;

  @ApiProperty({ description: 'Total cost in ETH' })
  totalCost: string;

  @ApiProperty({ description: 'Total cost in USD' })
  totalCostUSD: number;

  @ApiPropertyOptional({ description: 'Gas used (for actual transactions)' })
  gasUsed?: number;

  @ApiPropertyOptional({ description: 'Effective gas price' })
  effectiveGasPrice?: number;

  @ApiPropertyOptional({ description: 'Gas cost in ETH' })
  gasCost?: string;
}

export class NetworkAnalysisResultDto {
  @ApiProperty({ description: 'Network name' })
  network: string;

  @ApiProperty({ description: 'Network display name' })
  networkDisplayName: string;

  @ApiProperty({ description: 'Chain ID' })
  chainId: number;

  @ApiProperty({ description: 'Deployment gas estimate' })
  deploymentGas: GasEstimateDto;

  @ApiPropertyOptional({ description: 'Function call gas estimates' })
  functionGasEstimates?: Record<string, GasEstimateDto>;

  @ApiProperty({ description: 'Analysis timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Contract address (if deployed)' })
  contractAddress?: string;

  @ApiPropertyOptional({ description: 'Transaction hash (if deployed)' })
  transactionHash?: string;

  @ApiPropertyOptional({ description: 'Block number' })
  blockNumber?: number;

  @ApiPropertyOptional({ description: 'Network status' })
  networkStatus?: {
    isOnline: boolean;
    latency: number;
    blockHeight: number;
  };
}

export class BytecodeAnalysisDto {
  @ApiProperty({ description: 'Bytecode size in bytes' })
  size: number;

  @ApiProperty({ description: 'Complexity score' })
  complexityScore: number;

  @ApiProperty({ description: 'Number of opcodes' })
  opcodeCount: number;

  @ApiProperty({ description: 'Most frequent opcodes' })
  topOpcodes: Array<{ opcode: string; count: number; percentage: number }>;

  @ApiProperty({ description: 'Estimated deployment cost multiplier' })
  deploymentCostMultiplier: number;

  @ApiPropertyOptional({ description: 'Security analysis' })
  securityAnalysis?: {
    hasReentrancyGuards: boolean;
    hasOverflowChecks: boolean;
    hasAccessControls: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class CompilationResultDto {
  @ApiProperty({ description: 'Compilation success status' })
  success: boolean;

  @ApiProperty({ description: 'Contract bytecode' })
  bytecode: string;

  @ApiProperty({ description: 'Contract ABI' })
  abi: any[];

  @ApiPropertyOptional({ description: 'Compilation errors' })
  errors?: string[];

  @ApiPropertyOptional({ description: 'Compilation warnings' })
  warnings?: string[];

  @ApiProperty({ description: 'Compiler version used' })
  compilerVersion: string;

  @ApiProperty({ description: 'Optimization settings' })
  optimizationSettings: {
    enabled: boolean;
    runs: number;
  };

  @ApiPropertyOptional({ description: 'Compilation time in milliseconds' })
  compilationTime?: number;

  @ApiPropertyOptional({ description: 'Bytecode size in bytes' })
  bytecodeSize?: number;

  @ApiPropertyOptional({ description: 'Gas estimates from compiler' })
  gasEstimates?: any;

  @ApiPropertyOptional({ description: 'Contract metadata' })
  metadata?: any;

  @ApiPropertyOptional({ description: 'Bytecode analysis' })
  bytecodeAnalysis?: BytecodeAnalysisDto;
}

export class GasAnalysisResultDto {
  @ApiProperty({ description: 'Analysis ID' })
  id: string;

  @ApiProperty({ description: 'Contract name' })
  contractName: string;

  @ApiProperty({ description: 'Compilation result' })
  compilation: CompilationResultDto;

  @ApiProperty({ description: 'Network analysis results' })
  networkResults: NetworkAnalysisResultDto[];

  @ApiProperty({ description: 'Analysis type' })
  analysisType: AnalysisType;

  @ApiProperty({ description: 'Analysis timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Analysis duration in milliseconds' })
  duration: number;

  @ApiPropertyOptional({ description: 'Analysis metadata' })
  metadata?: {
    solidityVersion: string;
    optimizationLevel: OptimizationLevel;
    gasEstimationType: GasEstimationType;
    totalNetworks: number;
    successfulNetworks: number;
    failedNetworks: string[];
  };
}

export class GasAnalysisHistoryDto {
  @ApiProperty({ description: 'Analysis entries' })
  analyses: GasAnalysisResultDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    totalAnalyses: number;
    uniqueContracts: number;
    networksAnalyzed: string[];
    averageDuration: number;
    successRate: number;
  };
}

export class NetworkComparisonDto {
  @ApiProperty({ description: 'Baseline network' })
  baseline: NetworkAnalysisResultDto;

  @ApiProperty({ description: 'Comparison networks' })
  comparisons: Array<{
    network: NetworkAnalysisResultDto;
    savings: {
      deploymentSavings: {
        absolute: string; // ETH
        percentage: number;
        gasReduction: number;
      };
      functionSavings: Record<string, {
        absolute: string; // ETH
        percentage: number;
        gasReduction: number;
      }>;
      totalSavings: {
        absolute: string; // ETH
        percentage: number;
      };
    };
  }>;

  @ApiProperty({ description: 'Comparison metadata' })
  metadata: {
    comparisonId: string;
    timestamp: string;
    contractName: string;
    baselineNetwork: string;
    comparisonNetworks: string[];
  };
}