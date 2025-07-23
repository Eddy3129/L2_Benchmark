import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { GasAnalyzerController } from './gas-analyzer.controller';
import { GasAnalyzerService } from './gas-analyzer.service';
import { ComparisonReportService } from './comparison-report.service';


import { AdvancedAnalysisController } from './controllers/advanced-analysis.controller';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { FinalityCalculatorService } from './finality-calculator.service';
import { PriceOracleService } from './price-oracle.service';
import { SharedModule } from '../shared/shared.module';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    SharedModule,
  ],
  controllers: [GasAnalyzerController, AdvancedAnalysisController],
  providers: [
    GasAnalyzerService,
    ComparisonReportService,

    BlockchainMonitorService,
    FinalityCalculatorService,
    PriceOracleService,
  ],
  exports: [
    GasAnalyzerService,
    ComparisonReportService,

  ],
})
export class GasAnalyzerModule {}
