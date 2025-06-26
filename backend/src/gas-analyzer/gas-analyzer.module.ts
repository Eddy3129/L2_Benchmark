import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasAnalyzerController } from './gas-analyzer.controller';
import { GasAnalyzerService } from './gas-analyzer.service';
import { GasAnalysis } from './gas-analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GasAnalysis])],
  controllers: [GasAnalyzerController],
  providers: [GasAnalyzerService],
  exports: [GasAnalyzerService],
})
export class GasAnalyzerModule {}
