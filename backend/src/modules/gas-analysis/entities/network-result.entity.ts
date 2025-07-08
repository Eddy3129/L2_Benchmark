import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsNumber, IsObject, IsOptional, IsArray, Min } from 'class-validator';

// Related entities
import { GasAnalysis } from './gas-analysis.entity';

@Entity('network_results')
@Index(['network', 'createdAt'])
@Index(['chainId'])
@Index(['gasAnalysisId', 'network'])
export class NetworkResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  network: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  networkDisplayName?: string;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  chainId?: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  deploymentGas?: {
    gasUsed: number;
    gasPrice: number;
    gasCost: string; // in ETH
    gasCostUSD?: number;
    maxFeePerGas?: number;
    maxPriorityFeePerGas?: number;
    baseFee?: number;
    estimationType?: string;
    confidence?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray()
  functionGasEstimates?: Array<{
    functionName: string;
    gasUsed: number;
    gasPrice: number;
    gasCost: string;
    gasCostUSD?: number;
    parameters?: any[];
    estimationType?: string;
    confidence?: number;
  }>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  @IsOptional()
  @IsString()
  contractAddress?: string;

  @Column({ type: 'varchar', length: 66, nullable: true })
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @Column({ type: 'bigint', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  blockNumber?: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  networkStatus?: {
    blockNumber: number;
    chainId: number;
    isConnected: boolean;
    lastChecked: string;
    error?: string;
    latency?: number;
    gasPrice?: number;
    baseFee?: number;
  };

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  analysisTime?: number; // Analysis time in milliseconds

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: {
    gasEstimationType?: string;
    providerType?: string;
    blockNumber?: number;
    networkType?: string;
    rpcUrl?: string;
    retryCount?: number;
    cacheHit?: boolean;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => GasAnalysis, (gasAnalysis) => gasAnalysis.networkResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gasAnalysisId' })
  gasAnalysis: GasAnalysis;

  @Column({ type: 'uuid' })
  gasAnalysisId: string;

  // Virtual properties
  get isSuccessful(): boolean {
    return !!(this.networkStatus?.isConnected && this.deploymentGas && this.deploymentGas.gasUsed > 0);
  }

  get totalGasCost(): number {
    const deploymentCost = parseFloat(this.deploymentGas?.gasCost || '0');
    const functionCosts = this.functionGasEstimates?.reduce((sum, estimate) => {
      return sum + parseFloat(estimate.gasCost || '0');
    }, 0) || 0;
    
    return deploymentCost + functionCosts;
  }

  get totalGasCostUSD(): number | null {
    const deploymentCostUSD = this.deploymentGas?.gasCostUSD || 0;
    const functionCostsUSD = this.functionGasEstimates?.reduce((sum, estimate) => {
      return sum + (estimate.gasCostUSD || 0);
    }, 0) || 0;
    
    const total = deploymentCostUSD + functionCostsUSD;
    return total > 0 ? total : null;
  }

  get averageFunctionGas(): number {
    if (!this.functionGasEstimates || this.functionGasEstimates.length === 0) {
      return 0;
    }
    
    const totalGas = this.functionGasEstimates.reduce((sum, estimate) => {
      return sum + estimate.gasUsed;
    }, 0);
    
    return Math.round(totalGas / this.functionGasEstimates.length);
  }

  get networkLatency(): number | null {
    return this.networkStatus?.latency || null;
  }

  get isL2Network(): boolean {
    const l2Networks = ['arbitrum', 'optimism', 'polygon', 'base', 'scroll', 'zksync'];
    return l2Networks.some(l2 => this.network.toLowerCase().includes(l2));
  }

  get networkCategory(): string {
    if (this.network.toLowerCase().includes('ethereum')) return 'mainnet';
    if (this.network.toLowerCase().includes('testnet')) return 'testnet';
    if (this.isL2Network) return 'layer2';
    return 'sidechain';
  }

  get gasEfficiencyScore(): number {
    if (!this.deploymentGas?.gasUsed) return 0;
    
    // Lower gas usage = higher efficiency score
    const baseScore = 100;
    const gasUsed = this.deploymentGas.gasUsed;
    
    // Normalize based on typical contract sizes
    let penalty = 0;
    if (gasUsed > 1000000) penalty = 30;
    else if (gasUsed > 500000) penalty = 20;
    else if (gasUsed > 200000) penalty = 10;
    else if (gasUsed > 100000) penalty = 5;
    
    return Math.max(0, baseScore - penalty);
  }

  // Helper methods
  getFunctionEstimate(functionName: string): any | null {
    if (!this.functionGasEstimates) return null;
    return this.functionGasEstimates.find(estimate => estimate.functionName === functionName);
  }

  getMostExpensiveFunction(): any | null {
    if (!this.functionGasEstimates || this.functionGasEstimates.length === 0) {
      return null;
    }
    
    return this.functionGasEstimates.reduce((max, current) => {
      return current.gasUsed > max.gasUsed ? current : max;
    });
  }

  getCheapestFunction(): any | null {
    if (!this.functionGasEstimates || this.functionGasEstimates.length === 0) {
      return null;
    }
    
    return this.functionGasEstimates.reduce((min, current) => {
      return current.gasUsed < min.gasUsed ? current : min;
    });
  }

  getGasPriceInGwei(): number {
    if (!this.deploymentGas?.gasPrice) return 0;
    return this.deploymentGas.gasPrice / 1e9; // Convert wei to gwei
  }

  getEstimatedConfirmationTime(): string {
    const gasPriceGwei = this.getGasPriceInGwei();
    
    if (this.isL2Network) {
      return '1-5 seconds';
    }
    
    // Ethereum mainnet estimates based on gas price
    if (gasPriceGwei >= 50) return '30-60 seconds';
    if (gasPriceGwei >= 30) return '1-3 minutes';
    if (gasPriceGwei >= 20) return '3-5 minutes';
    if (gasPriceGwei >= 10) return '5-10 minutes';
    return '10+ minutes';
  }

  // Comparison methods
  compareGasCost(other: NetworkResult): {
    cheaper: boolean;
    savings: number;
    savingsPercentage: number;
  } {
    const thisGas = this.deploymentGas?.gasUsed || 0;
    const otherGas = other.deploymentGas?.gasUsed || 0;
    
    if (thisGas === 0 || otherGas === 0) {
      return { cheaper: false, savings: 0, savingsPercentage: 0 };
    }
    
    const cheaper = thisGas < otherGas;
    const savings = cheaper ? otherGas - thisGas : thisGas - otherGas;
    const savingsPercentage = (savings / Math.max(thisGas, otherGas)) * 100;
    
    return {
      cheaper,
      savings,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
    };
  }

  // Validation methods
  validateNetworkResult(): string[] {
    const errors: string[] = [];
    
    if (!this.network) {
      errors.push('Network name is required');
    }
    
    if (this.chainId && this.chainId <= 0) {
      errors.push('Chain ID must be positive');
    }
    
    if (this.deploymentGas) {
      if (this.deploymentGas.gasUsed <= 0) {
        errors.push('Gas used must be positive');
      }
      if (this.deploymentGas.gasPrice <= 0) {
        errors.push('Gas price must be positive');
      }
    }
    
    if (this.contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
      errors.push('Invalid contract address format');
    }
    
    if (this.transactionHash && !/^0x[a-fA-F0-9]{64}$/.test(this.transactionHash)) {
      errors.push('Invalid transaction hash format');
    }
    
    return errors;
  }

  // Serialization helpers
  toSummary(): any {
    return {
      id: this.id,
      network: this.network,
      networkDisplayName: this.networkDisplayName,
      chainId: this.chainId,
      isSuccessful: this.isSuccessful,
      deploymentGasUsed: this.deploymentGas?.gasUsed,
      deploymentGasCost: this.deploymentGas?.gasCost,
      totalGasCost: this.totalGasCost,
      totalGasCostUSD: this.totalGasCostUSD,
      functionCount: this.functionGasEstimates?.length || 0,
      averageFunctionGas: this.averageFunctionGas,
      networkCategory: this.networkCategory,
      gasEfficiencyScore: this.gasEfficiencyScore,
      analysisTime: this.analysisTime,
      createdAt: this.createdAt,
    };
  }

  toDetailedView(): any {
    return {
      ...this.toSummary(),
      deploymentGas: this.deploymentGas,
      functionGasEstimates: this.functionGasEstimates,
      networkStatus: this.networkStatus,
      contractAddress: this.contractAddress,
      transactionHash: this.transactionHash,
      blockNumber: this.blockNumber,
      timestamp: this.timestamp,
      metadata: this.metadata,
      mostExpensiveFunction: this.getMostExpensiveFunction(),
      cheapestFunction: this.getCheapestFunction(),
      gasPriceGwei: this.getGasPriceInGwei(),
      estimatedConfirmationTime: this.getEstimatedConfirmationTime(),
    };
  }

  toComparisonView(): any {
    return {
      network: this.network,
      networkDisplayName: this.networkDisplayName,
      chainId: this.chainId,
      deploymentGas: this.deploymentGas?.gasUsed,
      deploymentCost: this.deploymentGas?.gasCost,
      deploymentCostUSD: this.deploymentGas?.gasCostUSD,
      gasPriceGwei: this.getGasPriceInGwei(),
      networkCategory: this.networkCategory,
      gasEfficiencyScore: this.gasEfficiencyScore,
      estimatedConfirmationTime: this.getEstimatedConfirmationTime(),
      isSuccessful: this.isSuccessful,
    };
  }
}