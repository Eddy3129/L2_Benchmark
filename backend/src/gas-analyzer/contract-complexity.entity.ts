import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('contract_complexity_profiles')
@Index(['contractName', 'l2Network', 'createdAt'])
export class ContractComplexityProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  contractName: string;

  @Column()
  functionName: string;

  @Column()
  l2Network: string;

  @Column()
  transactionHash: string;

  @Column('text')
  solidityCode: string;

  @Column('jsonb')
  compilationArtifacts: {
    abi: any[];
    bytecode: string;
    sourceMap: string;
    ast: any;
    opcodes: string;
  };

  @Column('jsonb')
  executionTrace: {
    totalGasUsed: string;
    gasUsedByOpcode: {
      opcode: string;
      gasUsed: number;
      count: number;
      percentage: number;
    }[];
    callTrace: {
      type: 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2';
      from: string;
      to: string;
      input: string;
      output: string;
      gasUsed: number;
      gasLimit: number;
      depth: number;
      error?: string;
    }[];
    storageAccess: {
      slot: string;
      operation: 'SLOAD' | 'SSTORE';
      gasUsed: number;
      oldValue?: string;
      newValue?: string;
    }[];
  };

  @Column('jsonb')
  gasBreakdown: {
    functionLevelBreakdown: {
      functionName: string;
      gasUsed: number;
      percentage: number;
      internalCalls: {
        functionName: string;
        gasUsed: number;
        callCount: number;
      }[];
    }[];
    opcodeAnalysis: {
      computationOpcodes: { gasUsed: number; percentage: number };
      storageOpcodes: { gasUsed: number; percentage: number };
      memoryOpcodes: { gasUsed: number; percentage: number };
      logOpcodes: { gasUsed: number; percentage: number };
      externalCallOpcodes: { gasUsed: number; percentage: number };
    };
    costHotspots: {
      lineNumber: number;
      sourceCode: string;
      gasUsed: number;
      percentage: number;
      optimizationSuggestion: string;
    }[];
  };

  @Column('jsonb')
  complexityMetrics: {
    cyclomaticComplexity: number;
    codeSize: number; // in bytes
    stackDepth: number;
    memoryUsage: number; // peak memory usage
    storageSlots: number; // number of storage slots accessed
    externalCalls: number;
    loops: number;
    conditionals: number;
    gasEfficiencyScore: number; // 0-100 score
  };

  @Column('jsonb')
  optimizationRecommendations: {
    category: 'storage' | 'computation' | 'memory' | 'external_calls' | 'loops';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    currentGasCost: number;
    estimatedSavings: number;
    codeLocation: {
      lineNumber: number;
      functionName: string;
    };
    suggestedFix: string;
  }[];

  @Column('jsonb')
  networkSpecificAnalysis: {
    evmVersion: string;
    gasSchedule: any; // network-specific gas costs
    precompileUsage: {
      address: string;
      gasUsed: number;
      callCount: number;
    }[];
    networkOptimizations: string[]; // network-specific optimizations available
  };

  @Column('decimal', { precision: 18, scale: 8 })
  totalExecutionCostETH: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalExecutionCostUSD: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}