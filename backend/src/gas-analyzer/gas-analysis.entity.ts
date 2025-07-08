import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gas_analyses')
export class GasAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractName: string;

  @Column({ nullable: true })
  functionSignature: string;

  @Column({ nullable: true })
  l2Network: string;

  @Column('bigint',{ nullable: true })
  gasUsed: string;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  estimatedL2Fee: string; // in ETH

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  estimatedL1Fee: string; // in ETH

  @Column('decimal', { precision: 10, scale: 2, nullable:true })
  totalEstimatedFeeUSD: number;

  @Column('text', { nullable: true })
  solidityCode: string;

  @Column('jsonb', { nullable: true })
  compilationArtifacts: any;

  @Column('jsonb', { nullable: true })
  functionParameters: any;

  @CreateDateColumn()
  createdAt: Date;
}