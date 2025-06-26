import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gas_analyses')
export class GasAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractName: string;

  @Column()
  functionSignature: string;

  @Column()
  l2Network: string;

  @Column('bigint')
  gasUsed: string;

  @Column('decimal', { precision: 18, scale: 8 })
  estimatedL2Fee: string; // in ETH

  @Column('decimal', { precision: 18, scale: 8 })
  estimatedL1Fee: string; // in ETH

  @Column('decimal', { precision: 10, scale: 2 })
  totalEstimatedFeeUSD: number;

  @Column('text')
  solidityCode: string;

  @Column('jsonb')
  compilationArtifacts: any;

  @Column('jsonb')
  functionParameters: any;

  @CreateDateColumn()
  createdAt: Date;
}