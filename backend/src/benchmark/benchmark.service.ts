import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenchmarkSession } from './benchmark.entity';
import { BaseService } from '../shared/base.service';
import { ValidationUtils } from '../shared/validation-utils';
import { BenchmarkSessionData } from '../shared/types';
import { BlockchainExecutorService } from './blockchain-executor.service';

@Injectable()
export class BenchmarkService extends BaseService<BenchmarkSession> {
  protected readonly logger = new Logger(BenchmarkService.name);
  
  constructor(
    @InjectRepository(BenchmarkSession)
    private benchmarkRepository: Repository<BenchmarkSession>,
    private blockchainExecutor: BlockchainExecutorService,
  ) {
    super(benchmarkRepository, 'BenchmarkSession');
  }

  async createSession(sessionData: any): Promise<BenchmarkSession> {
    // Validate UUID if provided
    if (sessionData.id) {
      try {
        ValidationUtils.validateUUID(sessionData.id);
      } catch (error) {
        throw ValidationUtils.createValidationError(['Invalid session ID format']);
      }
    }

    this.logger.log(`Starting benchmark execution for ${sessionData.contracts?.length || 0} contracts`);
    
    try {
      // Execute real blockchain transactions
      const executionResults = await this.blockchainExecutor.executeBenchmark(
        sessionData.contracts || [],
        sessionData.functions || ['transfer', 'approve', 'balanceOf']
      );
      
      // Calculate aggregated metrics
      const totalTransactions = executionResults.reduce((sum, result) => 
        sum + result.transactions.totalTransactions, 0);
      const successfulTransactions = executionResults.reduce((sum, result) => 
        sum + result.transactions.successfulTransactions, 0);
      const totalGasUsed = executionResults.reduce((sum, result) => 
        sum + parseInt(result.transactions.totalGasUsed || '0'), 0);
      const totalExecutionTime = executionResults.reduce((sum, result) => 
        sum + result.functions.reduce((funcSum, func) => funcSum + func.executionTime, 0), 0);
      
      const avgGasUsed = totalTransactions > 0 ? totalGasUsed / totalTransactions : 0;
      const avgExecutionTime = totalTransactions > 0 ? totalExecutionTime / totalTransactions : 0;
      
      // Transform frontend data to match entity structure
      const transformedData: Partial<BenchmarkSession> = {
        id: sessionData.id,
        results: {
          contractName: sessionData.contractName || 'Unknown Contract',
          networks: sessionData.networks || [],
          contracts: executionResults,
          functions: sessionData.functions || [],
          timestamp: sessionData.timestamp || new Date().toISOString(),
          executionSummary: {
            totalTransactions,
            successfulTransactions,
            failedTransactions: totalTransactions - successfulTransactions,
            successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
          }
        },
        totalOperations: totalTransactions,
        avgGasUsed: avgGasUsed,
        avgExecutionTime: avgExecutionTime
      };
      
      this.logger.log(`Benchmark completed: ${successfulTransactions}/${totalTransactions} transactions successful`);
      return await this.create(transformedData);
      
    } catch (error) {
      this.logger.error(`Benchmark execution failed: ${error.message}`);
      
      // Create a session with error information
      const transformedData: Partial<BenchmarkSession> = {
        id: sessionData.id,
        results: {
          contractName: sessionData.contractName || 'Unknown Contract',
          networks: sessionData.networks || [],
          contracts: sessionData.contracts || [],
          functions: sessionData.functions || [],
          timestamp: sessionData.timestamp || new Date().toISOString(),
          error: error.message,
          executionSummary: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            successRate: 0
          }
        },
        totalOperations: 0,
        avgGasUsed: 0,
        avgExecutionTime: 0
      };
      
      return await this.create(transformedData);
    }
  }

  async getAllSessions(limit?: number): Promise<BenchmarkSession[]> {
    const options = {
      order: { createdAt: 'DESC' as const },
      ...(limit && { take: limit })
    };
    
    return await this.findAll(options);
  }

  async getSessionById(id: string): Promise<BenchmarkSession> {
    // findById already validates UUID and throws not found error
    return await this.findById(id);
  }

  async deleteSession(id: string): Promise<void> {
    // deleteById already validates UUID and checks existence
    await this.deleteById(id);
  }

  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<BenchmarkSession[]> {
    return await this.getRepository()
      .createQueryBuilder('session')
      .where('session.createdAt >= :startDate', { startDate })
      .andWhere('session.createdAt <= :endDate', { endDate })
      .orderBy('session.createdAt', 'DESC')
      .getMany();
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    avgOperations: number;
    avgGasUsed: number;
    avgExecutionTime: number;
  }> {
    const sessions = await this.findAll();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgOperations: 0,
        avgGasUsed: 0,
        avgExecutionTime: 0
      };
    }
    
    const totals = sessions.reduce((acc, session) => {
      acc.operations += session.totalOperations || 0;
      acc.gasUsed += session.avgGasUsed || 0;
      acc.executionTime += session.avgExecutionTime || 0;
      return acc;
    }, { operations: 0, gasUsed: 0, executionTime: 0 });
    
    return {
      totalSessions: sessions.length,
      avgOperations: totals.operations / sessions.length,
      avgGasUsed: totals.gasUsed / sessions.length,
      avgExecutionTime: totals.executionTime / sessions.length
    };
  }
}