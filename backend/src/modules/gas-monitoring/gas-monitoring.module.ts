import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasMonitoringRecord } from '../../entities/gas-monitoring-record.entity';
import { GasMonitoringService } from '../../services/gas-monitoring.service';
import { GasMonitoringController } from '../../controllers/gas-monitoring.controller';
import { CsvExportService } from '../../shared/csv-export.service';

@Module({
  imports: [TypeOrmModule.forFeature([GasMonitoringRecord])],
  controllers: [GasMonitoringController],
  providers: [GasMonitoringService, CsvExportService],
  exports: [GasMonitoringService],
})
export class GasMonitoringModule {}