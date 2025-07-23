import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface PriceData {
  price: number;
  timestamp: Date;
  source: string;
}

interface HistoricalPriceData {
  timestamp: Date;
  price: number;
}

interface CostMetrics {
  l1GasCostETH: string;
  l1GasCostUSD: number;
  amortizedCostPerTxETH: string;
  amortizedCostPerTxUSD: number;
  batchEfficiency: number; // Transactions per gas unit
  costPerGasUSD: number;
}

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name);
  private cachedPrice: PriceData | null = null;
  private readonly CACHE_DURATION_MS = 60000; // 1 minute cache
  private readonly PRICE_SOURCES = [
    'coingecko',
    'coinmarketcap',
    'binance'
  ];

  constructor(private readonly httpService: HttpService) {}

  async getETHPrice(): Promise<number> {
    // Check cache first
    if (this.cachedPrice && this.isCacheValid()) {
      return this.cachedPrice.price;
    }

    // Try multiple price sources for reliability
    for (const source of this.PRICE_SOURCES) {
      try {
        const price = await this.fetchPriceFromSource(source);
        if (price > 0) {
          this.cachedPrice = {
            price,
            timestamp: new Date(),
            source
          };
          this.logger.log(`ETH price updated: $${price.toFixed(2)} from ${source}`);
          return price;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch ETH price from ${source}: ${error.message}`);
      }
    }

    // Fallback to cached price if available
    if (this.cachedPrice) {
      this.logger.warn('Using stale cached ETH price');
      return this.cachedPrice.price;
    }

    // Last resort fallback
    this.logger.error('All price sources failed, using fallback price');
    return 2000; // Conservative fallback
  }

  private async fetchPriceFromSource(source: string): Promise<number> {
    switch (source) {
      case 'coingecko':
        return await this.fetchFromCoinGecko();
      case 'coinmarketcap':
        return await this.fetchFromCoinMarketCap();
      case 'binance':
        return await this.fetchFromBinance();
      default:
        throw new Error(`Unknown price source: ${source}`);
    }
  }

  private async fetchFromCoinGecko(): Promise<number> {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      const price = (response as any).data?.ethereum?.usd;
      if (typeof price === 'number' && price > 0) {
        return price;
      }
      
      throw new Error('Invalid price data from CoinGecko');
    } catch (error) {
      throw new Error(`CoinGecko API error: ${error.message}`);
    }
  }

  private async fetchFromCoinMarketCap(): Promise<number> {
    // Note: CoinMarketCap requires API key for production use
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    if (!apiKey) {
      throw new Error('CoinMarketCap API key not configured');
    }

    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json'
          },
          params: {
            symbol: 'ETH',
            convert: 'USD'
          }
        })
      );
      
      const price = (response as any).data?.data?.ETH?.quote?.USD?.price;
      if (typeof price === 'number' && price > 0) {
        return price;
      }
      
      throw new Error('Invalid price data from CoinMarketCap');
    } catch (error) {
      throw new Error(`CoinMarketCap API error: ${error.message}`);
    }
  }

  private async fetchFromBinance(): Promise<number> {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      const price = parseFloat((response as any).data?.price);
      if (price > 0) {
        return price;
      }
      
      throw new Error('Invalid price data from Binance');
    } catch (error) {
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  async getHistoricalETHPrice(timestamp: Date): Promise<number> {
    // For historical prices, we'll use CoinGecko's historical API
    const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
    const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dateString}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      const price = (response as any).data?.market_data?.current_price?.usd;
      if (typeof price === 'number' && price > 0) {
        this.logger.log(`Historical ETH price for ${dateString}: $${price.toFixed(2)}`);
        return price;
      }
      
      throw new Error('Invalid historical price data');
    } catch (error) {
      this.logger.warn(`Failed to fetch historical ETH price for ${dateString}: ${error.message}`);
      
      // Fallback to current price
      return await this.getETHPrice();
    }
  }

  async calculateCostMetrics(
    l1GasCost: bigint,
    actualTxCount: number,
    ethPrice?: number
  ): Promise<CostMetrics> {
    const currentETHPrice = ethPrice || await this.getETHPrice();
    
    // Convert gas cost from wei to ETH
    const l1GasCostETH = parseFloat((Number(l1GasCost) / 1e18).toFixed(18));
    const l1GasCostUSD = l1GasCostETH * currentETHPrice;
    
    // Calculate amortized cost per transaction
    const amortizedCostPerTxETH = actualTxCount > 0 ? l1GasCostETH / actualTxCount : 0;
    const amortizedCostPerTxUSD = actualTxCount > 0 ? l1GasCostUSD / actualTxCount : 0;
    
    // Calculate batch efficiency (transactions per gas unit)
    const batchEfficiency = actualTxCount > 0 ? actualTxCount / Number(l1GasCost) * 1e18 : 0;
    
    // Calculate cost per gas unit in USD
    const costPerGasUSD = Number(l1GasCost) > 0 ? l1GasCostUSD / Number(l1GasCost) * 1e18 : 0;
    
    return {
      l1GasCostETH: l1GasCostETH.toFixed(18),
      l1GasCostUSD: parseFloat(l1GasCostUSD.toFixed(6)),
      amortizedCostPerTxETH: amortizedCostPerTxETH.toFixed(18),
      amortizedCostPerTxUSD: parseFloat(amortizedCostPerTxUSD.toFixed(6)),
      batchEfficiency: parseFloat(batchEfficiency.toFixed(6)),
      costPerGasUSD: parseFloat(costPerGasUSD.toFixed(12))
    };
  }

  async calculateHistoricalCostMetrics(
    l1GasCost: bigint,
    actualTxCount: number,
    timestamp: Date
  ): Promise<CostMetrics> {
    const historicalETHPrice = await this.getHistoricalETHPrice(timestamp);
    return await this.calculateCostMetrics(l1GasCost, actualTxCount, historicalETHPrice);
  }

  private isCacheValid(): boolean {
    if (!this.cachedPrice) {
      return false;
    }
    
    const now = new Date();
    const cacheAge = now.getTime() - this.cachedPrice.timestamp.getTime();
    return cacheAge < this.CACHE_DURATION_MS;
  }

  // Method to get price trends for analysis
  async getPriceTrend(days: number = 7): Promise<HistoricalPriceData[]> {
    const url = `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=${days}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      const prices = (response as any).data?.prices;
      if (Array.isArray(prices)) {
        return prices.map(([timestamp, price]) => ({
          timestamp: new Date(timestamp),
          price
        }));
      }
      
      throw new Error('Invalid price trend data');
    } catch (error) {
      this.logger.warn(`Failed to fetch price trend: ${error.message}`);
      return [];
    }
  }

  // Method to validate if a price seems reasonable
  validatePrice(price: number): boolean {
    // ETH price should be between $100 and $10,000 for basic sanity check
    return price >= 100 && price <= 10000;
  }

  // Method to get price with confidence interval
  async getPriceWithConfidence(): Promise<{ price: number; confidence: number; sources: string[] }> {
    const prices: { price: number; source: string }[] = [];
    
    // Fetch from multiple sources
    for (const source of this.PRICE_SOURCES) {
      try {
        const price = await this.fetchPriceFromSource(source);
        if (this.validatePrice(price)) {
          prices.push({ price, source });
        }
      } catch (error) {
        // Continue with other sources
      }
    }
    
    if (prices.length === 0) {
      throw new Error('No valid price sources available');
    }
    
    // Calculate average price
    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    
    // Calculate confidence based on price consistency
    const maxDeviation = Math.max(...prices.map(p => Math.abs(p.price - avgPrice)));
    const confidence = Math.max(0, 100 - (maxDeviation / avgPrice) * 100);
    
    return {
      price: avgPrice,
      confidence: Math.round(confidence),
      sources: prices.map(p => p.source)
    };
  }

  // Cleanup method
  clearCache(): void {
    this.cachedPrice = null;
    this.logger.log('Price cache cleared');
  }
}