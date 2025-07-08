import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { ComparisonReport } from '../entities/comparison-report.entity';
import { ReportSection } from '../entities/report-section.entity';
import { SuccessResponseDto } from '../../../common/dto/base.dto';
import { ComparisonType } from '../../../common/dto/comparison-report.dto';
import { ValidationUtils } from '../../../common/utils';

interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

interface ReportAnalytics {
  totalReports: number;
  reportsByStatus: Record<string, number>;
  reportsByType: Record<string, number>;
  averageGenerationTime: number;
  popularNetworks: Array<{
    networkId: string;
    count: number;
    percentage: number;
  }>;
  savingsDistribution: {
    ranges: Array<{
      min: number;
      max: number;
      count: number;
      percentage: number;
    }>;
    average: number;
    median: number;
    total: number;
  };
  timeSeriesData: Array<{
    date: string;
    count: number;
    avgSavings: number;
    avgGenerationTime: number;
  }>;
  topContracts: Array<{
    contractName: string;
    reportCount: number;
    avgSavings: number;
    lastAnalyzed: string;
  }>;
}

interface UsageStatistics {
  totalUsers: number;
  activeUsers: number;
  reportsPerUser: number;
  popularFeatures: Array<{
    feature: string;
    usageCount: number;
    percentage: number;
  }>;
  exportStatistics: {
    totalExports: number;
    formatBreakdown: Record<string, number>;
    averageExportsPerReport: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    peakUsageHours: number[];
  };
}

@Injectable()
export class ReportAnalyticsService extends BaseService {

  constructor(
    @InjectRepository(ComparisonReport)
    private readonly reportRepository: Repository<ComparisonReport>,
    @InjectRepository(ReportSection)
    private readonly sectionRepository: Repository<ReportSection>,
  ) {
    super();
  }

  /**
   * Get comprehensive analytics for reports
   */
  async getReportAnalytics(
    timeRange?: AnalyticsTimeRange,
  ): Promise<SuccessResponseDto<ReportAnalytics>> {
    try {
      this.logger.log('Generating report analytics');

      const dateFilter = timeRange
        ? Between(timeRange.startDate, timeRange.endDate)
        : undefined;

      const whereClause = dateFilter ? { createdAt: dateFilter } : {};

      // Get all reports for the time range
      const reports = await this.reportRepository.find({
        where: whereClause,
        relations: ['sections'],
      });

      const analytics: ReportAnalytics = {
        totalReports: reports.length,
        reportsByStatus: this.calculateStatusDistribution(reports),
        reportsByType: this.calculateTypeDistribution(reports),
        averageGenerationTime: this.calculateAverageGenerationTime(reports),
        popularNetworks: this.calculatePopularNetworks(reports),
        savingsDistribution: this.calculateSavingsDistribution(reports),
        timeSeriesData: await this.generateTimeSeriesData(reports, timeRange),
        topContracts: this.calculateTopContracts(reports),
      };

      this.logger.log('Report analytics generated successfully');

      return this.createSuccessResponse(
        analytics,
        'Report analytics retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate analytics: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'ANALYTICS_GENERATION_FAILED',
        'Failed to generate report analytics',
        500,
      );
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(
    timeRange?: AnalyticsTimeRange,
  ): Promise<SuccessResponseDto<UsageStatistics>> {
    try {
      this.logger.log('Generating usage statistics');

      const dateFilter = timeRange
        ? Between(timeRange.startDate, timeRange.endDate)
        : undefined;

      const whereClause = dateFilter ? { createdAt: dateFilter } : {};

      const reports = await this.reportRepository.find({
        where: whereClause,
      });

      const statistics: UsageStatistics = {
        totalUsers: await this.calculateTotalUsers(reports),
        activeUsers: await this.calculateActiveUsers(reports, timeRange),
        reportsPerUser: this.calculateReportsPerUser(reports),
        popularFeatures: this.calculatePopularFeatures(reports),
        exportStatistics: this.calculateExportStatistics(reports),
        performanceMetrics: await this.calculatePerformanceMetrics(reports),
      };

      this.logger.log('Usage statistics generated successfully');

      return this.createSuccessResponse(
        statistics,
        'Usage statistics retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate usage statistics: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'USAGE_STATS_FAILED',
        'Failed to generate usage statistics',
        500,
      );
    }
  }

  /**
   * Get network performance analytics
   */
  async getNetworkAnalytics(
    networkId?: string,
    timeRange?: AnalyticsTimeRange,
  ): Promise<SuccessResponseDto<any>> {
    try {
      this.logger.log(`Generating network analytics for: ${networkId || 'all networks'}`);

      const dateFilter = timeRange
        ? Between(timeRange.startDate, timeRange.endDate)
        : undefined;

      const whereClause = dateFilter ? { createdAt: dateFilter } : {};

      const reports = await this.reportRepository.find({
        where: whereClause,
      });

      const networkAnalytics = {
        networkPerformance: this.calculateNetworkPerformance(reports, networkId),
        costTrends: this.calculateCostTrends(reports, networkId),
        savingsAnalysis: this.calculateNetworkSavings(reports, networkId),
        adoptionMetrics: this.calculateNetworkAdoption(reports, networkId),
        competitiveAnalysis: this.calculateCompetitiveAnalysis(reports),
      };

      this.logger.log('Network analytics generated successfully');

      return this.createSuccessResponse(
        networkAnalytics,
        'Network analytics retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate network analytics: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'NETWORK_ANALYTICS_FAILED',
        'Failed to generate network analytics',
        500,
      );
    }
  }

  /**
   * Get cost optimization insights
   */
  async getCostOptimizationInsights(
    timeRange?: AnalyticsTimeRange,
  ): Promise<SuccessResponseDto<any>> {
    try {
      this.logger.log('Generating cost optimization insights');

      const dateFilter = timeRange
        ? Between(timeRange.startDate, timeRange.endDate)
        : undefined;

      const whereClause = dateFilter ? { createdAt: dateFilter } : {};

      const reports = await this.reportRepository.find({
        where: whereClause,
      });

      const insights = {
        totalSavingsIdentified: this.calculateTotalSavings(reports),
        optimizationOpportunities: this.identifyOptimizationOpportunities(reports),
        contractOptimizationRanking: this.rankContractsByOptimization(reports),
        networkEfficiencyRanking: this.rankNetworksByEfficiency(reports),
        recommendedActions: this.generateOptimizationRecommendations(reports),
        impactAnalysis: this.calculateOptimizationImpact(reports),
      };

      this.logger.log('Cost optimization insights generated successfully');

      return this.createSuccessResponse(
        insights,
        'Cost optimization insights retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate optimization insights: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'OPTIMIZATION_INSIGHTS_FAILED',
        'Failed to generate cost optimization insights',
        500,
      );
    }
  }

  /**
   * Generate custom analytics report
   */
  async generateCustomAnalytics(
    filters: any,
    metrics: string[],
  ): Promise<SuccessResponseDto<any>> {
    try {
      this.logger.log('Generating custom analytics report');

      const reports = await this.getFilteredReports(filters);
      const customAnalytics: any = {};

      for (const metric of metrics) {
        switch (metric) {
          case 'cost_distribution':
            customAnalytics.costDistribution = this.calculateCostDistribution(reports);
            break;
          case 'time_analysis':
            customAnalytics.timeAnalysis = this.calculateTimeAnalysis(reports);
            break;
          case 'network_comparison':
            customAnalytics.networkComparison = this.calculateNetworkComparison(reports);
            break;
          case 'contract_analysis':
            customAnalytics.contractAnalysis = this.calculateContractAnalysis(reports);
            break;
          case 'savings_trends':
            customAnalytics.savingsTrends = this.calculateSavingsTrends(reports);
            break;
          default:
            this.logger.warn(`Unknown metric requested: ${metric}`);
        }
      }

      this.logger.log('Custom analytics generated successfully');

      return this.createSuccessResponse(
        customAnalytics,
        'Custom analytics generated successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate custom analytics: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'CUSTOM_ANALYTICS_FAILED',
        'Failed to generate custom analytics',
        500,
      );
    }
  }

  /**
   * Private calculation methods
   */
  private calculateStatusDistribution(reports: ComparisonReport[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    reports.forEach(report => {
      distribution[report.status] = (distribution[report.status] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateTypeDistribution(reports: ComparisonReport[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    reports.forEach(report => {
      distribution[report.reportType] = (distribution[report.reportType] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateAverageGenerationTime(reports: ComparisonReport[]): number {
    const validTimes = reports
      .filter(report => report.generationDuration && report.generationDuration > 0)
      .map(report => report.generationDuration!);
    
    return validTimes.length > 0
      ? validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
      : 0;
  }

  private calculatePopularNetworks(reports: ComparisonReport[]): Array<{
    networkId: string;
    count: number;
    percentage: number;
  }> {
    const networkCounts: Record<string, number> = {};
    let totalNetworkUsage = 0;

    reports.forEach(report => {
      report.networksCompared.forEach(networkId => {
        networkCounts[networkId] = (networkCounts[networkId] || 0) + 1;
        totalNetworkUsage++;
      });
    });

    return Object.entries(networkCounts)
      .map(([networkId, count]) => ({
        networkId,
        count,
        percentage: (count / totalNetworkUsage) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateSavingsDistribution(reports: ComparisonReport[]): {
    ranges: Array<{
      min: number;
      max: number;
      count: number;
      percentage: number;
    }>;
    average: number;
    median: number;
    total: number;
  } {
    const savings = reports
      .map(report => report.maxSavings)
      .filter(savings => savings !== undefined && savings !== null) as number[];

    const ranges = [
      { min: 0, max: 20 },
      { min: 20, max: 40 },
      { min: 40, max: 60 },
      { min: 60, max: 80 },
      { min: 80, max: 100 },
    ];

    const distribution = ranges.map(range => {
      const count = savings.filter(s => s >= range.min && s < range.max).length;
      return {
        ...range,
        count,
        percentage: savings.length > 0 ? (count / savings.length) * 100 : 0,
      };
    });

    const sortedSavings = savings.sort((a, b) => a - b);
    const median = sortedSavings.length > 0
      ? sortedSavings[Math.floor(sortedSavings.length / 2)]
      : 0;

    return {
      ranges: distribution,
      average: savings.length > 0 ? savings.reduce((sum, s) => sum + s, 0) / savings.length : 0,
      median,
      total: savings.reduce((sum, s) => sum + s, 0),
    };
  }

  private async generateTimeSeriesData(
    reports: ComparisonReport[],
    timeRange?: AnalyticsTimeRange,
  ): Promise<Array<{
    date: string;
    count: number;
    avgSavings: number;
    avgGenerationTime: number;
  }>> {
    const groupedData: Record<string, ComparisonReport[]> = {};
    const period = timeRange?.period || 'day';

    reports.forEach(report => {
      const dateKey = this.getDateKey(report.createdAt, period);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }
      groupedData[dateKey].push(report);
    });

    return Object.entries(groupedData)
      .map(([date, dayReports]) => {
        const validSavings = dayReports
          .map(r => r.maxSavings)
          .filter(s => s !== undefined && s !== null) as number[];
        
        const validTimes = dayReports
          .map(r => r.generationDuration)
          .filter(t => t !== undefined && t !== null) as number[];

        return {
          date,
          count: dayReports.length,
          avgSavings: validSavings.length > 0
            ? validSavings.reduce((sum, s) => sum + s, 0) / validSavings.length
            : 0,
          avgGenerationTime: validTimes.length > 0
            ? validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
            : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTopContracts(reports: ComparisonReport[]): Array<{
    contractName: string;
    reportCount: number;
    avgSavings: number;
    lastAnalyzed: string;
  }> {
    const contractData: Record<string, {
      reports: ComparisonReport[];
      lastAnalyzed: Date;
    }> = {};

    reports.forEach(report => {
      if (!contractData[report.contractName]) {
        contractData[report.contractName] = {
          reports: [],
          lastAnalyzed: report.createdAt,
        };
      }
      contractData[report.contractName].reports.push(report);
      if (report.createdAt > contractData[report.contractName].lastAnalyzed) {
        contractData[report.contractName].lastAnalyzed = report.createdAt;
      }
    });

    return Object.entries(contractData)
      .map(([contractName, data]) => {
        const validSavings = data.reports
          .map(r => r.maxSavings)
          .filter(s => s !== undefined && s !== null) as number[];

        return {
          contractName,
          reportCount: data.reports.length,
          avgSavings: validSavings.length > 0
            ? validSavings.reduce((sum, s) => sum + s, 0) / validSavings.length
            : 0,
          lastAnalyzed: data.lastAnalyzed.toISOString(),
        };
      })
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 10);
  }

  private async calculateTotalUsers(reports: ComparisonReport[]): Promise<number> {
    // In a real implementation, this would query user data
    // For now, we'll estimate based on unique metadata patterns
    const uniqueUsers = new Set(
      reports.map(report => report.metadata?.userId || 'anonymous')
    );
    return uniqueUsers.size;
  }

  private async calculateActiveUsers(
    reports: ComparisonReport[],
    timeRange?: AnalyticsTimeRange,
  ): Promise<number> {
    const recentReports = timeRange
      ? reports.filter(report => 
          report.createdAt >= timeRange.startDate && 
          report.createdAt <= timeRange.endDate
        )
      : reports.filter(report => 
          report.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

    const activeUsers = new Set(
      recentReports.map(report => report.metadata?.userId || 'anonymous')
    );
    return activeUsers.size;
  }

  private calculateReportsPerUser(reports: ComparisonReport[]): number {
    const userReports: Record<string, number> = {};
    
    reports.forEach(report => {
      const userId = report.metadata?.userId || 'anonymous';
      userReports[userId] = (userReports[userId] || 0) + 1;
    });

    const totalUsers = Object.keys(userReports).length;
    return totalUsers > 0 ? reports.length / totalUsers : 0;
  }

  private calculatePopularFeatures(reports: ComparisonReport[]): Array<{
    feature: string;
    usageCount: number;
    percentage: number;
  }> {
    const features: Record<string, number> = {
      'network_comparison': 0,
      'gas_optimization': 0,
      'cost_analysis': 0,
      'export_pdf': 0,
      'export_excel': 0,
      'chart_generation': 0,
    };

    reports.forEach(report => {
      features['network_comparison']++;
      if (report.reportType === ComparisonType.OPTIMIZATION_COMPARISON) {
        features['gas_optimization']++;
      }
      if (report.savingsBreakdown) {
        features['cost_analysis']++;
      }
      if (report.chartData) {
        features['chart_generation']++;
      }
      // Export statistics would be tracked separately in a real implementation
    });

    const totalUsage = Object.values(features).reduce((sum, count) => sum + count, 0);

    return Object.entries(features)
      .map(([feature, usageCount]) => ({
        feature,
        usageCount,
        percentage: totalUsage > 0 ? (usageCount / totalUsage) * 100 : 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  private calculateExportStatistics(reports: ComparisonReport[]): {
    totalExports: number;
    formatBreakdown: Record<string, number>;
    averageExportsPerReport: number;
  } {
    // In a real implementation, this would track actual export events
    const estimatedExports = reports.length * 0.3; // Assume 30% of reports are exported
    
    return {
      totalExports: Math.floor(estimatedExports),
      formatBreakdown: {
        pdf: Math.floor(estimatedExports * 0.5),
        excel: Math.floor(estimatedExports * 0.3),
        csv: Math.floor(estimatedExports * 0.15),
        json: Math.floor(estimatedExports * 0.05),
      },
      averageExportsPerReport: 0.3,
    };
  }

  private async calculatePerformanceMetrics(reports: ComparisonReport[]): Promise<{
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    peakUsageHours: number[];
  }> {
    const validTimes = reports
      .filter(report => report.generationDuration && report.generationDuration > 0)
      .map(report => report.generationDuration!);

    const successfulReports = reports.filter(report => report.status === 'completed').length;
    const failedReports = reports.filter(report => report.status === 'failed').length;
    const totalReports = reports.length;

    // Calculate peak usage hours based on creation times
    const hourCounts: Record<number, number> = {};
    reports.forEach(report => {
      const hour = report.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakUsageHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      averageResponseTime: validTimes.length > 0
        ? validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
        : 0,
      successRate: totalReports > 0 ? (successfulReports / totalReports) * 100 : 0,
      errorRate: totalReports > 0 ? (failedReports / totalReports) * 100 : 0,
      peakUsageHours,
    };
  }

  private calculateNetworkPerformance(reports: ComparisonReport[], networkId?: string): any {
    const networkData: Record<string, {
      reports: number;
      avgSavings: number;
      avgCost: number;
    }> = {};

    reports.forEach(report => {
      report.networksCompared.forEach(network => {
        if (!networkId || network === networkId) {
          if (!networkData[network]) {
            networkData[network] = { reports: 0, avgSavings: 0, avgCost: 0 };
          }
          networkData[network].reports++;
          
          const networkBreakdown = report.savingsBreakdown.breakdown.find(b => b.networkId === network);
          if (networkBreakdown) {
            networkData[network].avgSavings += networkBreakdown.savings;
            networkData[network].avgCost += networkBreakdown.cost;
          }
        }
      });
    });

    // Calculate averages
    Object.keys(networkData).forEach(network => {
      const data = networkData[network];
      data.avgSavings = data.avgSavings / data.reports;
      data.avgCost = data.avgCost / data.reports;
    });

    return networkData;
  }

  private calculateCostTrends(reports: ComparisonReport[], networkId?: string): any {
    // Group reports by time periods and calculate cost trends
    const timeGroups: Record<string, number[]> = {};
    
    reports.forEach(report => {
      const monthKey = report.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!timeGroups[monthKey]) {
        timeGroups[monthKey] = [];
      }
      
      if (networkId) {
        const networkBreakdown = report.savingsBreakdown.breakdown.find(b => b.networkId === networkId);
        if (networkBreakdown) {
          timeGroups[monthKey].push(networkBreakdown.cost);
        }
      } else {
        const avgCost = report.savingsBreakdown.breakdown.reduce((sum, b) => sum + b.cost, 0) / report.savingsBreakdown.breakdown.length;
        timeGroups[monthKey].push(avgCost);
      }
    });

    return Object.entries(timeGroups)
      .map(([month, costs]) => ({
        month,
        avgCost: costs.reduce((sum, cost) => sum + cost, 0) / costs.length,
        minCost: Math.min(...costs),
        maxCost: Math.max(...costs),
        reportCount: costs.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateNetworkSavings(reports: ComparisonReport[], networkId?: string): any {
    const savingsData: Record<string, number[]> = {};
    
    reports.forEach(report => {
      report.networksCompared.forEach(network => {
        if (!networkId || network === networkId) {
          if (!savingsData[network]) {
            savingsData[network] = [];
          }
          
          const networkBreakdown = report.savingsBreakdown.breakdown.find(b => b.networkId === network);
          if (networkBreakdown) {
            savingsData[network].push(networkBreakdown.savings);
          }
        }
      });
    });

    return Object.entries(savingsData)
      .map(([network, savings]) => ({
        networkId: network,
        avgSavings: savings.reduce((sum, s) => sum + s, 0) / savings.length,
        maxSavings: Math.max(...savings),
        minSavings: Math.min(...savings),
        totalReports: savings.length,
      }))
      .sort((a, b) => b.avgSavings - a.avgSavings);
  }

  private calculateNetworkAdoption(reports: ComparisonReport[], networkId?: string): any {
    const adoptionData: Record<string, number> = {};
    
    reports.forEach(report => {
      report.networksCompared.forEach(network => {
        if (!networkId || network === networkId) {
          adoptionData[network] = (adoptionData[network] || 0) + 1;
        }
      });
    });

    const totalUsage = Object.values(adoptionData).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(adoptionData)
      .map(([network, count]) => ({
        networkId: network,
        usageCount: count,
        adoptionRate: totalUsage > 0 ? (count / totalUsage) * 100 : 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  private calculateCompetitiveAnalysis(reports: ComparisonReport[]): any {
    // Analyze how networks compare against each other
    const networkComparisons: Record<string, {
      winsAgainst: Record<string, number>;
      losesAgainst: Record<string, number>;
    }> = {};

    reports.forEach(report => {
      const sortedNetworks = report.savingsBreakdown.breakdown
        .sort((a, b) => a.cost - b.cost); // Sort by cost (ascending)
      
      for (let i = 0; i < sortedNetworks.length; i++) {
        const currentNetwork = sortedNetworks[i].networkId;
        
        if (!networkComparisons[currentNetwork]) {
          networkComparisons[currentNetwork] = { winsAgainst: {}, losesAgainst: {} };
        }
        
        // Count wins (networks with higher cost)
        for (let j = i + 1; j < sortedNetworks.length; j++) {
          const losingNetwork = sortedNetworks[j].networkId;
          networkComparisons[currentNetwork].winsAgainst[losingNetwork] = 
            (networkComparisons[currentNetwork].winsAgainst[losingNetwork] || 0) + 1;
        }
        
        // Count losses (networks with lower cost)
        for (let j = 0; j < i; j++) {
          const winningNetwork = sortedNetworks[j].networkId;
          networkComparisons[currentNetwork].losesAgainst[winningNetwork] = 
            (networkComparisons[currentNetwork].losesAgainst[winningNetwork] || 0) + 1;
        }
      }
    });

    return networkComparisons;
  }

  private calculateTotalSavings(reports: ComparisonReport[]): number {
    return reports.reduce((total, report) => {
      const maxCost = Math.max(...report.savingsBreakdown.breakdown.map(b => b.cost));
      const minCost = Math.min(...report.savingsBreakdown.breakdown.map(b => b.cost));
      return total + (maxCost - minCost);
    }, 0);
  }

  private identifyOptimizationOpportunities(reports: ComparisonReport[]): any[] {
    const opportunities: any[] = [];
    
    reports.forEach(report => {
      const maxSavings = report.maxSavings;
      if (maxSavings > 50) {
        opportunities.push({
          contractName: report.contractName,
          currentNetwork: report.mostExpensiveNetwork,
          recommendedNetwork: report.cheapestNetwork,
          potentialSavings: maxSavings,
          priority: maxSavings > 80 ? 'high' : maxSavings > 60 ? 'medium' : 'low',
        });
      }
    });
    
    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  private rankContractsByOptimization(reports: ComparisonReport[]): any[] {
    const contractRankings: Record<string, {
      totalSavings: number;
      reportCount: number;
      avgSavings: number;
    }> = {};
    
    reports.forEach(report => {
      if (!contractRankings[report.contractName]) {
        contractRankings[report.contractName] = {
          totalSavings: 0,
          reportCount: 0,
          avgSavings: 0,
        };
      }
      
      contractRankings[report.contractName].totalSavings += report.maxSavings;
      contractRankings[report.contractName].reportCount++;
    });
    
    // Calculate averages
    Object.keys(contractRankings).forEach(contract => {
      const data = contractRankings[contract];
      data.avgSavings = data.totalSavings / data.reportCount;
    });
    
    return Object.entries(contractRankings)
      .map(([contractName, data]) => ({
        contractName,
        ...data,
      }))
      .sort((a, b) => b.avgSavings - a.avgSavings);
  }

  private rankNetworksByEfficiency(reports: ComparisonReport[]): any[] {
    const networkEfficiency: Record<string, {
      totalCost: number;
      reportCount: number;
      avgCost: number;
    }> = {};
    
    reports.forEach(report => {
      report.savingsBreakdown.breakdown.forEach(breakdown => {
        if (!networkEfficiency[breakdown.networkId]) {
          networkEfficiency[breakdown.networkId] = {
            totalCost: 0,
            reportCount: 0,
            avgCost: 0,
          };
        }
        
        networkEfficiency[breakdown.networkId].totalCost += breakdown.cost;
        networkEfficiency[breakdown.networkId].reportCount++;
      });
    });
    
    // Calculate averages
    Object.keys(networkEfficiency).forEach(network => {
      const data = networkEfficiency[network];
      data.avgCost = data.totalCost / data.reportCount;
    });
    
    return Object.entries(networkEfficiency)
      .map(([networkId, data]) => ({
        networkId,
        ...data,
        efficiencyRank: 0, // Will be set after sorting
      }))
      .sort((a, b) => a.avgCost - b.avgCost)
      .map((item, index) => ({ ...item, efficiencyRank: index + 1 }));
  }

  private generateOptimizationRecommendations(reports: ComparisonReport[]): any[] {
    const recommendations: any[] = [];
    
    // Analyze patterns and generate recommendations
    const networkPerformance = this.calculateNetworkPerformance(reports);
    const topNetworks = Object.entries(networkPerformance)
      .sort(([, a], [, b]) => (a as any).avgCost - (b as any).avgCost)
      .slice(0, 3);
    
    recommendations.push({
      type: 'network_migration',
      title: 'Consider migrating to cost-effective networks',
      description: `Top performing networks: ${topNetworks.map(([network]) => network).join(', ')}`,
      impact: 'high',
      effort: 'medium',
    });
    
    // Add more recommendation logic here
    
    return recommendations;
  }

  private calculateOptimizationImpact(reports: ComparisonReport[]): any {
    const totalPotentialSavings = this.calculateTotalSavings(reports);
    const averageSavingsPercentage = reports.reduce((sum, report) => sum + report.maxSavings, 0) / reports.length;
    
    return {
      totalPotentialSavings,
      averageSavingsPercentage,
      impactLevel: averageSavingsPercentage > 70 ? 'high' : averageSavingsPercentage > 40 ? 'medium' : 'low',
      recommendedActions: averageSavingsPercentage > 50 ? 'immediate_action' : 'monitor_and_plan',
    };
  }

  private async getFilteredReports(filters: any): Promise<ComparisonReport[]> {
    const whereClause: any = {};
    
    if (filters.contractName) {
      whereClause.contractName = filters.contractName;
    }
    
    if (filters.status) {
      whereClause.status = filters.status;
    }
    
    if (filters.dateRange) {
      whereClause.createdAt = Between(new Date(filters.dateRange.start), new Date(filters.dateRange.end));
    }
    
    return this.reportRepository.find({
      where: whereClause,
      relations: ['sections'],
    });
  }

  private calculateCostDistribution(reports: ComparisonReport[]): any {
    const costs: number[] = [];
    
    reports.forEach(report => {
      report.savingsBreakdown.breakdown.forEach(breakdown => {
        costs.push(breakdown.cost);
      });
    });
    
    costs.sort((a, b) => a - b);
    
    return {
      min: costs[0] || 0,
      max: costs[costs.length - 1] || 0,
      median: costs[Math.floor(costs.length / 2)] || 0,
      average: costs.reduce((sum, cost) => sum + cost, 0) / costs.length || 0,
      percentiles: {
        p25: costs[Math.floor(costs.length * 0.25)] || 0,
        p75: costs[Math.floor(costs.length * 0.75)] || 0,
        p90: costs[Math.floor(costs.length * 0.9)] || 0,
        p95: costs[Math.floor(costs.length * 0.95)] || 0,
      },
    };
  }

  private calculateTimeAnalysis(reports: ComparisonReport[]): any {
    const times = reports
      .map(report => report.generationDuration)
      .filter(time => time !== undefined && time !== null) as number[];
    
    times.sort((a, b) => a - b);
    
    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length || 0,
      medianTime: times[Math.floor(times.length / 2)] || 0,
      minTime: times[0] || 0,
      maxTime: times[times.length - 1] || 0,
      timeDistribution: {
        fast: times.filter(t => t < 5000).length,
        medium: times.filter(t => t >= 5000 && t < 15000).length,
        slow: times.filter(t => t >= 15000).length,
      },
    };
  }

  private calculateNetworkComparison(reports: ComparisonReport[]): any {
    return this.calculateNetworkPerformance(reports);
  }

  private calculateContractAnalysis(reports: ComparisonReport[]): any {
    return this.calculateTopContracts(reports);
  }

  private calculateSavingsTrends(reports: ComparisonReport[]): any {
    return this.generateTimeSeriesData(reports);
  }

  private getDateKey(date: Date, period: string): string {
    switch (period) {
      case 'day':
        return date.toISOString().substring(0, 10); // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().substring(0, 10);
      case 'month':
        return date.toISOString().substring(0, 7); // YYYY-MM
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toISOString().substring(0, 10);
    }
  }
}