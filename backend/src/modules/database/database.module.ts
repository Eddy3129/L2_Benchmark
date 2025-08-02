import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GasMonitoringRecord } from '../../entities/gas-monitoring-record.entity';
import { GasEstimationRecord } from '../../entities/gas-estimation-record.entity';
import { LiveBenchmarkRecord } from '../../entities/live-benchmark-record.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'benchmark_db'),
        entities: [GasMonitoringRecord, GasEstimationRecord, LiveBenchmarkRecord],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([GasMonitoringRecord, GasEstimationRecord, LiveBenchmarkRecord]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}