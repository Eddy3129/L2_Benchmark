import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { GasAnalysisController } from './controllers/gas-analysis.controller';
import { NetworkComparisonController } from './controllers/network-comparison.controller';

// Services
import { GasAnalysisService } from './services/gas-analysis.service';
import { ContractCompilationService } from './services/contract-compilation.service';
import { GasEstimationService } from './services/gas-estimation.service';
import { NetworkAnalysisService } from './services/network-analysis.service';
import { BytecodeAnalysisService } from './services/bytecode-analysis.service';
import { NetworkComparisonService } from './services/network-comparison.service';
import { BlobCostAnalysisService } from './services/blob-cost-analysis.service';

// Entities
import { GasAnalysis } from './entities/gas-analysis.entity';
import { NetworkResult } from './entities/network-result.entity';
import { CompilationResult } from './entities/compilation-result.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      GasAnalysis,
      NetworkResult,
      CompilationResult,
    ]),
  ],
  controllers: [
    GasAnalysisController,
    NetworkComparisonController,
  ],
  providers: [
    GasAnalysisService,
    ContractCompilationService,
    GasEstimationService,
    NetworkAnalysisService,
    BytecodeAnalysisService,
    NetworkComparisonService,
    BlobCostAnalysisService,
  ],
  exports: [
    GasAnalysisService,
    ContractCompilationService,
    GasEstimationService,
    NetworkAnalysisService,
    BytecodeAnalysisService,
    NetworkComparisonService,
    BlobCostAnalysisService,
  ],
})
export class GasAnalysisModule {}