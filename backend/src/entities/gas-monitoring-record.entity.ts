import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('gas_monitoring_records')
@Index(['network', 'timestamp'])
@Index(['timestamp'])
export class GasMonitoringRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  network: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'base_fee_gwei' })
  baseFeeGwei: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'priority_fee_gwei' })
  priorityFeeGwei: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'max_fee_gwei' })
  maxFeeGwei: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'tx_cost_usd' })
  txCostUsd: string;

  @Column({ type: 'timestamp with time zone' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Additional metadata fields
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    blockNumber?: number;
    gasLimit?: number;
    utilization?: number;
    chainId?: number;
    [key: string]: any;
  };
}