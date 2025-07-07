import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { GasAnalyzerController } from './gas-analyzer.controller';
import { GasAnalyzerService } from './gas-analyzer.service';
import { ComparisonReportService } from './comparison-report.service';
import { SequencerPerformanceService } from './sequencer-performance.service';
import { L1FinalityService } from './l1-finality.service';
import { ContractComplexityService } from './contract-complexity.service';
import { AdvancedAnalysisController } from './controllers/advanced-analysis.controller';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { FinalityCalculatorService } from './finality-calculator.service';
import { PriceOracleService } from './price-oracle.service';
import { GasAnalysis } from './gas-analysis.entity';
import { ComparisonReport } from './comparison-report.entity';
import { SequencerPerformanceTest } from './sequencer-performance.entity';
import { L1FinalityTracking } from './l1-finality.entity';
import { ContractComplexityProfile } from './contract-complexity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GasAnalysis,
      ComparisonReport,
      SequencerPerformanceTest,
      L1FinalityTracking,
      ContractComplexityProfile,
    ]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [GasAnalyzerController, AdvancedAnalysisController],
  providers: [
    GasAnalyzerService,
    ComparisonReportService,
    SequencerPerformanceService,
    L1FinalityService,
    ContractComplexityService,
    BlockchainMonitorService,
    FinalityCalculatorService,
    PriceOracleService,
  ],
  exports: [
    GasAnalyzerService,
    ComparisonReportService,
    SequencerPerformanceService,
    L1FinalityService,
    ContractComplexityService,
  ],
})
export class GasAnalyzerModule {}
