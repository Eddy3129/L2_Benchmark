import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BenchmarkModule } from './benchmark/benchmark.module';
import { GasAnalyzerModule } from './gas-analyzer/gas-analyzer.module';
import { AbiModule } from './abi/abi.module';
import { GasAnalysisModule } from './modules/gas-analysis/gas-analysis.module';
import { ComparisonReportModule } from './modules/comparison-report/comparison-report.module';
import networkConfig from './config/network.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [networkConfig],
    }),
    BenchmarkModule,
    GasAnalyzerModule,
    AbiModule,
    GasAnalysisModule,
    ComparisonReportModule,
  ],
})
export class AppModule {}