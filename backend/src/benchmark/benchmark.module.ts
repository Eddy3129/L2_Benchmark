import { Module } from '@nestjs/common';
import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';
import { BlockchainExecutorService } from './blockchain-executor.service';
import { WalletBenchmarkService } from './wallet-benchmark.service';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';

@Module({
  controllers: [BenchmarkController],
  providers: [
    BenchmarkService, 
    BlockchainExecutorService, 
    WalletBenchmarkService,
    DataStorageService,
    CsvExportService
  ],
  exports: [
    BenchmarkService, 
    BlockchainExecutorService, 
    WalletBenchmarkService,
    DataStorageService,
    CsvExportService
  ],
})
export class BenchmarkModule {}