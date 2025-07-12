import { Injectable, Logger } from '@nestjs/common';
import { ValidationUtils } from '../shared/validation-utils';
import { BenchmarkSessionData } from '../shared/types';
import { BlockchainExecutorService } from './blockchain-executor.service';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';

interface BenchmarkSession {
  id: string;
  sessionName: string;
  status: string;
  results: any;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: any;
}

@Injectable()
export class BenchmarkService {
  protected readonly logger = new Logger(BenchmarkService.name);
  
  constructor(
    private dataStorage: DataStorageService,
    private csvExport: CsvExportService,
    private blockchainExecutor: BlockchainExecutorService,
  ) {}

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
        sessionName: sessionData.contractName || sessionData.sessionName || 'Benchmark Session',
        status: 'completed',
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
        avgExecutionTime: avgExecutionTime,
        completedAt: new Date()
      };
      
      this.logger.log(`Benchmark completed: ${successfulTransactions}/${totalTransactions} transactions successful`);
      return this.dataStorage.create('benchmarkSession', transformedData);
      
    } catch (error) {
      this.logger.error(`Benchmark execution failed: ${error.message}`);
      
      // Create a session with error information
      const transformedData: Partial<BenchmarkSession> = {
        id: sessionData.id,
        sessionName: sessionData.contractName || sessionData.sessionName || 'Benchmark Session',
        status: 'failed',
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
      
      return this.dataStorage.create('benchmarkSession', transformedData);
    }
  }

  async getAllSessions(limit?: number): Promise<BenchmarkSession[]> {
    const sessions = this.dataStorage.findAll('benchmarkSession');
    // Sort by createdAt DESC
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? sessions.slice(0, limit) : sessions;
  }

  async getSessionById(id: string): Promise<BenchmarkSession> {
    ValidationUtils.validateUUID(id);
    const session = this.dataStorage.findById('benchmarkSession', id);
    if (!session) {
      throw ValidationUtils.createNotFoundError('BenchmarkSession', id);
    }
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    ValidationUtils.validateUUID(id);
    const deleted = this.dataStorage.delete('benchmarkSession', id);
    if (!deleted) {
      throw ValidationUtils.createNotFoundError('BenchmarkSession', id);
    }
  }

  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<BenchmarkSession[]> {
    return this.dataStorage.findAll('benchmarkSession', (session) => {
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= startDate && sessionDate <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    avgOperations: number;
    avgGasUsed: number;
    avgExecutionTime: number;
  }> {
    const sessions = this.dataStorage.findAll('benchmarkSession');
    
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

  /**
   * Export all benchmark sessions to CSV
   */
  async exportSessionsToCsv(): Promise<string> {
    const sessions = this.dataStorage.findAll('benchmarkSession');
    return this.csvExport.exportBenchmarkData(sessions);
  }

  /**
   * Export sessions by date range to CSV
   */
  async exportSessionsByDateRangeToCsv(startDate: Date, endDate: Date): Promise<string> {
    const sessions = await this.getSessionsByDateRange(startDate, endDate);
    return this.csvExport.exportBenchmarkData(sessions);
  }

  /**
   * Export session by ID to CSV
   */
  async exportSessionToCsv(id: string): Promise<string> {
    const session = await this.getSessionById(id);
    return this.csvExport.exportBenchmarkData([session]);
  }
}