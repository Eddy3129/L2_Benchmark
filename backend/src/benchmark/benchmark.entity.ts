import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('benchmark_sessions')
export class BenchmarkSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  results: any;

  @Column()
  totalOperations: number;

  @Column('decimal', { precision: 10, scale: 2 })
  avgGasUsed: number;

  @Column('decimal', { precision: 10, scale: 4 })
  avgExecutionTime: number;

  @CreateDateColumn()
  createdAt: Date;
}