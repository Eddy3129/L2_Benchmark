import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BenchmarkModule } from './benchmark/benchmark.module';
import { GasAnalyzerModule } from './gas-analyzer/gas-analyzer.module';
import { AbiModule } from './abi/abi.module';
import { GasAnalysisModule } from './modules/gas-analysis/gas-analysis.module';
import { ComparisonReportModule } from './modules/comparison-report/comparison-report.module';
import { DatabaseModule } from './modules/database/database.module';
import { GasMonitoringModule } from './modules/gas-monitoring/gas-monitoring.module';
import { GasEstimationModule } from './modules/gas-estimation/gas-estimation.module';
import { LiveBenchmarkModule } from './modules/live-benchmark/live-benchmark.module';

import { SharedModule } from './shared/shared.module';
import { createNetworkConfig } from './config/shared-networks';
import { registerAs } from '@nestjs/config';
import appConfig from './config/app.config';



const networkConfig = registerAs('networks', createNetworkConfig);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, networkConfig],
      cache: true,
    }),
    DatabaseModule,

    BenchmarkModule,
    GasAnalyzerModule,
    AbiModule,
    GasAnalysisModule,
    ComparisonReportModule,
    GasMonitoringModule,
    GasEstimationModule,
    LiveBenchmarkModule,

    SharedModule,
  ],
  controllers: [],
})
export class AppModule {}