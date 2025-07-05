import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComparisonReport } from './comparison-report.entity';
import { BaseService } from '../shared/base.service';
import { ValidationUtils } from '../shared/validation-utils';

@Injectable()
export class ComparisonReportService extends BaseService<ComparisonReport> {
  constructor(
    @InjectRepository(ComparisonReport)
    private comparisonReportRepository: Repository<ComparisonReport>,
  ) {
    super(comparisonReportRepository, 'ComparisonReport');
  }

  async createReport(reportData: Partial<ComparisonReport>): Promise<ComparisonReport> {
    // Validate UUID if provided
    if (reportData.id) {
      try {
        ValidationUtils.validateUUID(reportData.id);
      } catch (error) {
        throw ValidationUtils.createValidationError(['Invalid UUID format']);
      }
    }

    const report = this.comparisonReportRepository.create(reportData);
    return await this.comparisonReportRepository.save(report);
  }

  async getAllReports(limit?: number): Promise<ComparisonReport[]> {
    const options = {
      order: { createdAt: 'DESC' as const },
      ...(limit && { take: limit })
    };
    
    return await this.findAll(options);
  }

  async getReportsByDateRange(startDate: Date, endDate: Date): Promise<ComparisonReport[]> {
    return await this.getRepository()
      .createQueryBuilder('report')
      .where('report.createdAt >= :startDate', { startDate })
      .andWhere('report.createdAt <= :endDate', { endDate })
      .orderBy('report.createdAt', 'DESC')
      .getMany();
  }

  async getReportStats(): Promise<{
    totalReports: number;
    avgGasDifference: number;
    avgSavingsPercentage: number;
    latestReport: Date | null;
  }> {
    const reports = await this.findAll();
    
    if (reports.length === 0) {
      return {
        totalReports: 0,
        avgGasDifference: 0,
        avgSavingsPercentage: 0,
        latestReport: null,
      };
    }

    const totalGasDifference = reports.reduce((sum, report) => sum + Number(report.totalGasDifference), 0);
    const totalSavingsPercentage = reports.reduce((sum, report) => sum + Number(report.savingsPercentage), 0);
    
    return {
      totalReports: reports.length,
      avgGasDifference: totalGasDifference / reports.length,
      avgSavingsPercentage: totalSavingsPercentage / reports.length,
      latestReport: reports[0]?.createdAt || null,
    };
  }

  async getReportById(id: string): Promise<ComparisonReport | null> {
    return await this.comparisonReportRepository.findOne({ where: { id } });
  }

  async deleteReport(id: string): Promise<void> {
    const result = await this.comparisonReportRepository.delete(id);
    if (result.affected === 0) {
      throw ValidationUtils.createNotFoundError('Comparison report', id);
    }
  }
}