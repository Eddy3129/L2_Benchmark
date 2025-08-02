import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasEstimationRecord } from '../../entities/gas-estimation-record.entity';
import { GasEstimationService } from '../../services/gas-estimation.service';
import { GasEstimationController } from '../../controllers/gas-estimation.controller';
import { CsvExportService } from '../../shared/csv-export.service';

@Module({
  imports: [TypeOrmModule.forFeature([GasEstimationRecord])],
  controllers: [GasEstimationController],
  providers: [GasEstimationService, CsvExportService],
  exports: [GasEstimationService],
})
export class GasEstimationModule {}