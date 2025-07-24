import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { GasAnalysisController } from './controllers/gas-analysis.controller';
import { NetworkComparisonController } from './controllers/network-comparison.controller';
import { LiveBenchmarkerController } from './controllers/live-benchmarker.controller';

// Services
import { GasAnalysisService } from './services/gas-analysis.service';
import { ContractCompilationService } from './services/contract-compilation.service';
import { GasEstimationService } from './services/gas-estimation.service';
import { ForkingService } from './services/forking.service';
import { LiveBenchmarkerService } from './services/live-benchmarker.service';
import { NetworkAnalysisService } from './services/network-analysis.service';
import { BytecodeAnalysisService } from './services/bytecode-analysis.service';
import { NetworkComparisonService } from './services/network-comparison.service';
import { BlobCostAnalysisService } from './services/blob-cost-analysis.service';
import { DataStorageService } from '../../shared/data-storage.service';
import { CsvExportService } from '../../shared/csv-export.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
  ],
  controllers: [
    GasAnalysisController,
    NetworkComparisonController,
    LiveBenchmarkerController,
  ],
  providers: [
    DataStorageService,
    CsvExportService,
    GasAnalysisService,
    ContractCompilationService,
    GasEstimationService,
    ForkingService,
    LiveBenchmarkerService,
    NetworkAnalysisService,
    BytecodeAnalysisService,
    NetworkComparisonService,
    BlobCostAnalysisService,
  ],
  exports: [
    DataStorageService,
    CsvExportService,
    GasAnalysisService,
    ContractCompilationService,
    GasEstimationService,
    ForkingService,
    LiveBenchmarkerService,
    NetworkAnalysisService,
    BytecodeAnalysisService,
    NetworkComparisonService,
    BlobCostAnalysisService,
  ],
})
export class GasAnalysisModule {}