import { Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';
import { ValidationUtils } from '../shared/validation-utils';

// Define local interface for comparison report
interface ComparisonReport {
  id: string;
  reportName: string;
  networksCompared: string[];
  comparisonConfig: any;
  savingsBreakdown: any;
  executiveSummary: any;
  chartData: any;
  metadata: any;
  totalGasDifference: number;
  savingsPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ComparisonReportService {
  private readonly logger = new Logger(ComparisonReportService.name);

  constructor(
    private dataStorage: DataStorageService,
    private csvExport: CsvExportService,
  ) {}

  async createReport(reportData: Partial<ComparisonReport>): Promise<ComparisonReport> {
    // Validate UUID if provided
    if (reportData.id) {
      try {
        ValidationUtils.validateUUID(reportData.id);
      } catch (error) {
        throw ValidationUtils.createValidationError(['Invalid UUID format']);
      }
    }

    const report = {
      ...reportData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.dataStorage.create('comparisonReport', report);
  }

  async getAllReports(limit?: number): Promise<ComparisonReport[]> {
    const allReports = this.dataStorage.findAll('comparisonReport')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? allReports.slice(0, limit) : allReports;
  }

  async getReportsByDateRange(startDate: Date, endDate: Date): Promise<ComparisonReport[]> {
    return this.dataStorage.findAll('comparisonReport', (report) => {
      const reportDate = new Date(report.createdAt);
      return reportDate >= startDate && reportDate <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getReportStats(): Promise<{
    totalReports: number;
    avgGasDifference: number;
    avgSavingsPercentage: number;
    latestReport: Date | null;
  }> {
    const reports = this.dataStorage.findAll('comparisonReport');
    
    if (reports.length === 0) {
      return {
        totalReports: 0,
        avgGasDifference: 0,
        avgSavingsPercentage: 0,
        latestReport: null,
      };
    }

    const totalGasDifference = reports.reduce((sum, report) => sum + report.totalGasDifference, 0);
    const totalSavingsPercentage = reports.reduce((sum, report) => sum + report.savingsPercentage, 0);
    
    const sortedReports = reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      totalReports: reports.length,
      avgGasDifference: totalGasDifference / reports.length,
      avgSavingsPercentage: totalSavingsPercentage / reports.length,
      latestReport: sortedReports[0]?.createdAt || null,
    };
  }

  async getReportById(id: string): Promise<ComparisonReport | null> {
    return this.dataStorage.findById('comparisonReport', id);
  }

  async deleteReport(id: string): Promise<void> {
    const deleted = this.dataStorage.delete('comparisonReport', id);
    if (!deleted) {
      throw ValidationUtils.createNotFoundError('Comparison report', id);
    }
  }

  // Export comparison reports to CSV
  async exportReportsToCsv(): Promise<string> {
    const reports = this.dataStorage.findAll('comparisonReport');
    return this.csvExport.exportComparisonReport(reports);
  }

  // Export reports by date range to CSV
  async exportReportsByDateRangeToCsv(startDate: Date, endDate: Date): Promise<string> {
    const reports = await this.getReportsByDateRange(startDate, endDate);
    return this.csvExport.exportComparisonReport(reports);
  }
}