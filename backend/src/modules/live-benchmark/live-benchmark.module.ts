import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveBenchmarkRecord } from '../../entities/live-benchmark-record.entity';
import { LiveBenchmarkService } from '../../services/live-benchmark.service';
import { LiveBenchmarkController } from '../../controllers/live-benchmark.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveBenchmarkRecord]),
    SharedModule,
  ],
  controllers: [LiveBenchmarkController],
  providers: [LiveBenchmarkService],
  exports: [LiveBenchmarkService],
})
export class LiveBenchmarkModule {}