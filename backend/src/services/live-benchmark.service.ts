import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LiveBenchmarkRecord } from '../entities/live-benchmark-record.entity';
import { CsvExportService } from '../shared/csv-export.service';
import * as fs from 'fs';
import * as path from 'path';

export interface LiveBenchmarkData {
  network: string;
  contractName: string;
  functionName: string;
  contractAddress?: string;
  minGasUsed: string;
  maxGasUsed: string;
  avgGasUsed: string;
  l1DataBytes?: string;
  executionCount: number;
  avgCostUsd: number;
  gasPriceGwei: number;
  tokenPriceUsd: number;

  timestamp?: Date;
  metadata?: any;
}

export interface BenchmarkExportOptions {
  startDate?: Date;
  endDate?: Date;
  networks?: string[];
  contractNames?: string[];
  format?: 'csv' | 'json';
}

@Injectable()
export class LiveBenchmarkService {
  private readonly logger = new Logger(LiveBenchmarkService.name);

  constructor(
    @InjectRepository(LiveBenchmarkRecord)
    private readonly liveBenchmarkRepository: Repository<LiveBenchmarkRecord>,
    private readonly csvExportService: CsvExportService,
  ) {}

  /**
   * Store live benchmark data to database
   */
  async storeBenchmarkData(data: LiveBenchmarkData[]): Promise<LiveBenchmarkRecord[]> {
    try {
      const records = data.map(item => {
        const record = new LiveBenchmarkRecord();
        record.network = item.network;
        record.contractName = item.contractName;
        record.functionName = item.functionName;
        record.contractAddress = item.contractAddress;
        record.minGasUsed = item.minGasUsed;
        record.maxGasUsed = item.maxGasUsed;
        record.avgGasUsed = item.avgGasUsed;
        record.l1DataBytes = item.l1DataBytes;
        record.executionCount = item.executionCount;
        record.avgCostUsd = item.avgCostUsd.toString();
        record.gasPriceGwei = item.gasPriceGwei.toString();
        record.tokenPriceUsd = item.tokenPriceUsd.toString();

        record.timestamp = item.timestamp || new Date();
        record.metadata = item.metadata;
        return record;
      });

      const savedRecords = await this.liveBenchmarkRepository.save(records);
      this.logger.log(`Stored ${savedRecords.length} live benchmark records`);
      return savedRecords;
    } catch (error) {
      this.logger.error('Failed to store live benchmark data:', error);
      throw error;
    }
  }

  /**
   * Get live benchmark records with filtering
   */
  async getRecords(
    startDate?: Date,
    endDate?: Date,
    networks?: string[],
    contractNames?: string[],
    limit: number = 100,
    offset: number = 0,
    sortBy: string = 'timestamp',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ) {
    try {
      const queryBuilder = this.liveBenchmarkRepository.createQueryBuilder('record');

      // Apply filters
      if (startDate && endDate) {
        queryBuilder.andWhere('record.timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.andWhere('record.timestamp >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('record.timestamp <= :endDate', { endDate });
      }

      if (networks && networks.length > 0) {
        queryBuilder.andWhere('record.network IN (:...networks)', { networks });
      }

      if (contractNames && contractNames.length > 0) {
        queryBuilder.andWhere('record.contractName IN (:...contractNames)', { contractNames });
      }

      // Apply sorting
      const validSortFields = ['timestamp', 'network', 'contractName', 'avgCostUsd'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
      const validSortOrder = (sortOrder === 'ASC' || sortOrder === 'DESC') ? sortOrder : 'DESC';
      queryBuilder.orderBy(`record.${sortField}`, validSortOrder);

      // Apply pagination
      queryBuilder.skip(offset).take(limit);

      const [records, total] = await queryBuilder.getManyAndCount();

      this.logger.log(`Retrieved ${records.length} live benchmark records (total: ${total})`);
      
      return {
        records,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error('Failed to get live benchmark records:', error);
      throw error;
    }
  }

  /**
   * Delete records by timestamp
   */
  async deleteRecordsByTimestamp(timestamp: string): Promise<number> {
    try {
      const result = await this.liveBenchmarkRepository.delete({ timestamp: new Date(timestamp) });
      const affectedRows = result.affected || 0;
      this.logger.log(`Deleted ${affectedRows} live benchmark records for timestamp ${timestamp}`);
      return affectedRows;
    } catch (error) {
      this.logger.error('Failed to delete live benchmark records:', error);
      throw error;
    }
  }

  /**
   * Export live benchmark data to CSV
   */
  async exportToCsv(options: BenchmarkExportOptions = {}): Promise<{ filename: string; filePath: string; recordCount: number }> {
    try {
      const { startDate, endDate, networks, contractNames } = options;
      
      // Get records for export
      const { records } = await this.getRecords(
        startDate,
        endDate,
        networks,
        contractNames,
        10000, // Large limit for export
        0,
        'timestamp',
        'DESC'
      );

      if (records.length === 0) {
        throw new Error('No records found for export');
      }

      // Prepare CSV data
      const csvData = records.map(record => ({
        'Network': record.network,
        'Contract': record.contractName,
        'Function': record.functionName,
        'Min Gas': record.minGasUsed,
        'Max Gas': record.maxGasUsed,
        'Avg Gas': record.avgGasUsed,
        'L1 Data Bytes': record.l1DataBytes || '—',
        'Execution Count': record.executionCount,
        'Avg Cost (USD)': `$${parseFloat(record.avgCostUsd).toFixed(8)}`,
        'Gas Price (gwei)': parseFloat(record.gasPriceGwei).toFixed(4),
        'Token Price (USD)': `$${parseFloat(record.tokenPriceUsd).toFixed(2)}`,

        'Timestamp': record.timestamp.toISOString(),
      }));

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `live_benchmark_${timestamp}.csv`;
      
      // Export to CSV
      const filePath = this.csvExportService.exportToCsv(csvData, filename);
      
      this.logger.log(`Exported ${records.length} live benchmark records to ${filename}`);
      
      return {
        filename,
        filePath,
        recordCount: records.length,
      };
    } catch (error) {
      this.logger.error('Failed to export live benchmark data to CSV:', error);
      throw error;
    }
  }

  /**
   * Get statistics about stored live benchmark data
   */
  async getStatistics() {
    try {
      const totalRecords = await this.liveBenchmarkRepository.count();
      
      const networksQuery = await this.liveBenchmarkRepository
        .createQueryBuilder('record')
        .select('DISTINCT record.network', 'network')
        .getRawMany();
      
      const contractsQuery = await this.liveBenchmarkRepository
        .createQueryBuilder('record')
        .select('DISTINCT record.contractName', 'contractName')
        .getRawMany();
      
      const dateRangeQuery = await this.liveBenchmarkRepository
        .createQueryBuilder('record')
        .select('MIN(record.timestamp)', 'earliest')
        .addSelect('MAX(record.timestamp)', 'latest')
        .getRawOne();
      
      const avgCostQuery = await this.liveBenchmarkRepository
        .createQueryBuilder('record')
        .select('record.network', 'network')
        .addSelect('AVG(CAST(record.avgCostUsd AS DECIMAL))', 'avgCost')
        .groupBy('record.network')
        .getRawMany();
      
      const avgCostByNetwork = avgCostQuery.reduce((acc, item) => {
        acc[item.network] = parseFloat(item.avgCost);
        return acc;
      }, {});
      
      return {
        totalRecords,
        networksCount: networksQuery.length,
        contractsCount: contractsQuery.length,
        dateRange: {
          earliest: dateRangeQuery?.earliest || null,
          latest: dateRangeQuery?.latest || null,
        },
        avgCostByNetwork,
        networks: networksQuery.map(n => n.network),
        contracts: contractsQuery.map(c => c.contractName),
      };
    } catch (error) {
      this.logger.error('Failed to get live benchmark statistics:', error);
      throw error;
    }
  }
}