import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BlocknativeApiService } from './blocknative-api.service';
import { CsvExportService } from './csv-export.service';
import { DataStorageService } from './data-storage.service';
import { NetworkConfigService } from './network-config.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [
    BlocknativeApiService,
    CsvExportService,
    DataStorageService,
    NetworkConfigService,
    ConfigService,
  ],
  exports: [
    BlocknativeApiService,
    CsvExportService,
    DataStorageService,
    NetworkConfigService,
    ConfigService,
    HttpModule,
  ],
})
export class SharedModule {}