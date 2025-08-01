import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GasMonitoringRecord } from '../entities/gas-monitoring-record.entity';
import { CsvExportService } from '../shared/csv-export.service';
import * as fs from 'fs';
import * as path from 'path';

export interface GasMonitoringData {
  network: string;
  type: string;
  baseFeeGwei: number;
  priorityFeeGwei: number;
  maxFeeGwei: number;
  txCostUsd: number;
  timestamp?: Date;
  metadata?: any;
}

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  networks?: string[];
  format?: 'csv' | 'json';
}

@Injectable()
export class GasMonitoringService {
  private readonly logger = new Logger(GasMonitoringService.name);

  constructor(
    @InjectRepository(GasMonitoringRecord)
    private readonly gasMonitoringRepository: Repository<GasMonitoringRecord>,
    private readonly csvExportService: CsvExportService,
  ) {}

  /**
   * Store gas monitoring data to database
   */
  async storeGasData(data: GasMonitoringData[]): Promise<GasMonitoringRecord[]> {
    try {
      const records = data.map(item => {
        const record = new GasMonitoringRecord();
        record.network = item.network;
        record.type = item.type;
        record.baseFeeGwei = item.baseFeeGwei.toString();
        record.priorityFeeGwei = item.priorityFeeGwei.toString();
        record.maxFeeGwei = item.maxFeeGwei.toString();
        record.txCostUsd = item.txCostUsd.toString();
        record.timestamp = item.timestamp || new Date();
        record.metadata = item.metadata;
        return record;
      });

      const savedRecords = await this.gasMonitoringRepository.save(records);
      this.logger.log(`Stored ${savedRecords.length} gas monitoring records`);
      return savedRecords;
    } catch (error) {
      this.logger.error('Failed to store gas monitoring data:', error);
      throw error;
    }
  }

  /**
   * Get gas monitoring records with optional filtering
   */
  async getGasData(options: {
    startDate?: Date;
    endDate?: Date;
    networks?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ records: GasMonitoringRecord[]; total: number }> {
    try {
      const queryBuilder = this.gasMonitoringRepository.createQueryBuilder('record');

      if (options.startDate && options.endDate) {
        queryBuilder.andWhere('record.timestamp BETWEEN :startDate AND :endDate', {
          startDate: options.startDate,
          endDate: options.endDate,
        });
      }

      if (options.networks && options.networks.length > 0) {
        queryBuilder.andWhere('record.network IN (:...networks)', {
          networks: options.networks,
        });
      }

      queryBuilder.orderBy('record.timestamp', 'DESC');

      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder.offset(options.offset);
      }

      const [records, total] = await queryBuilder.getManyAndCount();
      this.logger.log(`Retrieved ${records.length} records`);
      if (records.length > 0) {
        this.logger.log('First record sample:', JSON.stringify(records[0], null, 2));
      }
      return { records, total };
    } catch (error) {
      this.logger.error('Failed to retrieve gas monitoring data:', error);
      throw error;
    }
  }

  /**
   * Export gas monitoring data to CSV format matching the specified format
   */
  async exportToCsv(options: ExportOptions = {}): Promise<string> {
    try {
      const { records } = await this.getGasData({
        startDate: options.startDate,
        endDate: options.endDate,
        networks: options.networks,
      });

      // Transform records to match the CSV format from the example
      const csvData = records.map(record => ({
        Network: record.network,
        Type: record.type,
        'Base Fee (Gwei)': parseFloat(record.baseFeeGwei).toExponential(2),
        'Priority Fee (Gwei)': parseFloat(record.priorityFeeGwei),
        'Max Fee (Gwei)': parseFloat(record.maxFeeGwei),
        'Tx Cost (USD)': `$${parseFloat(record.txCostUsd).toFixed(8)}`,
      }));

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const filename = `gas_monitoring_${timestamp}.csv`;
      
      const filePath = this.csvExportService.exportToCsv(csvData, filename);
      this.logger.log(`Exported ${records.length} records to ${filename}`);
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to export gas monitoring data:', error);
      throw error;
    }
  }

  /**
   * Get latest gas data for all networks
   */
  async getLatestGasData(): Promise<GasMonitoringRecord[]> {
    try {
      const subQuery = this.gasMonitoringRepository
        .createQueryBuilder('sub')
        .select('sub.network')
        .addSelect('MAX(sub.timestamp)', 'maxTimestamp')
        .groupBy('sub.network');

      const records = await this.gasMonitoringRepository
        .createQueryBuilder('record')
        .innerJoin(
          `(${subQuery.getQuery()})`,
          'latest',
          'record.network = latest.network AND record.timestamp = latest.maxTimestamp'
        )
        .setParameters(subQuery.getParameters())
        .orderBy('record.network')
        .getMany();

      return records;
    } catch (error) {
      this.logger.error('Failed to get latest gas data:', error);
      throw error;
    }
  }

  /**
   * Delete old records (cleanup)
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.gasMonitoringRepository
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old records`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup old records:', error);
      throw error;
    }
  }

  /**
   * Get statistics about stored data
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    networksCount: number;
    dateRange: { earliest: Date; latest: Date };
    recordsByNetwork: { network: string; count: number }[];
  }> {
    try {
      const totalRecords = await this.gasMonitoringRepository.count();
      
      const networksResult = await this.gasMonitoringRepository
        .createQueryBuilder('record')
        .select('record.network', 'network')
        .addSelect('COUNT(*)', 'count')
        .groupBy('record.network')
        .getRawMany();

      const dateRangeResult = await this.gasMonitoringRepository
        .createQueryBuilder('record')
        .select('MIN(record.timestamp)', 'earliest')
        .addSelect('MAX(record.timestamp)', 'latest')
        .getRawOne();

      return {
        totalRecords,
        networksCount: networksResult.length,
        dateRange: {
          earliest: dateRangeResult?.earliest || new Date(),
          latest: dateRangeResult?.latest || new Date(),
        },
        recordsByNetwork: networksResult.map(item => ({
          network: item.network,
          count: parseInt(item.count, 10),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Delete all records for a specific timestamp
   */
  async deleteRecordsByTimestamp(timestamp: string): Promise<number> {
    try {
      const result = await this.gasMonitoringRepository.delete({
        timestamp: new Date(timestamp)
      });
      
      this.logger.log(`Deleted ${result.affected || 0} records for timestamp: ${timestamp}`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Failed to delete records for timestamp ${timestamp}:`, error);
      throw error;
    }
  }
}