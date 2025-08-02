import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveNetworkForkRecord } from '../../entities/live-network-fork-record.entity';
import { LiveNetworkForkService } from '../../services/live-network-fork.service';
import { LiveNetworkForkController } from '../../controllers/live-network-fork.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveNetworkForkRecord]),
    SharedModule,
  ],
  controllers: [LiveNetworkForkController],
  providers: [LiveNetworkForkService],
  exports: [LiveNetworkForkService],
})
export class LiveNetworkForkModule {}