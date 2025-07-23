import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComparisonReportController } from './controllers/comparison-report.controller';
import { ComparisonReportService } from './services/comparison-report.service';
import { ReportGenerationService } from './services/report-generation.service';
import { ReportAnalyticsService } from './services/report-analytics.service';
import { DataStorageService } from '../../shared/data-storage.service';
import { CsvExportService } from '../../shared/csv-export.service';
import { GasAnalysisModule } from '../gas-analysis/gas-analysis.module';

@Module({
  imports: [
    ConfigModule,
    GasAnalysisModule,
  ],
  controllers: [
    ComparisonReportController,
  ],
  providers: [
    DataStorageService,
    CsvExportService,
    ComparisonReportService,
    ReportGenerationService,
    ReportAnalyticsService,
  ],
  exports: [
    DataStorageService,
    CsvExportService,
    ComparisonReportService,
    ReportGenerationService,
    ReportAnalyticsService,
  ],
})
export class ComparisonReportModule {}