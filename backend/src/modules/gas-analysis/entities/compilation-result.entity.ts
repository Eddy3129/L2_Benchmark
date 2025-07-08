import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsBoolean, IsString, IsArray, IsObject, IsOptional, IsNumber, Min } from 'class-validator';

@Entity('compilation_results')
@Index(['compilerVersion'])
@Index(['success', 'createdAt'])
@Index(['bytecodeSize'])
export class CompilationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  success: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  bytecode?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray()
  abi?: any[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  compilerVersion?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  optimizationSettings?: {
    enabled: boolean;
    runs: number;
    details?: {
      yul?: boolean;
      yulDetails?: {
        stackAllocation?: boolean;
        optimizerSteps?: string;
      };
    };
  };

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bytecodeSize?: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray()
  errors?: string[];

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray()
  warnings?: string[];

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compilationTime?: number; // Compilation time in milliseconds

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  gasEstimates?: {
    creation?: {
      codeDepositCost?: string;
      executionCost?: string;
      totalCost?: string;
    };
    external?: {
      [functionName: string]: number;
    };
    internal?: {
      [functionName: string]: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  bytecodeAnalysis?: {
    size: {
      bytes: number;
      kilobytes: number;
      utilizationPercentage: number;
      isNearLimit: boolean;
      deploymentCost: number;
      recommendations: string[];
    };
    opcodeDistribution: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    functionSignatures: Array<{
      selector: string;
      signature: string;
      gasEstimate: number;
    }>;
    securityIssues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      location?: string;
    }>;
    gasOptimization: {
      score: number;
      suggestions: Array<{
        type: string;
        occurrences: number;
        suggestion: string;
        potentialSavings: number;
      }>;
      potentialSavings: number;
      recommendations: string[];
    };
    complexity: {
      score: number;
      level: string;
      factors: {
        opcodeComplexity: number;
        functionComplexity: number;
        gasComplexity: number;
      };
    };
    metadata: {
      analysisTime: number;
      bytecodeHash: string;
      timestamp: string;
      version: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: {
    contractName?: string;
    sourceCodeHash?: string;
    solidityVersion?: string;
    optimizationLevel?: string;
    timestamp?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get hasErrors(): boolean {
    return !!(this.errors && this.errors.length > 0);
  }

  get hasWarnings(): boolean {
    return !!(this.warnings && this.warnings.length > 0);
  }

  get isOptimized(): boolean {
    return this.optimizationSettings?.enabled || false;
  }

  get optimizationRuns(): number {
    return this.optimizationSettings?.runs || 0;
  }

  get contractSizeKB(): number {
    if (!this.bytecodeSize) return 0;
    return Math.round((this.bytecodeSize / 1024) * 100) / 100;
  }

  get sizeUtilization(): number {
    if (!this.bytecodeSize) return 0;
    const maxSize = 24 * 1024; // 24KB limit
    return Math.round((this.bytecodeSize / maxSize) * 10000) / 100;
  }

  get isNearSizeLimit(): boolean {
    return this.sizeUtilization > 90;
  }

  get securityScore(): number {
    if (!this.bytecodeAnalysis?.securityIssues) return 100;
    
    let score = 100;
    for (const issue of this.bytecodeAnalysis.securityIssues) {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  get optimizationScore(): number {
    return this.bytecodeAnalysis?.gasOptimization?.score || 0;
  }

  get complexityLevel(): string {
    return this.bytecodeAnalysis?.complexity?.level || 'Unknown';
  }

  // Helper methods
  getFunction(functionName: string): any {
    if (!this.abi) return null;
    return this.abi.find(item => item.type === 'function' && item.name === functionName);
  }

  getFunctionGasEstimate(functionName: string): number | null {
    return this.gasEstimates?.external?.[functionName] || null;
  }

  getSecurityIssuesBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): any[] {
    if (!this.bytecodeAnalysis?.securityIssues) return [];
    return this.bytecodeAnalysis.securityIssues.filter(issue => issue.severity === severity);
  }

  getCriticalSecurityIssues(): any[] {
    return this.getSecurityIssuesBySeverity('critical');
  }

  getHighSecurityIssues(): any[] {
    return this.getSecurityIssuesBySeverity('high');
  }

  getOptimizationSuggestions(): any[] {
    return this.bytecodeAnalysis?.gasOptimization?.suggestions || [];
  }

  getTopOptimizationOpportunities(limit: number = 5): any[] {
    const suggestions = this.getOptimizationSuggestions();
    return suggestions
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, limit);
  }

  // Validation methods
  validateCompilation(): string[] {
    const errors: string[] = [];

    if (this.success) {
      if (!this.bytecode) {
        errors.push('Successful compilation must have bytecode');
      }
      if (!this.abi || this.abi.length === 0) {
        errors.push('Successful compilation must have ABI');
      }
      if (!this.compilerVersion) {
        errors.push('Successful compilation must have compiler version');
      }
    } else {
      if (!this.errors || this.errors.length === 0) {
        errors.push('Failed compilation must have error messages');
      }
    }

    if (this.bytecodeSize && this.bytecode) {
      const actualSize = this.bytecode.length / 2;
      if (Math.abs(actualSize - this.bytecodeSize) > 10) {
        errors.push('Bytecode size mismatch');
      }
    }

    return errors;
  }

  // Serialization helpers
  toSummary(): any {
    return {
      id: this.id,
      success: this.success,
      compilerVersion: this.compilerVersion,
      isOptimized: this.isOptimized,
      optimizationRuns: this.optimizationRuns,
      contractSizeKB: this.contractSizeKB,
      sizeUtilization: this.sizeUtilization,
      isNearSizeLimit: this.isNearSizeLimit,
      hasErrors: this.hasErrors,
      hasWarnings: this.hasWarnings,
      errorCount: this.errors?.length || 0,
      warningCount: this.warnings?.length || 0,
      securityScore: this.securityScore,
      optimizationScore: this.optimizationScore,
      complexityLevel: this.complexityLevel,
      compilationTime: this.compilationTime,
      createdAt: this.createdAt,
    };
  }

  toDetailedView(): any {
    return {
      ...this.toSummary(),
      bytecode: this.bytecode,
      abi: this.abi,
      optimizationSettings: this.optimizationSettings,
      gasEstimates: this.gasEstimates,
      errors: this.errors,
      warnings: this.warnings,
      bytecodeAnalysis: this.bytecodeAnalysis,
      metadata: this.metadata,
      criticalSecurityIssues: this.getCriticalSecurityIssues(),
      highSecurityIssues: this.getHighSecurityIssues(),
      topOptimizationOpportunities: this.getTopOptimizationOpportunities(),
    };
  }

  toSecurityReport(): any {
    return {
      id: this.id,
      contractName: this.metadata?.contractName,
      securityScore: this.securityScore,
      securityIssues: this.bytecodeAnalysis?.securityIssues || [],
      criticalIssues: this.getCriticalSecurityIssues(),
      highIssues: this.getHighSecurityIssues(),
      recommendations: this.bytecodeAnalysis?.gasOptimization?.recommendations || [],
      timestamp: this.createdAt,
    };
  }

  toOptimizationReport(): any {
    return {
      id: this.id,
      contractName: this.metadata?.contractName,
      optimizationScore: this.optimizationScore,
      currentSettings: this.optimizationSettings,
      suggestions: this.getOptimizationSuggestions(),
      topOpportunities: this.getTopOptimizationOpportunities(),
      potentialSavings: this.bytecodeAnalysis?.gasOptimization?.potentialSavings || 0,
      complexityLevel: this.complexityLevel,
      sizeUtilization: this.sizeUtilization,
      timestamp: this.createdAt,
    };
  }
}