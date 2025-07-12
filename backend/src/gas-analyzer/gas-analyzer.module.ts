import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { GasAnalyzerController } from './gas-analyzer.controller';
import { GasAnalyzerService } from './gas-analyzer.service';
import { ComparisonReportService } from './comparison-report.service';
import { SequencerPerformanceService } from './sequencer-performance.service';
import { L1FinalityService } from './l1-finality.service';

import { AdvancedAnalysisController } from './controllers/advanced-analysis.controller';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { FinalityCalculatorService } from './finality-calculator.service';
import { PriceOracleService } from './price-oracle.service';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [GasAnalyzerController, AdvancedAnalysisController],
  providers: [
    DataStorageService,
    CsvExportService,
    GasAnalyzerService,
    ComparisonReportService,
    SequencerPerformanceService,
    L1FinalityService,
    BlockchainMonitorService,
    FinalityCalculatorService,
    PriceOracleService,
  ],
  exports: [
    DataStorageService,
    CsvExportService,
    GasAnalyzerService,
    ComparisonReportService,
    SequencerPerformanceService,
    L1FinalityService,
  ],
})
export class GasAnalyzerModule {}
