import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';
import { BenchmarkSession } from './benchmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BenchmarkSession])],
  controllers: [BenchmarkController],
  providers: [BenchmarkService],
  exports: [BenchmarkService],
})
export class BenchmarkModule {}