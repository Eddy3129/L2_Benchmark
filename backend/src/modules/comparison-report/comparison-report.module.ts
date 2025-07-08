import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ComparisonReportController } from './controllers/comparison-report.controller';
import { ComparisonReportService } from './services/comparison-report.service';
import { ReportGenerationService } from './services/report-generation.service';
import { ReportAnalyticsService } from './services/report-analytics.service';
import { ComparisonReport } from './entities/comparison-report.entity';
import { ReportSection } from './entities/report-section.entity';
import { GasAnalysisModule } from '../gas-analysis/gas-analysis.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ComparisonReport,
      ReportSection,
    ]),
    GasAnalysisModule,
  ],
  controllers: [
    ComparisonReportController,
  ],
  providers: [
    ComparisonReportService,
    ReportGenerationService,
    ReportAnalyticsService,
  ],
  exports: [
    ComparisonReportService,
    ReportGenerationService,
    ReportAnalyticsService,
  ],
})
export class ComparisonReportModule {}