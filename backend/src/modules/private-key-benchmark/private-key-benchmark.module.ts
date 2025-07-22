import { Module } from '@nestjs/common';
import { PrivateKeyBenchmarkController } from '../../controllers/private-key-benchmark.controller';
import { PrivateKeyBenchmarkService } from '../../services/private-key-benchmark.service';
import { AbiModule } from '../../abi/abi.module';
import { DataStorageService } from '../../shared/data-storage.service';

@Module({
  imports: [AbiModule],
  controllers: [PrivateKeyBenchmarkController],
  providers: [PrivateKeyBenchmarkService, DataStorageService],
  exports: [PrivateKeyBenchmarkService],
})
export class PrivateKeyBenchmarkModule {}