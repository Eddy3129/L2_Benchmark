import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasAnalyzerController } from './gas-analyzer.controller';
import { GasAnalyzerService } from './gas-analyzer.service';
import { ComparisonReportService } from './comparison-report.service';
import { GasAnalysis } from './gas-analysis.entity';
import { ComparisonReport } from './comparison-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GasAnalysis, ComparisonReport])],
  controllers: [GasAnalyzerController],
  providers: [GasAnalyzerService, ComparisonReportService],
  exports: [GasAnalyzerService, ComparisonReportService],
})
export class GasAnalyzerModule {}
