import { Injectable } from '@nestjs/common';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CsvExportService {
  private readonly exportDir = join(process.cwd(), 'exports');

  constructor() {
    // Ensure export directory exists
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Convert array of objects to CSV format
   */
  private arrayToCsv(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(this.flattenObject(item)).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(headers.map(header => this.escapeCsvValue(header)).join(','));

    // Add data rows
    data.forEach(item => {
      const flatItem = this.flattenObject(item);
      const row = headers.map(header => {
        const value = flatItem[header];
        return this.escapeCsvValue(value);
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Flatten nested objects for CSV export
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursively flatten nested objects
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          // Convert arrays to JSON string
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = value;
        }
      }
    }

    return flattened;
  }

  /**
   * Escape CSV values (handle commas, quotes, newlines)
   */
  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Export data to CSV file
   */
  exportToCsv(data: any[], filename: string): string {
    const csvContent = this.arrayToCsv(data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}_${timestamp}.csv`;
    const filePath = join(this.exportDir, fullFilename);

    writeFileSync(filePath, csvContent, 'utf8');
    
    return filePath;
  }

  /**
   * Export gas analysis data to CSV
   */
  exportGasAnalysis(analysisData: any[]): string {
    return this.exportToCsv(analysisData, 'gas_analysis');
  }

  /**
   * Export benchmark data to CSV
   */
  exportBenchmarkData(benchmarkData: any[]): string {
    return this.exportToCsv(benchmarkData, 'benchmark_results');
  }

  /**
   * Export comparison report data to CSV
   */
  exportComparisonReport(reportData: any[]): string {
    return this.exportToCsv(reportData, 'comparison_report');
  }



  /**
   * Get export directory path
   */
  getExportDirectory(): string {
    return this.exportDir;
  }
}