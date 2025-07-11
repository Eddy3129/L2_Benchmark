import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';
import { BenchmarkSession } from './benchmark.entity';
import { BlockchainExecutorService } from './blockchain-executor.service';
import { WalletBenchmarkService } from './wallet-benchmark.service';

@Module({
  imports: [TypeOrmModule.forFeature([BenchmarkSession])],
  controllers: [BenchmarkController],
  providers: [BenchmarkService, BlockchainExecutorService, WalletBenchmarkService],
  exports: [BenchmarkService, BlockchainExecutorService, WalletBenchmarkService],
})
export class BenchmarkModule {}