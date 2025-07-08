import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

// Related entities
import { CompilationResult } from './compilation-result.entity';
import { NetworkResult } from './network-result.entity';

// Enums
import { AnalysisType } from '../../../common/dto/gas-analysis.dto';

@Entity('gas_analyses')
@Index(['contractName', 'createdAt'])
@Index(['sourceCodeHash'])
@Index(['analysisType', 'createdAt'])
export class GasAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  contractName: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  @IsString()
  sourceCodeHash: string;

  @Column({
    type: 'enum',
    enum: AnalysisType,
    default: AnalysisType.BASIC,
  })
  @IsEnum(AnalysisType)
  analysisType: AnalysisType;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number; // Analysis duration in milliseconds

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: {
    solidityVersion?: string;
    optimizationLevel?: string;
    gasEstimationType?: string;
    totalNetworks?: number;
    successfulNetworks?: number;
    failedNetworks?: string[];
    userAgent?: string;
    ipAddress?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => CompilationResult, { cascade: true, eager: true })
  @JoinColumn()
  compilation: CompilationResult;

  @OneToMany(() => NetworkResult, (networkResult) => networkResult.gasAnalysis, {
    cascade: true,
    eager: true,
  })
  networkResults: NetworkResult[];

  // Virtual properties
  get totalNetworks(): number {
    return this.networkResults?.length || 0;
  }

  get successfulNetworks(): number {
    return this.networkResults?.filter(result => result.networkStatus?.isConnected)?.length || 0;
  }

  get averageGasCost(): number {
    if (!this.networkResults || this.networkResults.length === 0) {
      return 0;
    }

    const totalGas = this.networkResults.reduce((sum, result) => {
      return sum + (result.deploymentGas?.gasUsed || 0);
    }, 0);

    return Math.round(totalGas / this.networkResults.length);
  }

  get isOptimized(): boolean {
    return this.compilation?.optimizationSettings?.enabled || false;
  }

  get contractSize(): number {
    if (!this.compilation?.bytecode) {
      return 0;
    }
    return this.compilation.bytecode.length / 2; // Convert hex to bytes
  }

  get sizeUtilization(): number {
    const maxSize = 24 * 1024; // 24KB limit
    return (this.contractSize / maxSize) * 100;
  }

  // Helper methods
  getNetworkResult(network: string): NetworkResult | undefined {
    return this.networkResults?.find(result => result.network === network);
  }

  getLowestGasCost(): { network: string; gasUsed: number } | null {
    if (!this.networkResults || this.networkResults.length === 0) {
      return null;
    }

    let lowest = this.networkResults[0];
    for (const result of this.networkResults) {
      if ((result.deploymentGas?.gasUsed || 0) < (lowest.deploymentGas?.gasUsed || 0)) {
        lowest = result;
      }
    }

    return {
      network: lowest.network,
      gasUsed: lowest.deploymentGas?.gasUsed || 0,
    };
  }

  getHighestGasCost(): { network: string; gasUsed: number } | null {
    if (!this.networkResults || this.networkResults.length === 0) {
      return null;
    }

    let highest = this.networkResults[0];
    for (const result of this.networkResults) {
      if ((result.deploymentGas?.gasUsed || 0) > (highest.deploymentGas?.gasUsed || 0)) {
        highest = result;
      }
    }

    return {
      network: highest.network,
      gasUsed: highest.deploymentGas?.gasUsed || 0,
    };
  }

  getGasSavings(): { amount: number; percentage: number } | null {
    const lowest = this.getLowestGasCost();
    const highest = this.getHighestGasCost();

    if (!lowest || !highest || lowest.gasUsed === highest.gasUsed) {
      return null;
    }

    const savings = highest.gasUsed - lowest.gasUsed;
    const percentage = (savings / highest.gasUsed) * 100;

    return {
      amount: savings,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  // Validation methods
  validateNetworkResults(): string[] {
    const errors: string[] = [];

    if (!this.networkResults || this.networkResults.length === 0) {
      errors.push('At least one network result is required');
    }

    if (this.networkResults) {
      const networks = new Set();
      for (const result of this.networkResults) {
        if (networks.has(result.network)) {
          errors.push(`Duplicate network result for ${result.network}`);
        }
        networks.add(result.network);
      }
    }

    return errors;
  }

  // Serialization helpers
  toSummary(): any {
    return {
      id: this.id,
      contractName: this.contractName,
      analysisType: this.analysisType,
      totalNetworks: this.totalNetworks,
      successfulNetworks: this.successfulNetworks,
      averageGasCost: this.averageGasCost,
      contractSize: this.contractSize,
      sizeUtilization: this.sizeUtilization,
      isOptimized: this.isOptimized,
      duration: this.duration,
      createdAt: this.createdAt,
    };
  }

  toDetailedView(): any {
    return {
      ...this.toSummary(),
      compilation: {
        success: this.compilation?.success,
        compilerVersion: this.compilation?.compilerVersion,
        optimizationSettings: this.compilation?.optimizationSettings,
        bytecodeSize: this.compilation?.bytecodeSize,
        warnings: this.compilation?.warnings?.length || 0,
        errors: this.compilation?.errors?.length || 0,
      },
      networkResults: this.networkResults?.map(result => ({
        network: result.network,
        networkDisplayName: result.networkDisplayName,
        chainId: result.chainId,
        deploymentGas: result.deploymentGas,
        functionGasEstimates: result.functionGasEstimates?.length || 0,
        networkStatus: result.networkStatus,
        timestamp: result.timestamp,
      })),
      gasSavings: this.getGasSavings(),
      lowestGasCost: this.getLowestGasCost(),
      highestGasCost: this.getHighestGasCost(),
      metadata: this.metadata,
    };
  }
}