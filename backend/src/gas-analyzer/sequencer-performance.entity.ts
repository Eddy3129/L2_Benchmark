import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('sequencer_performance_tests')
@Index(['l2Network', 'testType', 'createdAt'])
export class SequencerPerformanceTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  l2Network: string;

  @Column()
  testType: string; // 'low_fee_test' | 'stuck_transaction_test' | 'fee_market_stress'

  @Column({ default: 'running' })
  status: string; // 'running' | 'completed' | 'failed'

  @Column('jsonb')
  testConfiguration: {
    lowFeeTransactionCount: number;
    normalFeeTransactionCount: number;
    minPriorityFeePerGas: string; // in wei
    normalPriorityFeePerGas: string; // in wei
    testDurationSeconds: number;
    parallelAccountsUsed: number;
  };

  @Column('jsonb')
  transactionResults: {
    lowFeeTransactions: {
      txHash: string;
      nonce: number;
      maxPriorityFeePerGas: string;
      submittedAt: Date;
      confirmedAt: Date | null;
      blockNumber: number | null;
      gasUsed: string | null;
      status: 'pending' | 'confirmed' | 'failed' | 'dropped';
      confirmationLatencyMs: number | null;
    }[];
    normalFeeTransactions: {
      txHash: string;
      nonce: number;
      maxPriorityFeePerGas: string;
      submittedAt: Date;
      confirmedAt: Date | null;
      blockNumber: number | null;
      gasUsed: string | null;
      status: 'pending' | 'confirmed' | 'failed' | 'dropped';
      confirmationLatencyMs: number | null;
    }[];
    stuckTransactionTest?: {
      stuckTxHash: string;
      stuckTxNonce: number;
      parallelTxHashes: string[];
      parallelTxConfirmed: number;
      sequencerBlockedParallelProcessing: boolean;
    };
  };

  @Column('jsonb')
  performanceMetrics: {
    inclusionRate: {
      lowFeeTransactions: number; // percentage
      normalFeeTransactions: number; // percentage
    };
    confirmationLatency: {
      lowFeeAvgMs: number;
      normalFeeAvgMs: number;
      latencyDifferenceMs: number;
      latencyRatio: number; // low_fee_latency / normal_fee_latency
    };
    parallelProcessingCapability: {
      tested: boolean;
      sequencerSupportsParallelProcessing: boolean;
      parallelProcessingEfficiency: number; // percentage
    };
    censorshipResistanceScore: number; // 0-100 score based on inclusion rate and latency
  };

  @Column('decimal', { precision: 10, scale: 2 })
  totalTestCostUSD: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}