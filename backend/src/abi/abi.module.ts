import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AbiController } from './abi.controller';
import { AbiService } from './abi.service';

@Module({
  imports: [ConfigModule],
  controllers: [AbiController],
  providers: [AbiService],
  exports: [AbiService], // Export service for use in other modules
})
export class AbiModule {}