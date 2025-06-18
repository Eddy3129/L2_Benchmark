import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenchmarkSession } from './benchmark.entity';

@Injectable()
export class BenchmarkService {
  constructor(
    @InjectRepository(BenchmarkSession)
    private benchmarkRepository: Repository<BenchmarkSession>,
  ) {}

  async createSession(sessionData: Partial<BenchmarkSession>): Promise<BenchmarkSession> {
    const session = this.benchmarkRepository.create(sessionData);
    return await this.benchmarkRepository.save(session);
  }

  async getAllSessions(): Promise<BenchmarkSession[]> {
    return await this.benchmarkRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getSessionById(id: string): Promise<BenchmarkSession> {
    const session = await this.benchmarkRepository.findOne({
      where: { id },
    });
    
    if (!session) {
      throw new NotFoundException(`Benchmark session with ID ${id} not found`);
    }
    
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    await this.benchmarkRepository.delete(id);
  }
}