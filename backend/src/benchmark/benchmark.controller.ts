import { Controller, Get, Post, Body } from '@nestjs/common';
import { BenchmarkService } from './benchmark.service';
import { BenchmarkSession } from './benchmark.entity';

@Controller('api/benchmark')
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Post('sessions')
  async createSession(@Body() sessionData: Partial<BenchmarkSession>) {
    return this.benchmarkService.createSession(sessionData);
  }

  @Get('sessions')
  async getAllSessions() {
    return this.benchmarkService.getAllSessions();
  }
}