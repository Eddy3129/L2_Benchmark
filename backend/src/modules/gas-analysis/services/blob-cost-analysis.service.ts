import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from '../../../common/base.service';
import {
  BlobCostComparisonRequestDto,
} from '../../../common/dto/gas-analysis.dto';
import {
  BlobCostComparisonDto,
} from '../../../common/dto/comparison-report.dto';
import { SuccessResponseDto } from '../../../common/dto/base.dto';
import { ValidationUtils, NumberUtils } from '../../../common/utils';
import { CONSTANTS } from '../../../common/constants';

interface BlobPricing {
  baseFeePerBlob: number;
  blobGasPrice: number;
  targetBlobsPerBlock: number;
  maxBlobsPerBlock: number;
  blobSize: number; // in bytes
}

interface NetworkBlobConfig {
  networkId: string;
  networkName: string;
  chainId: number;
  supportsBlobTx: boolean;
  blobPricing?: BlobPricing;
  alternativeCost?: {
    calldataCostPerByte: number;
    description: string;
  };
}

@Injectable()
export class BlobCostAnalysisService extends BaseService {

  private readonly networkConfigs: Map<string, NetworkBlobConfig> = new Map([
    // Mainnets
    [
      'ethereum',
      {
        networkId: 'ethereum',
        networkName: 'Ethereum Mainnet',
        chainId: 1,
        supportsBlobTx: true,
        blobPricing: {
          baseFeePerBlob: 1, // Base fee in gwei
          blobGasPrice: 1, // Current blob gas price in gwei
          targetBlobsPerBlock: 3,
          maxBlobsPerBlock: 6,
          blobSize: 131072, // 128KB
        },
      },
    ],
    [
      'arbitrum',
      {
        networkId: 'arbitrum',
        networkName: 'Arbitrum One',
        chainId: 42161,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16, // Gas cost per byte of calldata
          description: 'Uses calldata compression instead of blob transactions',
        },
      },
    ],
    [
      'optimism',
      {
        networkId: 'optimism',
        networkName: 'Optimism',
        chainId: 10,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data availability',
        },
      },
    ],
    [
      'polygon',
      {
        networkId: 'polygon',
        networkName: 'Polygon',
        chainId: 137,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses traditional calldata approach',
        },
      },
    ],
    [
      'base',
      {
        networkId: 'base',
        networkName: 'Base',
        chainId: 8453,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data storage',
        },
      },
    ],
    // Testnets
    [
      'sepolia',
      {
        networkId: 'sepolia',
        networkName: 'Sepolia Testnet',
        chainId: 11155111,
        supportsBlobTx: true,
        blobPricing: {
          baseFeePerBlob: 1,
          blobGasPrice: 1,
          targetBlobsPerBlock: 3,
          maxBlobsPerBlock: 6,
          blobSize: 131072,
        },
      },
    ],
    [
      'arbitrumSepolia',
      {
        networkId: 'arbitrumSepolia',
        networkName: 'Arbitrum Sepolia',
        chainId: 421614,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata compression instead of blob transactions',
        },
      },
    ],
    [
      'arbitrum-sepolia',
      {
        networkId: 'arbitrum-sepolia',
        networkName: 'Arbitrum Sepolia',
        chainId: 421614,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata compression instead of blob transactions',
        },
      },
    ],
    [
      'optimismSepolia',
      {
        networkId: 'optimismSepolia',
        networkName: 'Optimism Sepolia',
        chainId: 11155420,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data availability',
        },
      },
    ],
    [
      'optimism-sepolia',
      {
        networkId: 'optimism-sepolia',
        networkName: 'Optimism Sepolia',
        chainId: 11155420,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data availability',
        },
      },
    ],
    [
      'baseSepolia',
      {
        networkId: 'baseSepolia',
        networkName: 'Base Sepolia',
        chainId: 84532,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data storage',
        },
      },
    ],
    [
      'base-sepolia',
      {
        networkId: 'base-sepolia',
        networkName: 'Base Sepolia',
        chainId: 84532,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses calldata for data storage',
        },
      },
    ],
    [
      'polygonAmoy',
      {
        networkId: 'polygonAmoy',
        networkName: 'Polygon Amoy',
        chainId: 80002,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses traditional calldata approach',
        },
      },
    ],
    [
      'polygonZkEvm',
      {
        networkId: 'polygonZkEvm',
        networkName: 'Polygon zkEVM Testnet',
        chainId: 1442,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses zkEVM calldata approach',
        },
      },
    ],
    [
      'zkSyncSepolia',
      {
        networkId: 'zkSyncSepolia',
        networkName: 'zkSync Sepolia',
        chainId: 300,
        supportsBlobTx: false,
        alternativeCost: {
          calldataCostPerByte: 16,
          description: 'Uses zkSync calldata approach',
        },
      },
    ],
  ]);

  /**
   * Compare blob transaction costs across networks
   */
  async compareBlobCosts(
    request: BlobCostComparisonRequestDto,
  ): Promise<SuccessResponseDto<BlobCostComparisonDto>> {
    try {
      // Calculate data size from the provided data
      const dataSize = Buffer.from(request.data, 'hex').length;
      const blobCount = this.calculateRequiredBlobs(dataSize);
      
      this.logger.log(
        `Starting blob cost comparison for ${dataSize} bytes across ${request.networks.length} networks`,
      );

      // Validate input
      this.validateBlobComparisonRequest(request);

      // Calculate costs for each network
      const networkComparisons = await Promise.all(
        request.networks.map(async (networkId) => {
          const config = this.networkConfigs.get(networkId);
          if (!config) {
            throw new Error(`Unsupported network: ${networkId}`);
          }

          return await this.calculateNetworkBlobCost(
            config,
            dataSize,
            blobCount,
          );
        }),
      );

      // Sort by total cost
      networkComparisons.sort((a, b) => a.totalCostUSD - b.totalCostUSD);

      // Calculate savings and rankings
      const mostExpensiveCost = networkComparisons[networkComparisons.length - 1].totalCostUSD;
      networkComparisons.forEach((comparison, index) => {
        comparison.rank = index + 1;
        comparison.savingsPercentage = NumberUtils.calculatePercentage(
          mostExpensiveCost - comparison.totalCostUSD,
          mostExpensiveCost,
        );
      });

      // Build response
      const result: BlobCostComparisonDto = {
        id: this.generateComparisonId(),
        data: {
          type: request.dataType || 'bytecode',
          size: dataSize,
          hash: Buffer.from(request.data, 'hex').toString('hex').substring(0, 64),
        },
        networkComparisons: networkComparisons.map(comparison => ({
          network: comparison.networkId,
          blobCost: {
            gasUsed: comparison.gasUsed,
            gasPriceGwei: 20, // Default gas price
            totalCostETH: (comparison.totalCostUSD / 2000).toFixed(8), // Assume $2000 ETH
            totalCostUSD: comparison.totalCostUSD,
          },
          savings: {
            comparedToBaseline: {
              absoluteETH: '0.0',
              absoluteUSD: 0,
              percentage: comparison.savingsPercentage,
            },
          },
        })),
        baseline: networkComparisons[0].networkId,
        timestamp: new Date().toISOString(),
        summary: {
          cheapestNetwork: networkComparisons[0].networkId,
          mostExpensiveNetwork: networkComparisons[networkComparisons.length - 1].networkId,
          maxSavings: {
            absoluteETH: ((networkComparisons[networkComparisons.length - 1].totalCostUSD - networkComparisons[0].totalCostUSD) / 2000).toFixed(8),
            percentage: networkComparisons[networkComparisons.length - 1].savingsPercentage,
          },
          averageCost: {
            ETH: (NumberUtils.calculateAverage(networkComparisons.map((n) => n.totalCostUSD)) / 2000).toFixed(8),
            USD: NumberUtils.calculateAverage(networkComparisons.map((n) => n.totalCostUSD)),
          },
        },
      };

      this.logger.log(
        `Blob cost comparison completed. Cheapest: ${result.summary.cheapestNetwork}, Most expensive: ${result.summary.mostExpensiveNetwork}`,
      );

      return this.createSuccessResponse(
        result,
        'Blob cost comparison completed successfully',
      );
    } catch (error) {
      this.logger.error(
        `Blob cost comparison failed: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'BLOB_COMPARISON_FAILED',
        `Failed to compare blob costs: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Get current blob pricing for a specific network
   */
  async getBlobPricing(networkId: string): Promise<SuccessResponseDto<any>> {
    try {
      const config = this.networkConfigs.get(networkId);
      if (!config) {
        throw this.createError(
          'NETWORK_NOT_FOUND',
          `Network ${networkId} not found`,
          404,
        );
      }

      let pricingInfo;
      if (config.supportsBlobTx && config.blobPricing) {
        // Get current blob gas price (simulated)
        const currentBlobGasPrice = await this.getCurrentBlobGasPrice(networkId);
        
        pricingInfo = {
          networkId: config.networkId,
          networkName: config.networkName,
          supportsBlobTx: true,
          pricing: {
            baseFeePerBlob: config.blobPricing.baseFeePerBlob,
            currentBlobGasPrice: currentBlobGasPrice,
            targetBlobsPerBlock: config.blobPricing.targetBlobsPerBlock,
            maxBlobsPerBlock: config.blobPricing.maxBlobsPerBlock,
            blobSize: config.blobPricing.blobSize,
            costPerBlob: this.calculateCostPerBlob(
              config.blobPricing.baseFeePerBlob,
              currentBlobGasPrice,
            ),
          },
          lastUpdated: new Date().toISOString(),
        };
      } else {
        pricingInfo = {
          networkId: config.networkId,
          networkName: config.networkName,
          supportsBlobTx: false,
          alternativeMethod: config.alternativeCost,
          lastUpdated: new Date().toISOString(),
        };
      }

      return this.createSuccessResponse(
        pricingInfo,
        'Blob pricing information retrieved successfully',
      );
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      this.logger.error(
        `Failed to get blob pricing: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'PRICING_FETCH_FAILED',
        'Failed to retrieve blob pricing information',
        500,
      );
    }
  }

  /**
   * Estimate blob transaction cost for specific data size
   */
  async estimateBlobCost(
    networkId: string,
    dataSize: number,
  ): Promise<SuccessResponseDto<any>> {
    try {
      const config = this.networkConfigs.get(networkId);
      if (!config) {
        throw this.createError(
          'NETWORK_NOT_FOUND',
          `Network ${networkId} not found`,
          404,
        );
      }

      const requiredBlobs = this.calculateRequiredBlobs(dataSize);
      const costEstimate = await this.calculateNetworkBlobCost(
        config,
        dataSize,
        requiredBlobs,
      );

      const estimate = {
        networkId: config.networkId,
        networkName: config.networkName,
        dataSize,
        requiredBlobs,
        supportsBlobTx: config.supportsBlobTx,
        cost: {
          totalCostUSD: costEstimate.totalCostUSD,
          costPerByte: costEstimate.costPerByte,
          costPerBlob: costEstimate.costPerBlob,
          gasUsed: costEstimate.gasUsed,
        },
        breakdown: costEstimate.breakdown,
        timestamp: new Date().toISOString(),
      };

      return this.createSuccessResponse(
        estimate,
        'Blob cost estimate calculated successfully',
      );
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      this.logger.error(
        `Failed to estimate blob cost: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'ESTIMATION_FAILED',
        'Failed to estimate blob transaction cost',
        500,
      );
    }
  }

  /**
   * Get blob transaction statistics
   */
  async getBlobStats(): Promise<SuccessResponseDto<any>> {
    try {
      const stats = {
        supportedNetworks: Array.from(this.networkConfigs.values())
          .filter((config) => config.supportsBlobTx)
          .map((config) => ({
            networkId: config.networkId,
            networkName: config.networkName,
            chainId: config.chainId,
          })),
        blobSpecifications: {
          maxBlobSize: 131072, // 128KB
          targetBlobsPerBlock: 3,
          maxBlobsPerBlock: 6,
          blobGasTarget: 393216, // 3 * 131072
          blobGasMax: 786432, // 6 * 131072
        },
        costFactors: {
          baseFeeMultiplier: 'Dynamic based on network congestion',
          blobGasPriceFormula: 'EIP-4844 exponential pricing',
          targetUtilization: '50% (3 blobs per block)',
        },
        useCases: [
          {
            name: 'Layer 2 Data Availability',
            description: 'Storing rollup transaction data',
            typicalDataSize: '100KB - 128KB',
            estimatedSavings: '90-95% vs calldata',
          },
          {
            name: 'Large Data Storage',
            description: 'Storing large datasets on-chain',
            typicalDataSize: '50KB - 128KB',
            estimatedSavings: '80-90% vs calldata',
          },
          {
            name: 'NFT Metadata',
            description: 'Storing NFT metadata and images',
            typicalDataSize: '10KB - 50KB',
            estimatedSavings: '70-85% vs calldata',
          },
        ],
        lastUpdated: new Date().toISOString(),
      };

      return this.createSuccessResponse(
        stats,
        'Blob transaction statistics retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to get blob stats: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'STATS_FETCH_FAILED',
        'Failed to retrieve blob transaction statistics',
        500,
      );
    }
  }

  /**
   * Validate blob comparison request
   */
  private validateBlobComparisonRequest(
    request: BlobCostComparisonRequestDto,
  ): void {
    if (!request.data || request.data.length === 0) {
      throw new Error('Data must be provided');
    }

    // Calculate data size from the provided data
    const dataSize = Buffer.from(request.data, 'hex').length;
    
    if (dataSize <= 0) {
      throw new Error('Data size must be greater than 0');
    }

    if (dataSize > 131072 * 6) {
      throw new Error(
        'Data size exceeds maximum blob capacity (6 blobs * 128KB)',
      );
    }

    if (request.networks.length < 2) {
      throw new Error('At least 2 networks are required for comparison');
    }

    // Validate all networks exist
    for (const networkId of request.networks) {
      if (!this.networkConfigs.has(networkId)) {
        throw new Error(`Unsupported network: ${networkId}`);
      }
    }
  }

  /**
   * Calculate network-specific blob cost
   */
  private async calculateNetworkBlobCost(
    config: NetworkBlobConfig,
    dataSize: number,
    blobCount?: number,
  ): Promise<any> {
    const requiredBlobs = blobCount || this.calculateRequiredBlobs(dataSize);

    if (config.supportsBlobTx && config.blobPricing) {
      // Calculate blob transaction cost
      const currentBlobGasPrice = await this.getCurrentBlobGasPrice(
        config.networkId,
      );
      const costPerBlob = this.calculateCostPerBlob(
        config.blobPricing.baseFeePerBlob,
        currentBlobGasPrice,
      );
      const totalCostGwei = costPerBlob * requiredBlobs;
      const totalCostEth = totalCostGwei / 1e9;
      const totalCostUSD = totalCostEth * 2000; // Assume $2000 ETH price

      return {
        networkId: config.networkId,
        networkName: config.networkName,
        chainId: config.chainId,
        supportsBlobTx: true,
        requiredBlobs,
        costPerBlob,
        costPerByte: totalCostUSD / dataSize,
        gasUsed: requiredBlobs * 21000, // Base gas per blob
        totalCostUSD,
        breakdown: {
          baseFee: config.blobPricing.baseFeePerBlob,
          blobGasPrice: currentBlobGasPrice,
          blobCount: requiredBlobs,
          totalBlobCost: totalCostGwei,
        },
        rank: 0,
        savingsPercentage: 0,
      };
    } else {
      // Calculate alternative cost (calldata)
      const calldataCost = config.alternativeCost!.calldataCostPerByte;
      const totalGas = dataSize * calldataCost;
      const gasPrice = 20; // 20 gwei
      const totalCostGwei = totalGas * gasPrice;
      const totalCostEth = totalCostGwei / 1e9;
      const totalCostUSD = totalCostEth * 2000; // Assume $2000 ETH price

      return {
        networkId: config.networkId,
        networkName: config.networkName,
        chainId: config.chainId,
        supportsBlobTx: false,
        requiredBlobs: 0,
        costPerBlob: 0,
        costPerByte: totalCostUSD / dataSize,
        gasUsed: totalGas,
        totalCostUSD,
        breakdown: {
          method: 'calldata',
          costPerByte: calldataCost,
          gasPrice,
          totalGas,
          description: config.alternativeCost!.description,
        },
        rank: 0,
        savingsPercentage: 0,
      };
    }
  }

  /**
   * Calculate required number of blobs for data size
   */
  private calculateRequiredBlobs(dataSize: number): number {
    const blobSize = 131072; // 128KB
    return Math.ceil(dataSize / blobSize);
  }

  /**
   * Get current blob gas price (simulated)
   */
  private async getCurrentBlobGasPrice(networkId: string): Promise<number> {
    // In a real implementation, this would fetch from the network
    // For now, return simulated values based on network congestion
    const basePrice = 1; // 1 gwei
    const congestionMultiplier = Math.random() * 2 + 1; // 1x to 3x
    return Math.round(basePrice * congestionMultiplier * 100) / 100;
  }

  /**
   * Calculate cost per blob
   */
  private calculateCostPerBlob(baseFee: number, blobGasPrice: number): number {
    // Simplified calculation: base fee + blob gas price
    return baseFee + blobGasPrice;
  }

  /**
   * Generate unique comparison ID
   */
  private generateComparisonId(): string {
    return `blob_comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get blob cost comparison by ID
   */
  async getBlobCostComparisonById(comparisonId: string): Promise<BlobCostComparisonDto> {
    try {
      // In a real implementation, this would fetch from a database
      // For now, throw an error indicating the feature is not implemented
      throw new Error(`Blob cost comparison with ID '${comparisonId}' not found`);
    } catch (error) {
      this.logger.error(
        `Failed to get blob cost comparison by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate networks for blob cost analysis
   */
  async validateNetworks(networks: string[]): Promise<void> {
    if (!networks || networks.length === 0) {
      throw new Error('Networks array cannot be empty');
    }

    if (networks.length < 2) {
      throw new Error('At least 2 networks are required for comparison');
    }

    // Validate all networks exist in our configuration
    for (const networkId of networks) {
      if (!this.networkConfigs.has(networkId)) {
        throw new Error(`Unsupported network: ${networkId}`);
      }
    }
  }
}