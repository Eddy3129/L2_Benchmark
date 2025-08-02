import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GasEstimationRecord } from '../entities/gas-estimation-record.entity';
import { CsvExportService } from '../shared/csv-export.service';
import * as fs from 'fs';
import * as path from 'path';

export interface GasEstimationData {
  network: string;
  contractName: string;
  measuredGasUsed: string;
  l2GasPriceGwei?: number;
  tokenPriceUsd: number;
  estDeploymentCostUsd: number;
  estL2ExecutionUsd?: number;
  estL1BlobCostE10?: number;
  vsEthereum: string;
  confidenceLevel: number;
  timestamp?: Date;
  metadata?: any;
}

export interface EstimationExportOptions {
  startDate?: Date;
  endDate?: Date;
  networks?: string[];
  contractNames?: string[];
  format?: 'csv' | 'json';
}

@Injectable()
export class GasEstimationService {
  private readonly logger = new Logger(GasEstimationService.name);

  constructor(
    @InjectRepository(GasEstimationRecord)
    private readonly gasEstimationRepository: Repository<GasEstimationRecord>,
    private readonly csvExportService: CsvExportService,
  ) {}

  /**
   * Store gas estimation data to database
   */
  async storeEstimationData(data: GasEstimationData[]): Promise<GasEstimationRecord[]> {
    try {
      const records = data.map(item => {
        const record = new GasEstimationRecord();
        record.network = item.network;
        record.contractName = item.contractName;
        record.measuredGasUsed = item.measuredGasUsed;
        record.l2GasPriceGwei = item.l2GasPriceGwei?.toString();
        record.tokenPriceUsd = item.tokenPriceUsd.toString();
        record.estDeploymentCostUsd = item.estDeploymentCostUsd.toString();
        record.estL2ExecutionUsd = item.estL2ExecutionUsd?.toString();
        record.estL1BlobCostE10 = item.estL1BlobCostE10?.toString();
        record.vsEthereum = item.vsEthereum;
        record.confidenceLevel = item.confidenceLevel;
        record.timestamp = item.timestamp || new Date();
        record.metadata = item.metadata;
        return record;
      });

      const savedRecords = await this.gasEstimationRepository.save(records);
      this.logger.log(`Stored ${savedRecords.length} gas estimation records`);
      return savedRecords;
    } catch (error) {
      this.logger.error('Failed to store gas estimation data:', error);
      throw error;
    }
  }

  /**
   * Get gas estimation records with filtering
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
      const queryBuilder = this.gasEstimationRepository.createQueryBuilder('record');

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
      const validSortFields = ['timestamp', 'network', 'contractName', 'estDeploymentCostUsd'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
      const validSortOrder = (sortOrder === 'ASC' || sortOrder === 'DESC') ? sortOrder : 'DESC';
      queryBuilder.orderBy(`record.${sortField}`, validSortOrder);

      // Apply pagination
      queryBuilder.skip(offset).take(limit);

      const [records, total] = await queryBuilder.getManyAndCount();

      // Transform records to include estL1BlobCostUsd for frontend compatibility
      const transformedRecords = records.map(record => ({
        ...record,
        estL1BlobCostUsd: record.estL1BlobCostE10 
          ? (parseFloat(record.estL1BlobCostE10) / Math.pow(10, 10)).toString()
          : undefined
      }));

      this.logger.log(`Retrieved ${records.length} gas estimation records (total: ${total})`);
      
      return {
        records: transformedRecords,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error('Failed to get gas estimation records:', error);
      throw error;
    }
  }

  /**
   * Delete records by timestamp
   */
  async deleteRecordsByTimestamp(timestamp: string): Promise<number> {
    try {
      const result = await this.gasEstimationRepository.delete({ timestamp: new Date(timestamp) });
      const affectedRows = result.affected || 0;
      this.logger.log(`Deleted ${affectedRows} gas estimation records for timestamp ${timestamp}`);
      return affectedRows;
    } catch (error) {
      this.logger.error('Failed to delete gas estimation records:', error);
      throw error;
    }
  }

  /**
   * Export gas estimation data to CSV
   */
  async exportToCsv(options: EstimationExportOptions = {}): Promise<{ filename: string; filePath: string; recordCount: number }> {
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
        'Measured Gas Used': record.measuredGasUsed,
        'L2 Gas Price (gwei)': record.l2GasPriceGwei || '—',
        'Token Price (USD)': `$${parseFloat(record.tokenPriceUsd).toFixed(2)}`,
        'Est. Deployment Cost (USD)': `$${parseFloat(record.estDeploymentCostUsd).toFixed(6)}`,
        'Est. L2 Execution (USD)': record.estL2ExecutionUsd ? `$${parseFloat(record.estL2ExecutionUsd).toFixed(6)}` : '—',
        'Est. L1 Blob Cost (USD)': record.estL1BlobCostE10 ? `$${(parseFloat(record.estL1BlobCostE10) / Math.pow(10, 10)).toExponential(2)}` : '—',
        'vs. Ethereum': record.vsEthereum,
        'Confidence Level': `${record.confidenceLevel}%`,
        'Timestamp': record.timestamp.toISOString(),
      }));

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gas_estimation_${timestamp}.csv`;
      
      // Export to CSV
      const filePath = this.csvExportService.exportToCsv(csvData, filename);
      
      this.logger.log(`Exported ${records.length} gas estimation records to ${filename}`);
      
      return {
        filename,
        filePath,
        recordCount: records.length,
      };
    } catch (error) {
      this.logger.error('Failed to export gas estimation data to CSV:', error);
      throw error;
    }
  }

  /**
   * Get statistics about stored gas estimation data
   */
  async getStatistics() {
    try {
      const totalRecords = await this.gasEstimationRepository.count();
      
      const networksQuery = await this.gasEstimationRepository
        .createQueryBuilder('record')
        .select('DISTINCT record.network', 'network')
        .getRawMany();
      
      const contractsQuery = await this.gasEstimationRepository
        .createQueryBuilder('record')
        .select('DISTINCT record.contractName', 'contractName')
        .getRawMany();
      
      const dateRangeQuery = await this.gasEstimationRepository
        .createQueryBuilder('record')
        .select('MIN(record.timestamp)', 'earliest')
        .addSelect('MAX(record.timestamp)', 'latest')
        .getRawOne();
      
      const avgCostQuery = await this.gasEstimationRepository
        .createQueryBuilder('record')
        .select('record.network', 'network')
        .addSelect('AVG(CAST(record.estDeploymentCostUsd AS DECIMAL))', 'avgCost')
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
      this.logger.error('Failed to get gas estimation statistics:', error);
      throw error;
    }
  }
}