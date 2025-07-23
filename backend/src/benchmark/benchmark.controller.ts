import { Controller, Get, Post, Body, Query, Param, Delete, HttpException } from '@nestjs/common';
import { BenchmarkService } from './benchmark.service';
import { WalletBenchmarkService } from './wallet-benchmark.service';
import { ValidationUtils } from '../shared/validation-utils';
import { BenchmarkSessionData } from '../shared/types';

// Local interface definition since entity was removed
interface BenchmarkSession {
  id: string;
  sessionName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  results?: any;
  metadata?: any;
}

@Controller('benchmark')
export class BenchmarkController {
  constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly walletBenchmarkService: WalletBenchmarkService
  ) {}

  @Post('sessions')
  async createSession(@Body() sessionData: any): Promise<BenchmarkSession> {
    try {
      return await this.benchmarkService.createSession(sessionData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to create benchmark session');
    }
  }

  @Post('wallet-sessions')
  async createWalletSession(@Body() walletBenchmarkData: any): Promise<BenchmarkSession> {
    try {
      // Debug: Log the received data
      console.log('=== WALLET BENCHMARK DATA RECEIVED ===');
      console.log('Full data:', JSON.stringify(walletBenchmarkData, null, 2));
      console.log('Contracts:', walletBenchmarkData.contracts);
      if (walletBenchmarkData.contracts && walletBenchmarkData.contracts.length > 0) {
        console.log('First contract ABI exists:', !!walletBenchmarkData.contracts[0].abi);
        console.log('First contract ABI length:', walletBenchmarkData.contracts[0].abi?.length || 0);
        console.log('First contract ABI type:', typeof walletBenchmarkData.contracts[0].abi);
      }
      console.log('======================================');
      
      // Validate required fields for wallet benchmarking
      if (!walletBenchmarkData.walletAddress) {
        throw ValidationUtils.createValidationError(['Wallet address is required for wallet benchmarking']);
      }
      
      if (!walletBenchmarkData.contracts || walletBenchmarkData.contracts.length === 0) {
        throw ValidationUtils.createValidationError(['At least one contract is required']);
      }
      
      return await this.walletBenchmarkService.executeWalletBenchmark(walletBenchmarkData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to create wallet benchmark session');
    }
  }

  @Get('sessions')
  async getAllSessions(@Query('limit') limit?: string): Promise<BenchmarkSession[]> {
    try {
      const limitNum = limit ? ValidationUtils.validatePaginationParams(limit).limit : undefined;
      return await this.benchmarkService.getAllSessions(limitNum);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to retrieve benchmark sessions');
    }
  }

  @Get('sessions/:id')
  async getSessionById(@Param('id') id: string): Promise<BenchmarkSession | null> {
    try {
      return await this.benchmarkService.getSessionById(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to retrieve benchmark session');
    }
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    try {
      await this.benchmarkService.deleteSession(id);
      return { message: 'Benchmark session deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to delete benchmark session');
    }
  }

  @Get('stats')
  async getSessionStats() {
    try {
      return await this.benchmarkService.getSessionStats();
    } catch (error) {
      throw ValidationUtils.createInternalServerError('Failed to retrieve benchmark statistics');
    }
  }

  @Get('sessions/date-range')
  async getSessionsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<BenchmarkSession[]> {
    try {
      if (!startDate || !endDate) {
        throw ValidationUtils.createValidationError(['Both startDate and endDate are required']);
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw ValidationUtils.createValidationError(['Invalid date format']);
      }
      
      if (start > end) {
        throw ValidationUtils.createValidationError(['Start date must be before end date']);
      }
      
      return await this.benchmarkService.getSessionsByDateRange(start, end);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to retrieve sessions by date range');
    }
  }

  @Post('wallet-results')
  async saveWalletBenchmarkResults(@Body() results: any): Promise<BenchmarkSession> {
    try {
      console.log('=== SAVING WALLET BENCHMARK RESULTS ===');
      console.log('Results:', JSON.stringify(results, null, 2));
      console.log('======================================');
      
      // Validate required fields
      if (!results.walletAddress) {
        throw ValidationUtils.createValidationError(['Wallet address is required']);
      }
      
      if (!results.contractName) {
        throw ValidationUtils.createValidationError(['Contract name is required']);
      }
      
      // Convert frontend results to backend session format
      const sessionData = {
        sessionName: `Wallet Benchmark - ${results.contractName}`,
        status: 'completed',
        benchmarkConfig: {
          contractName: results.contractName,
          networks: results.networks || [],
          totalOperations: results.totalOperations || 0,
          walletAddress: results.walletAddress,
          useWalletSigning: true,
          signedTransactions: results.signedTransactions || 0
        },
        benchmarkResults: {
          results: results.results || {},
          avgGasUsed: results.avgGasUsed || 0,
          avgExecutionTime: results.avgExecutionTime || 0
        },
        totalOperations: results.totalOperations || 0,
        avgGasUsed: results.avgGasUsed || 0,
        avgExecutionTime: results.avgExecutionTime || 0,
        completedAt: new Date()
      };
      
      // Use dataStorage directly since createSession is disabled
      return await this.walletBenchmarkService['dataStorage'].create('benchmarkSession', sessionData);
    } catch (error) {
      console.error('Error saving wallet benchmark results:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw ValidationUtils.createInternalServerError('Failed to save wallet benchmark results');
    }
  }
}