import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { NetworkConfigService } from '../config/network.config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BlocknativeApiService {
  private readonly logger = new Logger(BlocknativeApiService.name);
  private readonly apiKey: string;

    constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly networkConfigService: NetworkConfigService,
  ) {
    const apiKey = this.configService.get<string>('BLOCKNATIVE_API_KEY');
    if (!apiKey) {
      this.logger.error('BLOCKNATIVE_API_KEY is not set in the environment variables.');
      throw new Error('BLOCKNATIVE_API_KEY is not set in the environment variables.');
    }
    this.apiKey = apiKey;
  
  }

  async getBaseFeeEstimates(): Promise<any> {
    if (!this.apiKey) {
      this.logger.warn('Blocknative API key is not configured.');
      return null;
    }

    const url = 'https://api.blocknative.com/gasprices/basefee-estimates';

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Api-Key': this.apiKey,
          },
        }),
      );
      return data;
    } catch (error) { 
      this.logger.error('Failed to fetch base fee estimates from Blocknative', error.stack);
      return null;
    }
  }

  async getEthereumBlockPrices(confidenceLevels: number[] = [50, 70, 80, 90, 99]): Promise<any> {
    if (!this.apiKey) {
      this.logger.warn('Blocknative API key is not configured.');
      return null;
    }

    const confidenceParam = confidenceLevels.join(',');
    const url = `https://api.blocknative.com/gasprices/blockprices?chainid=1&confidenceLevels=${confidenceParam}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Api-Key': this.apiKey,
          },
        }),
      );
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch Ethereum block prices from Blocknative', error.stack);
      return null;
    }
  }
}