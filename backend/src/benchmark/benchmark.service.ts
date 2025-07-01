import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenchmarkSession } from './benchmark.entity';
import { BaseService } from '../shared/base.service';
import { ValidationUtils } from '../shared/validation-utils';
import { BenchmarkSessionData } from '../shared/types';

@Injectable()
export class BenchmarkService extends BaseService<BenchmarkSession> {
  constructor(
    @InjectRepository(BenchmarkSession)
    private benchmarkRepository: Repository<BenchmarkSession>,
  ) {
    super(benchmarkRepository, 'BenchmarkSession');
  }

  async createSession(sessionData: Partial<BenchmarkSession>): Promise<BenchmarkSession> {
    // Validate UUID if provided
    if (sessionData.id) {
      try {
        ValidationUtils.validateUUID(sessionData.id);
      } catch (error) {
        throw ValidationUtils.createValidationError(['Invalid session ID format']);
      }
    }
    
    return await this.create(sessionData);
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