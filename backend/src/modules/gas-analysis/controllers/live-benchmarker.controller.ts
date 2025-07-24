import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

// Services
import { LiveBenchmarkerService } from '../services/live-benchmarker.service';
import { ContractCompilationService } from '../services/contract-compilation.service';

// DTOs
import { CompilationResultDto, FunctionCallDto, OptimizationLevel } from '../../../common/dto/gas-analysis.dto';
import { BaseResponseDto } from '../../../common/dto/base.dto';

// Request/Response DTOs
class CreateLiveBenchmarkRequestDto {
  @ApiProperty({ description: 'Network name to create benchmark session for' })
  @IsString()
  networkName: string;

  @ApiPropertyOptional({ description: 'Block number to fork from' })
  @IsOptional()
  blockNumber?: number;
}

class RunLiveBenchmarkRequestDto {
  @ApiProperty({ description: 'Network name to run the benchmark on' })
  @IsString()
  networkName: string;

  @ApiProperty({ description: 'Solidity contract source code' })
  @IsString()
  contractCode: string;

  @ApiPropertyOptional({ description: 'Constructor arguments as JSON array' })
  @IsOptional()
  @IsArray()
  constructorArgs?: any[];

  @ApiPropertyOptional({ description: 'Function calls to execute' })
  @IsOptional()
  @IsArray()
  functionCalls?: FunctionCallDto[];

  @ApiPropertyOptional({ description: 'Block number to fork from' })
  @IsOptional()
  blockNumber?: number;

  @ApiPropertyOptional({ description: 'Solidity compiler version' })
  @IsOptional()
  @IsString()
  solidityVersion?: string;

  @ApiPropertyOptional({ description: 'Existing contract address to interact with (skips deployment)' })
  @IsOptional()
  @IsString()
  contractAddress?: string;
}

class LiveBenchmarkResponseDto extends BaseResponseDto {
  data?: {
    benchmarkId: string;
    network: string;
    chainId: number;
    forkPort: number;
    blockNumber?: number;
    isActive: boolean;
  };
}

class LiveBenchmarkResultResponseDto extends BaseResponseDto {
  data?: {
    contractAddress?: string;
    deploymentCost: {
      gasUsed: number;
      gasPrice: string;
      totalCostWei: string;
      totalCostEth: string;
      totalCostUsd: number;
    };
    functionCosts: {
      functionName: string;
      gasUsed: number;
      gasPrice: string;
      totalCostWei: string;
      totalCostEth: string;
      totalCostUsd: number;
      l1DataCost?: number;
      l2ExecutionCost?: number;
    }[];
    feeComposition: {
      baseFee: string;
      priorityFee: string;
      maxFeePerGas: string;
      gasPrice: string;
      l1DataFee?: string;
    };
    networkMetrics: {
      blockNumber: number;
      blockTimestamp: number;
      gasLimit: string;
      gasUsed: string;
      baseFeePerGas: string;
    };
    executionTime: number;
  };
}

@ApiTags('Live Benchmarker')
@Controller('live-benchmarker')
export class LiveBenchmarkerController {
  private readonly logger = new Logger(LiveBenchmarkerController.name);

  constructor(
    private readonly liveBenchmarkerService: LiveBenchmarkerService,
    private readonly compilationService: ContractCompilationService
  ) {}

  /**
   * Extract contract name from Solidity source code
   */
  private extractContractName(sourceCode: string): string | null {
    // Match contract declaration: contract ContractName {
    const contractMatch = sourceCode.match(/contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
    return contractMatch ? contractMatch[1] : null;
  }

  @Post('create')
  @ApiOperation({ 
    summary: 'Create a live benchmark session',
    description: 'Creates a new live benchmark session by forking the specified network mainnet'
  })
  @ApiBody({ type: CreateLiveBenchmarkRequestDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Live benchmark session created successfully',
    type: LiveBenchmarkResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createLiveBenchmark(
    @Body() request: CreateLiveBenchmarkRequestDto
  ): Promise<LiveBenchmarkResponseDto> {
    try {
      this.logger.log(`Creating live benchmark for network: ${request.networkName}`);
      
      const benchmarkConfig = await this.liveBenchmarkerService.createLiveBenchmark(
        request.networkName,
        request.blockNumber
      );
      
      const benchmarkId = `${benchmarkConfig.network}_${benchmarkConfig.blockNumber || 'latest'}`;
      
      return {
        success: true,
        message: 'Live benchmark session created successfully',
        data: {
          benchmarkId,
          network: benchmarkConfig.network,
          chainId: benchmarkConfig.chainId,
          forkPort: benchmarkConfig.forkPort,
          blockNumber: benchmarkConfig.blockNumber,
          isActive: benchmarkConfig.isActive
        }
      };
    } catch (error) {
      this.logger.error(`Failed to create live benchmark: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to create live benchmark: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('run')
  @ApiOperation({ 
    summary: 'Run a comprehensive live benchmark',
    description: 'Runs a live benchmark including contract deployment and function calls with real-time gas prices'
  })
  @ApiBody({ type: RunLiveBenchmarkRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Live benchmark completed successfully',
    type: LiveBenchmarkResultResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async runLiveBenchmark(
    @Body() request: RunLiveBenchmarkRequestDto
  ): Promise<LiveBenchmarkResultResponseDto> {
    try {
      this.logger.log(`Running live benchmark for network: ${request.networkName}`);
      
      // Create or get existing benchmark session
      const benchmarkConfig = await this.liveBenchmarkerService.createLiveBenchmark(
        request.networkName,
        request.blockNumber
      );
      
      // Extract contract name from source code
      const contractName = this.extractContractName(request.contractCode);
      if (!contractName) {
        throw new Error('No contract found in source code');
      }
      
      // Compile the contract
      const compilation = await this.compilationService.compileContract({
        contractName: contractName,
        sourceCode: request.contractCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: OptimizationLevel.MEDIUM,
        optimizationRuns: 200,
      });
      
      if (!compilation.success || !compilation.bytecode || !compilation.abi) {
        throw new Error('Contract compilation failed');
      }
      
      // Run the live benchmark
      const result = await this.liveBenchmarkerService.runLiveBenchmark(
        benchmarkConfig,
        compilation,
        request.functionCalls || [],
        request.constructorArgs || [],
        request.contractAddress
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Live benchmark execution failed');
      }
      
      return {
        success: true,
        message: 'Live benchmark completed successfully',
        data: {
          contractAddress: result.contractAddress,
          deploymentCost: {
            gasUsed: result.deploymentCost.gasUsed,
            gasPrice: result.deploymentCost.gasPrice.toString(),
            totalCostWei: result.deploymentCost.totalCostWei.toString(),
            totalCostEth: result.deploymentCost.totalCostEth,
            totalCostUsd: result.deploymentCost.totalCostUsd
          },
          functionCosts: result.functionCosts.map(fc => ({
            functionName: fc.functionName,
            gasUsed: fc.gasUsed,
            gasPrice: fc.gasPrice.toString(),
            totalCostWei: fc.totalCostWei.toString(),
            totalCostEth: fc.totalCostEth,
            totalCostUsd: fc.totalCostUsd,
            l1DataCost: fc.l1DataCost,
            l2ExecutionCost: fc.l2ExecutionCost
          })),
          feeComposition: {
            baseFee: result.feeComposition.baseFee.toString(),
            priorityFee: result.feeComposition.priorityFee.toString(),
            maxFeePerGas: result.feeComposition.maxFeePerGas.toString(),
            gasPrice: result.feeComposition.gasPrice.toString(),
            l1DataFee: result.feeComposition.l1DataFee?.toString()
          },
          networkMetrics: {
            blockNumber: result.networkMetrics.blockNumber,
            blockTimestamp: result.networkMetrics.blockTimestamp,
            gasLimit: result.networkMetrics.gasLimit.toString(),
            gasUsed: result.networkMetrics.gasUsed.toString(),
            baseFeePerGas: result.networkMetrics.baseFeePerGas.toString()
          },
          executionTime: result.executionTime
        }
      };
    } catch (error) {
      this.logger.error(`Failed to run live benchmark: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to run live benchmark: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Get active benchmark sessions',
    description: 'Retrieves all currently active live benchmark sessions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Active benchmark sessions retrieved successfully'
  })
  async getActiveBenchmarks(): Promise<{
    success: boolean;
    message: string;
    data: {
      activeBenchmarks: {
        benchmarkId: string;
        network: string;
        chainId: number;
        forkPort: number;
        blockNumber?: number;
        isActive: boolean;
      }[];
    };
  }> {
    try {
      const activeBenchmarks = this.liveBenchmarkerService.getActiveBenchmarks();
      
      return {
        success: true,
        message: 'Active benchmark sessions retrieved successfully',
        data: {
          activeBenchmarks: activeBenchmarks.map(benchmark => ({
            benchmarkId: `${benchmark.network}_${benchmark.blockNumber || 'latest'}`,
            network: benchmark.network,
            chainId: benchmark.chainId,
            forkPort: benchmark.forkPort,
            blockNumber: benchmark.blockNumber,
            isActive: benchmark.isActive
          }))
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get active benchmarks: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to get active benchmarks: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':benchmarkId')
  @ApiOperation({ 
    summary: 'Cleanup a benchmark session',
    description: 'Stops and cleans up a specific live benchmark session'
  })
  @ApiParam({ name: 'benchmarkId', description: 'The benchmark session ID to cleanup' })
  @ApiResponse({ 
    status: 200, 
    description: 'Benchmark session cleaned up successfully'
  })
  @ApiResponse({ status: 404, description: 'Benchmark session not found' })
  async cleanupBenchmark(
    @Param('benchmarkId') benchmarkId: string
  ): Promise<BaseResponseDto> {
    try {
      this.logger.log(`Cleaning up benchmark session: ${benchmarkId}`);
      
      await this.liveBenchmarkerService.cleanupLiveBenchmark(benchmarkId);
      
      return {
        success: true,
        message: 'Benchmark session cleaned up successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup benchmark: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to cleanup benchmark: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cleanup-all')
  @ApiOperation({ 
    summary: 'Cleanup all benchmark sessions',
    description: 'Stops and cleans up all active live benchmark sessions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All benchmark sessions cleaned up successfully'
  })
  async cleanupAllBenchmarks(): Promise<BaseResponseDto> {
    try {
      this.logger.log('Cleaning up all benchmark sessions');
      
      await this.liveBenchmarkerService.cleanupAllLiveBenchmarks();
      
      return {
        success: true,
        message: 'All benchmark sessions cleaned up successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup all benchmarks: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to cleanup all benchmarks: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('networks')
  @ApiOperation({ 
    summary: 'Get supported networks',
    description: 'Retrieves all networks supported for live benchmarking'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Supported networks retrieved successfully'
  })
  async getSupportedNetworks(): Promise<{
    success: boolean;
    message: string;
    data: {
      networks: {
        name: string;
        displayName: string;
        chainId: number;
        type: string;
        category: string;
        isLayer2?: boolean;
      }[];
    };
  }> {
    try {
      // This would typically come from the network configuration service
      const supportedNetworks = [
        {
          name: 'mainnet',
          displayName: 'Ethereum Mainnet',
          chainId: 1,
          type: 'mainnet',
          category: 'ethereum'
        },
        {
          name: 'arbitrum',
          displayName: 'Arbitrum One',
          chainId: 42161,
          type: 'l2',
          category: 'arbitrum',
          isLayer2: true
        },
        {
          name: 'optimism',
          displayName: 'Optimism',
          chainId: 10,
          type: 'l2',
          category: 'optimism',
          isLayer2: true
        },
        {
          name: 'base',
          displayName: 'Base',
          chainId: 8453,
          type: 'l2',
          category: 'base',
          isLayer2: true
        },
        {
          name: 'polygon',
          displayName: 'Polygon PoS',
          chainId: 137,
          type: 'l2',
          category: 'polygon',
          isLayer2: true
        },
        {
          name: 'scroll',
          displayName: 'Scroll Mainnet',
          chainId: 534352,
          type: 'l2',
          category: 'scroll',
          isLayer2: true
        },
        {
          name: 'linea',
          displayName: 'Linea Mainnet',
          chainId: 59144,
          type: 'l2',
          category: 'linea',
          isLayer2: true
        },
        {
          name: 'ink',
          displayName: 'Ink Mainnet',
          chainId: 57073,
          type: 'l2',
          category: 'ink',
          isLayer2: true
        }
      ];
      
      return {
        success: true,
        message: 'Supported networks retrieved successfully',
        data: {
          networks: supportedNetworks
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get supported networks: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: `Failed to get supported networks: ${error.message}`
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}