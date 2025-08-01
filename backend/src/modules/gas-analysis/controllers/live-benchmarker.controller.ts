import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { LiveBenchmarkerService } from '../services/live-benchmarker.service';
import { ContractCompilationService } from '../services/contract-compilation.service';

@Controller('live-benchmarker')
export class LiveBenchmarkerController {
  constructor(
    private readonly liveBenchmarkerService: LiveBenchmarkerService,
    private readonly compilationService: ContractCompilationService
  ) {}

  @Get('test')
  async test(): Promise<any> {
    return { success: true, message: 'LiveBenchmarker controller is working!' };
  }

  @Get('active')
  async getActiveBenchmarks(): Promise<any> {
    try {
      const activeBenchmarks = this.liveBenchmarkerService.getActiveBenchmarks();
      return {
        success: true,
        message: 'Active benchmark sessions retrieved successfully',
        data: {
          activeBenchmarks
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve active benchmarks',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('setup-network')
  async setupNetwork(@Body() request: {
    networkName: string;
    blockNumber?: number;
  }): Promise<any> {
    try {
      // Create and start the network fork
      const benchmarkConfig = await this.liveBenchmarkerService.createLiveBenchmark(
        request.networkName,
        request.blockNumber
      );
      
      return {
        success: true,
        message: 'Network fork setup successfully',
        data: {
          benchmarkId: `${benchmarkConfig.network}-${benchmarkConfig.forkPort}`,
          network: benchmarkConfig.network,
          chainId: benchmarkConfig.chainId,
          forkPort: benchmarkConfig.forkPort,
          rpcUrl: `http://localhost:${benchmarkConfig.forkPort}`,
          isActive: benchmarkConfig.isActive
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Network setup failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compile')
  async compileContract(@Body() request: {
    contractCode: string;
    solidityVersion?: string;
  }): Promise<any> {
    try {
      // Extract contract name from source code or use a default
      const contractNameMatch = request.contractCode.match(/contract\s+(\w+)/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';
      
      // Compile the contract
      const compilationResult = await this.compilationService.compileContract({
        contractName: contractName,
        sourceCode: request.contractCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: 'medium' as any,
        optimizationRuns: 200
      });
      
      if (!compilationResult.success) {
        const errorMessage = compilationResult.errors?.join(', ') || 'Unknown compilation error';
        throw new HttpException(
          `Contract compilation failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      return {
        success: true,
        message: 'Contract compiled successfully',
        data: {
          abi: compilationResult.abi,
          bytecode: compilationResult.bytecode,
          contractName: contractName
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Contract compilation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('validate-functions')
  async validateFunctions(@Body() request: {
    benchmarkId?: string;
    contractCode: string;
    constructorArgs: any[];
    functionCalls: Array<{ functionName: string; parameters: any[] }>;
    solidityVersion?: string;
    contractAddress?: string;
  }): Promise<any> {
    try {
      // Get the existing benchmark config
      const activeBenchmarks = this.liveBenchmarkerService.getActiveBenchmarks();
      
      let benchmarkConfig;
      
      if (request.benchmarkId) {
        // Extract network and port from benchmarkId if provided
        const [networkName, portStr] = request.benchmarkId.split('-');
        const forkPort = parseInt(portStr);
        
        benchmarkConfig = activeBenchmarks.find(
          config => config.network === networkName && config.forkPort === forkPort
        );
      } else {
        // Use the first active benchmark if no benchmarkId provided
        benchmarkConfig = activeBenchmarks[0];
      }
      
      if (!benchmarkConfig || !benchmarkConfig.isActive) {
        throw new HttpException(
          'Network fork not found or not active. Please setup the network first.',
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Extract contract name from source code or use a default
      const contractNameMatch = request.contractCode.match(/contract\s+(\w+)/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';
      
      // Compile the contract
      const compilationResult = await this.compilationService.compileContract({
        contractName: contractName,
        sourceCode: request.contractCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: 'medium' as any,
        optimizationRuns: 200
      });
      
      if (!compilationResult.success) {
        const errorMessage = compilationResult.errors?.join(', ') || 'Unknown compilation error';
        throw new HttpException(
          `Contract compilation failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Get executable functions
      const executableFunctions = await this.liveBenchmarkerService.validateFunctions(
        benchmarkConfig,
        compilationResult,
        request.functionCalls || [],
        request.constructorArgs || [],
        request.contractAddress
      );
      
      return {
        success: true,
        message: 'Functions validated successfully',
        data: {
          executableFunctions,
          totalFunctions: request.functionCalls?.length || 0,
          validatedCount: executableFunctions.length
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Function validation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('run')
  async runLiveBenchmark(@Body() request: {
    benchmarkId?: string;
    contractCode: string;
    constructorArgs: any[];
    functionCalls: Array<{ functionName: string; parameters: any[] }>;
    solidityVersion?: string;
    contractAddress?: string;
  }): Promise<any> {
    try {
      // Get the existing benchmark config
      const activeBenchmarks = this.liveBenchmarkerService.getActiveBenchmarks();
      
      let benchmarkConfig;
      
      if (request.benchmarkId) {
        // Extract network and port from benchmarkId if provided
        const [networkName, portStr] = request.benchmarkId.split('-');
        const forkPort = parseInt(portStr);
        
        benchmarkConfig = activeBenchmarks.find(
          config => config.network === networkName && config.forkPort === forkPort
        );
      } else {
        // Use the first active benchmark if no benchmarkId provided
        benchmarkConfig = activeBenchmarks[0];
      }
      
      if (!benchmarkConfig || !benchmarkConfig.isActive) {
        throw new HttpException(
          'Network fork not found or not active. Please setup the network first.',
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Extract contract name from source code or use a default
      const contractNameMatch = request.contractCode.match(/contract\s+(\w+)/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';
      
      // Compile the contract
      const compilationResult = await this.compilationService.compileContract({
        contractName: contractName,
        sourceCode: request.contractCode,
        solidityVersion: request.solidityVersion || '0.8.19',
        optimizationLevel: 'medium' as any,
        optimizationRuns: 200
      });
      
      if (!compilationResult.success) {
        const errorMessage = compilationResult.errors?.join(', ') || 'Unknown compilation error';
        throw new HttpException(
          `Contract compilation failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Run the live benchmark
      const result = await this.liveBenchmarkerService.runLiveBenchmark(
        benchmarkConfig,
        compilationResult,
        request.functionCalls || [],
        request.constructorArgs || [],
        request.contractAddress
      );
      
      // Convert BigInt values to strings for JSON serialization
      const serializedResult = this.serializeBigIntValues(result);
      
      // Check if the service returned an error
      if (serializedResult.success === false) {
        throw new HttpException(
          serializedResult.error || 'Live benchmark execution failed',
          HttpStatus.BAD_REQUEST
        );
      }
      
      return {
        success: true,
        message: 'Live benchmark executed successfully',
        data: serializedResult
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Live benchmark execution failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('network-status/:benchmarkId')
  async getNetworkStatus(@Param('benchmarkId') benchmarkId: string): Promise<any> {
    try {
      // Extract network and port from benchmarkId
      const [networkName, portStr] = benchmarkId.split('-');
      const forkPort = parseInt(portStr);
      
      // Get the existing benchmark config
      const activeBenchmarks = this.liveBenchmarkerService.getActiveBenchmarks();
      const benchmarkConfig = activeBenchmarks.find(
        config => config.network === networkName && config.forkPort === forkPort
      );
      
      if (!benchmarkConfig) {
        return {
          success: false,
          message: 'Network fork not found',
          data: {
            isActive: false,
            benchmarkId: benchmarkId
          }
        };
      }
      
      return {
        success: true,
        message: 'Network status retrieved successfully',
        data: {
          benchmarkId: benchmarkId,
          network: benchmarkConfig.network,
          chainId: benchmarkConfig.chainId,
          forkPort: benchmarkConfig.forkPort,
          rpcUrl: `http://localhost:${benchmarkConfig.forkPort}`,
          isActive: benchmarkConfig.isActive
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get network status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cleanup-all')
  async cleanupAllBenchmarks(): Promise<any> {
    try {
      await this.liveBenchmarkerService.cleanupAllLiveBenchmarks();
      return {
        success: true,
        message: 'All benchmark sessions cleaned up successfully'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Cleanup failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':benchmarkId')
  async cleanupBenchmark(@Param('benchmarkId') benchmarkId: string): Promise<any> {
    try {
      // Extract network and port from benchmarkId
      const [networkName, portStr] = benchmarkId.split('-');
      const benchmarkKey = `${networkName}-${portStr}`;
      
      await this.liveBenchmarkerService.cleanupLiveBenchmark(benchmarkKey);
      return {
        success: true,
        message: 'Benchmark session cleaned up successfully'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Cleanup failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private serializeBigIntValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigIntValues(item));
    }
    
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = this.serializeBigIntValues(value);
      }
      return serialized;
    }
    
    return obj;
  }
}