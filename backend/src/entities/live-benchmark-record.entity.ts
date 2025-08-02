import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('live_benchmark_records')
@Index('IDX_live_benchmark_network_timestamp', ['network', 'timestamp'])
@Index('IDX_live_benchmark_timestamp', ['timestamp'])
@Index('IDX_live_benchmark_contract_timestamp', ['contractName', 'timestamp'])
export class LiveBenchmarkRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  network: string;

  @Column({ type: 'varchar', length: 100, name: 'contract_name' })
  contractName: string;

  @Column({ type: 'varchar', length: 100, name: 'function_name' })
  functionName: string;

  @Column({ type: 'varchar', length: 42, name: 'contract_address', nullable: true })
  contractAddress?: string;

  @Column({ type: 'bigint', name: 'min_gas_used' })
  minGasUsed: string;

  @Column({ type: 'bigint', name: 'max_gas_used' })
  maxGasUsed: string;

  @Column({ type: 'bigint', name: 'avg_gas_used' })
  avgGasUsed: string;

  @Column({ type: 'bigint', name: 'l1_data_bytes', nullable: true })
  l1DataBytes?: string;

  @Column({ type: 'integer', name: 'execution_count' })
  executionCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 8, name: 'avg_cost_usd' })
  avgCostUsd: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'gas_price_gwei' })
  gasPriceGwei: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'token_price_usd' })
  tokenPriceUsd: string;



  @Column({ type: 'timestamp with time zone' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Additional metadata fields
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    chainId?: number;
    blockNumber?: number;
    transactionHashes?: string[];
    sessionId?: string;
    executionTime?: number;
    [key: string]: any;
  };
}