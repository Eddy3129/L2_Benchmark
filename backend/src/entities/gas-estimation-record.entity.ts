import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('gas_estimation_records')
@Index('IDX_gas_estimation_network_timestamp', ['network', 'timestamp'])
@Index('IDX_gas_estimation_timestamp', ['timestamp'])
@Index('IDX_gas_estimation_contract_timestamp', ['contractName', 'timestamp'])
export class GasEstimationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  network: string;

  @Column({ type: 'varchar', length: 100, name: 'contract_name' })
  contractName: string;

  @Column({ type: 'bigint', name: 'measured_gas_used' })
  measuredGasUsed: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'l2_gas_price_gwei', nullable: true })
  l2GasPriceGwei?: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, name: 'token_price_usd' })
  tokenPriceUsd: string;

  @Column({ type: 'decimal', precision: 15, scale: 8, name: 'est_deployment_cost_usd' })
  estDeploymentCostUsd: string;

  @Column({ type: 'decimal', precision: 15, scale: 8, name: 'est_l2_execution_usd', nullable: true })
  estL2ExecutionUsd?: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, name: 'est_l1_blob_cost_e10', nullable: true })
  estL1BlobCostE10?: string;

  @Column({ type: 'varchar', length: 20, name: 'vs_ethereum' })
  vsEthereum: string;

  @Column({ type: 'integer', name: 'confidence_level' })
  confidenceLevel: number;

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
    gasPriceSource?: string;
    l1GasPriceGwei?: number;
    analysisId?: string;
    functionCount?: number;
    [key: string]: any;
  };
}