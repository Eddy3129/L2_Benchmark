import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('l1_finality_tracking')
@Index(['l2Network', 'l2BlockNumber', 'createdAt'])
export class L1FinalityTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  l2Network: string;

  @Column('bigint')
  l2BlockNumber: string;

  @Column()
  l2TransactionHash: string;

  @Column({ type: 'timestamp' })
  l2ConfirmationTime: Date;

  @Column('jsonb')
  l2TransactionDetails: {
    gasUsed: string;
    gasPrice: string;
    from: string;
    to: string;
    value: string;
    data: string;
    blockHash: string;
  };

  @Column({ nullable: true })
  l1BatchTransactionHash: string;

  @Column('bigint', { nullable: true })
  l1BlockNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  l1SettlementTime: Date;

  @Column('jsonb', { nullable: true })
  l1BatchDetails: {
    batchPosterAddress: string;
    l1GasUsed: string;
    l1GasPrice: string;
    l1TransactionFee: string; // in ETH
    l1TransactionFeeUSD: number;
    batchSize: number; // number of L2 transactions in this batch
    batchDataSize: number; // size in bytes
    compressionRatio: number;
  };

  @Column('jsonb')
  finalityMetrics: {
    timeToL1SettlementMs: number | null; // TTLS - Time to L1 Settlement
    l1SettlementCostPerBatch: number; // USD
    amortizedL1CostPerTransaction: number; // USD
    finalityConfidenceLevel: number; // 0-100 based on L1 confirmations
    securityModel: 'optimistic' | 'zk_proof' | 'hybrid';
    challengePeriodHours: number; // for optimistic rollups
  };

  @Column('jsonb', { nullable: true })
  l1MonitoringConfig: {
    l1RpcUrl: string;
    batchPosterAddresses: string[]; // multiple addresses for different L2s
    monitoringStartBlock: string;
    confirmationBlocks: number; // how many L1 blocks to wait for finality
  };

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'settled' | 'failed' | 'timeout'

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;
}