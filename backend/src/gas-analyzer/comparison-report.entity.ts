import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('comparison_reports')
export class ComparisonReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractName: string;

  @Column('jsonb')
  networks: {
    network: string;
    deploymentGas: number;
    gasPrice: number;
    deploymentCost: string;
    functions: {
      functionName: string;
      gasUsed: number;
    }[];
  }[];

  @Column('text')
  solidityCode: string;

  @Column('jsonb')
  compilationArtifacts: any;

  @Column('decimal', { precision: 10, scale: 2 })
  totalGasDifference: number;

  @Column('decimal', { precision: 5, scale: 2 })
  savingsPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  timestamp: string; // ISO string for frontend compatibility
}