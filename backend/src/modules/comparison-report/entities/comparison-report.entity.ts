import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReportSection } from './report-section.entity';
import {
  ComparisonType,
  ReportStatus,
  SavingsMetric,
} from '../../../common/dto/comparison-report.dto';

@Entity('comparison_reports')
@Index(['reportType', 'status'])
@Index(['createdAt'])
@Index(['contractName'])
export class ComparisonReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ComparisonType,
    default: ComparisonType.NETWORK_COMPARISON,
  })
  reportType: ComparisonType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ type: 'varchar', length: 255 })
  contractName: string;

  @Column({ type: 'text' })
  sourceCodeHash: string;

  @Column({ type: 'simple-array' })
  networksCompared: string[];

  @Column({ type: 'jsonb' })
  comparisonConfig: {
    optimizationLevel?: string;
    evmVersion?: string;
    includeDeployment?: boolean;
    includeFunctionCalls?: boolean;
    functionCalls?: Array<{
      name: string;
      inputs: any[];
    }>;
    timeframe?: {
      start: string;
      end: string;
    };
  };

  @Column({ type: 'jsonb' })
  savingsBreakdown: {
    metric: SavingsMetric;
    totalSavings: number;
    savingsPercentage: number;
    bestNetwork: string;
    worstNetwork: string;
    breakdown: Array<{
      networkId: string;
      networkName: string;
      cost: number;
      savings: number;
      rank: number;
    }>;
  };

  @Column({ type: 'jsonb' })
  executiveSummary: {
    keyFindings: string[];
    recommendations: string[];
    riskAssessment: string;
    implementationComplexity: 'low' | 'medium' | 'high';
    estimatedMigrationCost?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  chartData?: {
    costComparison: Array<{
      network: string;
      deploymentCost: number;
      functionCosts: number[];
      totalCost: number;
    }>;
    savingsOverTime: Array<{
      date: string;
      savings: number;
      network: string;
    }>;
    gasUsageBreakdown: Array<{
      operation: string;
      gasUsed: number;
      percentage: number;
    }>;
  };

  @Column({ type: 'int', default: 0 })
  generationDuration: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    generatedBy?: string;
    version?: string;
    analysisIds?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
    userId?: string;
  };

  @OneToMany(() => ReportSection, (section) => section.report, {
    cascade: true,
    eager: false,
  })
  sections: ReportSection[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === ReportStatus.COMPLETED;
  }

  get isDraft(): boolean {
    return this.status === ReportStatus.DRAFT;
  }

  get totalNetworks(): number {
    return this.networksCompared.length;
  }

  get maxSavings(): number {
    return Math.max(
      ...this.savingsBreakdown.breakdown.map((item) => item.savings),
    );
  }

  get avgSavings(): number {
    const savings = this.savingsBreakdown.breakdown.map((item) => item.savings);
    return savings.reduce((sum, saving) => sum + saving, 0) / savings.length;
  }

  get cheapestNetwork(): string {
    return this.savingsBreakdown.bestNetwork;
  }

  get mostExpensiveNetwork(): string {
    return this.savingsBreakdown.worstNetwork;
  }

  // Helper methods
  markAsCompleted(): void {
    this.status = ReportStatus.COMPLETED;
  }

  markAsPublished(): void {
    this.status = ReportStatus.PUBLISHED;
  }

  markAsArchived(): void {
    this.status = ReportStatus.ARCHIVED;
  }

  addTag(tag: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.metadata?.tags) {
      this.metadata.tags = this.metadata.tags.filter((t) => t !== tag);
    }
  }

  updateCustomField(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.customFields) {
      this.metadata.customFields = {};
    }
    this.metadata.customFields[key] = value;
  }

  getNetworkRank(networkId: string): number {
    const network = this.savingsBreakdown.breakdown.find(
      (item) => item.networkId === networkId,
    );
    return network?.rank || 0;
  }

  getNetworkSavings(networkId: string): number {
    const network = this.savingsBreakdown.breakdown.find(
      (item) => item.networkId === networkId,
    );
    return network?.savings || 0;
  }

  getNetworkCost(networkId: string): number {
    const network = this.savingsBreakdown.breakdown.find(
      (item) => item.networkId === networkId,
    );
    return network?.cost || 0;
  }

  validateReport(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title?.trim()) {
      errors.push('Report title is required');
    }

    if (!this.contractName?.trim()) {
      errors.push('Contract name is required');
    }

    if (!this.sourceCodeHash?.trim()) {
      errors.push('Source code hash is required');
    }

    if (!this.networksCompared || this.networksCompared.length < 2) {
      errors.push('At least 2 networks must be compared');
    }

    if (!this.savingsBreakdown || !this.savingsBreakdown.breakdown) {
      errors.push('Savings breakdown is required');
    }

    if (!this.executiveSummary) {
      errors.push('Executive summary is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  toSummary(): any {
    return {
      id: this.id,
      title: this.title,
      reportType: this.reportType,
      status: this.status,
      contractName: this.contractName,
      networksCompared: this.networksCompared,
      totalNetworks: this.totalNetworks,
      maxSavings: this.maxSavings,
      avgSavings: this.avgSavings,
      cheapestNetwork: this.cheapestNetwork,
      mostExpensiveNetwork: this.mostExpensiveNetwork,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDetailedView(): any {
    return {
      ...this.toSummary(),
      description: this.description,
      comparisonConfig: this.comparisonConfig,
      savingsBreakdown: this.savingsBreakdown,
      executiveSummary: this.executiveSummary,
      chartData: this.chartData,
      generationDuration: this.generationDuration,
      metadata: this.metadata,
    };
  }
}