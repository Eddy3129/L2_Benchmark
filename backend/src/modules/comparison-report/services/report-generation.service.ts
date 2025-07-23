import { Injectable, Logger } from '@nestjs/common';
import { BaseDataService } from '../../../common/base.service';
import { DataStorageService } from '../../../shared/data-storage.service';
import {
  CreateComparisonReportRequestDto,
  ComparisonReportDto,
  ComparisonType,
  ReportStatus,
} from '../../../common/dto/comparison-report.dto';
import { SuccessResponseDto } from '../../../common/dto/base.dto';
import { ValidationUtils } from '../../../common/utils';

// Define interfaces since TypeORM entities are removed
interface ReportSection {
  sectionType: string;
  title: string;
  content: string;
  orderIndex: number;
}

interface ComparisonReport {
  id: string;
  title: string;
  description?: string;
  reportType: ComparisonType;
  status: string;
  contractName: string;
  sourceCodeHash: string;
  networksCompared: string[];
  comparisonConfig: any;
  savingsBreakdown: {
    breakdown: Array<{
      networkId: string;
      networkName?: string;
      cost: number;
      gasUsed: number;
      savings: number;
      rank?: number;
    }>;
  };
  executiveSummary: any;
  chartData: any;
  metadata: any;
  totalGasDifference: number;
  savingsPercentage: number;
  maxSavings?: number;
  avgSavings?: number;
  mostExpensiveNetwork?: string;
  cheapestNetwork?: string;
  totalNetworks?: number;
  sections?: Array<{
    sectionType: string;
    title: string;
    content: string;
    orderIndex: number;
  }>;
  generationDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define enums locally since entities are removed
enum SectionType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  COST_ANALYSIS = 'cost_analysis',
  NETWORK_COMPARISON = 'network_comparison',
  GAS_OPTIMIZATION = 'gas_optimization',
  RECOMMENDATIONS = 'recommendations',
  TECHNICAL_DETAILS = 'technical_details',
  SECURITY_ANALYSIS = 'security_analysis',
  APPENDIX = 'appendix'
}

enum ContentFormat {
  TEXT = 'text',
  HTML = 'html',
  MARKDOWN = 'markdown',
  JSON = 'json'
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: {
    type: SectionType;
    title: string;
    required: boolean;
    defaultContent?: string;
  }[];
  chartTypes: string[];
  exportFormats: string[];
}

@Injectable()
export class ReportGenerationService extends BaseDataService<any> {

  private readonly templates: Map<string, ReportTemplate> = new Map([
    [
      'network_comparison',
      {
        id: 'network_comparison',
        name: 'Network Comparison Report',
        description: 'Comprehensive comparison of gas costs across blockchain networks',
        sections: [
          {
            type: SectionType.EXECUTIVE_SUMMARY,
            title: 'Executive Summary',
            required: true,
          },
          {
            type: SectionType.COST_ANALYSIS,
            title: 'Cost Analysis',
            required: true,
          },
          {
            type: SectionType.NETWORK_COMPARISON,
            title: 'Network Comparison',
            required: true,
          },
          {
            type: SectionType.GAS_OPTIMIZATION,
            title: 'Gas Optimization Opportunities',
            required: false,
          },
          {
            type: SectionType.RECOMMENDATIONS,
            title: 'Recommendations',
            required: true,
          },
          {
            type: SectionType.TECHNICAL_DETAILS,
            title: 'Technical Details',
            required: false,
          },
        ],
        chartTypes: ['bar', 'line', 'pie'],
        exportFormats: ['pdf', 'excel', 'csv', 'json'],
      },
    ],
    [
      'gas_optimization',
      {
        id: 'gas_optimization',
        name: 'Gas Optimization Report',
        description: 'Detailed analysis of gas optimization opportunities',
        sections: [
          {
            type: SectionType.EXECUTIVE_SUMMARY,
            title: 'Executive Summary',
            required: true,
          },
          {
            type: SectionType.GAS_OPTIMIZATION,
            title: 'Optimization Analysis',
            required: true,
          },
          {
            type: SectionType.SECURITY_ANALYSIS,
            title: 'Security Considerations',
            required: true,
          },
          {
            type: SectionType.RECOMMENDATIONS,
            title: 'Implementation Recommendations',
            required: true,
          },
          {
            type: SectionType.TECHNICAL_DETAILS,
            title: 'Technical Implementation',
            required: false,
          },
        ],
        chartTypes: ['bar', 'scatter'],
        exportFormats: ['pdf', 'json'],
      },
    ],
    [
      'security_audit',
      {
        id: 'security_audit',
        name: 'Security Audit Report',
        description: 'Security analysis with gas cost implications',
        sections: [
          {
            type: SectionType.EXECUTIVE_SUMMARY,
            title: 'Executive Summary',
            required: true,
          },
          {
            type: SectionType.SECURITY_ANALYSIS,
            title: 'Security Analysis',
            required: true,
          },
          {
            type: SectionType.COST_ANALYSIS,
            title: 'Cost Impact Analysis',
            required: true,
          },
          {
            type: SectionType.RECOMMENDATIONS,
            title: 'Security Recommendations',
            required: true,
          },
          {
            type: SectionType.APPENDIX,
            title: 'Appendix',
            required: false,
          },
        ],
        chartTypes: ['pie', 'bar'],
        exportFormats: ['pdf', 'json'],
      },
    ],
  ]);

  constructor(
    private readonly dataStorageService: DataStorageService,
  ) {
    super(dataStorageService, 'comparisonReports');
  }

  /**
   * Generate detailed content for an existing report
   */
  async generateReportContent(
    reportId: string,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    try {
      ValidationUtils.validateUUID(reportId);

      this.logger.log(`Generating content for report: ${reportId}`);

      const report = await this.findById(reportId);
      if (!report) {
        throw this.createError(
          'REPORT_NOT_FOUND',
          'Comparison report not found',
          404,
        );
      }

      const startTime = Date.now();

      // Generate enhanced content for existing sections
      await this.enhanceExistingSections(report);

      // Generate chart data
      await this.generateChartData(report);

      // Add missing sections based on template
      await this.addMissingSections(report);

      // Update generation duration
      report.generationDuration = Date.now() - startTime;
      report.markAsCompleted();
      await this.updateById(reportId, report);

      // Reload with updated sections
      const updatedReport = await this.findById(reportId);

      const reportDto = this.mapToReportDto(updatedReport!);

      this.logger.log(`Report content generated successfully: ${reportId}`);

      return this.createSuccessResponse(
        reportDto,
        'Report content generated successfully',
      );
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      this.logger.error(
        `Failed to generate report content: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'CONTENT_GENERATION_FAILED',
        'Failed to generate report content',
        500,
      );
    }
  }

  /**
   * Export report in various formats
   */
  async exportReport(
    reportId: string,
    format: 'pdf' | 'excel' | 'csv' | 'json',
  ): Promise<any> {
    try {
      ValidationUtils.validateUUID(reportId);

      const report = await this.findById(reportId);
      if (!report) {
        throw this.createError(
          'REPORT_NOT_FOUND',
          'Comparison report not found',
          404,
        );
      }

      this.logger.log(`Exporting report ${reportId} in ${format} format`);

      switch (format) {
        case 'json':
          return this.exportAsJson(report);
        case 'csv':
          return this.exportAsCsv(report);
        case 'excel':
          return this.exportAsExcel(report);
        case 'pdf':
          return this.exportAsPdf(report);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      this.logger.error(
        `Failed to export report: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'EXPORT_FAILED',
        'Failed to export report',
        500,
      );
    }
  }

  /**
   * Get available report templates
   */
  async getAvailableTemplates(): Promise<SuccessResponseDto<any[]>> {
    try {
      const templates = Array.from(this.templates.values()).map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        sectionCount: template.sections.length,
        requiredSections: template.sections.filter((s) => s.required).length,
        supportedCharts: template.chartTypes,
        exportFormats: template.exportFormats,
      }));

      return this.createSuccessResponse(
        templates,
        'Report templates retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to get templates: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'TEMPLATES_FETCH_FAILED',
        'Failed to retrieve report templates',
        500,
      );
    }
  }

  /**
   * Generate multiple reports in batch
   */
  async generateBulkReports(
    requests: CreateComparisonReportRequestDto[],
  ): Promise<SuccessResponseDto<any>> {
    try {
      this.logger.log(`Starting bulk generation of ${requests.length} reports`);

      const results = {
        total: requests.length,
        successful: 0,
        failed: 0,
        reports: [] as any[],
        errors: [] as any[],
      };

      for (let i = 0; i < requests.length; i++) {
        try {
          // Note: This would typically call the comparison report service
          // For now, we'll simulate the process
          const reportId = `bulk_report_${Date.now()}_${i}`;
          
          results.reports.push({
            index: i,
            reportId,
            title: requests[i].title,
            status: 'queued',
          });
          results.successful++;
        } catch (error) {
          results.errors.push({
            index: i,
            title: requests[i].title,
            error: error.message,
          });
          results.failed++;
        }
      }

      this.logger.log(
        `Bulk generation completed: ${results.successful} successful, ${results.failed} failed`,
      );

      return this.createSuccessResponse(
        results,
        'Bulk report generation initiated successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate bulk reports: ${error.message}`,
        error.stack,
      );
      throw this.createError(
        'BULK_GENERATION_FAILED',
        'Failed to generate bulk reports',
        500,
      );
    }
  }

  /**
   * Enhance existing sections with detailed content
   */
  private async enhanceExistingSections(report: ComparisonReport): Promise<void> {
    for (const section of report.sections || []) {
      switch (section.sectionType) {
        case SectionType.EXECUTIVE_SUMMARY:
          section.content = this.generateEnhancedExecutiveSummary(report);
          break;
        case SectionType.COST_ANALYSIS:
          section.content = this.generateDetailedCostAnalysis(report);
          break;
        case SectionType.NETWORK_COMPARISON:
          section.content = this.generateDetailedNetworkComparison(report);
          break;
        case SectionType.RECOMMENDATIONS:
          section.content = this.generateDetailedRecommendations(report);
          break;
      }
      // Note: Section management would need to be handled differently with DataStorageService
      // For now, we'll store sections as part of the report data
    }
  }

  /**
   * Generate chart data for the report
   */
  private async generateChartData(report: ComparisonReport): Promise<void> {
    const chartData = {
      costComparison: this.generateCostComparisonChart(report),
      savingsOverTime: this.generateSavingsChart(report),
      gasUsageBreakdown: this.generateGasUsageChart(report),
    };

    report.chartData = chartData;
    await this.updateById(report.id, report);
  }

  /**
   * Add missing sections based on template
   */
  private async addMissingSections(report: ComparisonReport): Promise<void> {
    const template = this.templates.get('network_comparison');
    if (!template) return;

    const existingSectionTypes = new Set(
      report.sections?.map((s) => s.sectionType) || [],
    );

    for (const templateSection of template.sections) {
      if (!existingSectionTypes.has(templateSection.type)) {
        const newSection = {
          reportId: report.id,
          title: templateSection.title,
          sectionType: templateSection.type,
          orderIndex: this.getNextOrderIndex(report.sections || []),
          content: this.generateSectionContent(templateSection.type, report),
          contentFormat: ContentFormat.MARKDOWN,
          isVisible: templateSection.required,
        };
        // Add section to report's sections array
        if (!report.sections) report.sections = [];
        report.sections.push(newSection);
      }
    }
  }

  /**
   * Generate enhanced content for different section types
   */
  private generateEnhancedExecutiveSummary(report: ComparisonReport): string {
    return `# Executive Summary

## Overview

This comprehensive analysis examines the gas cost implications of deploying the **${report.contractName}** smart contract across ${report.totalNetworks} blockchain networks.

## Key Findings

${report.executiveSummary.keyFindings.map((finding, index) => `${index + 1}. ${finding}`).join('\n')}

## Financial Impact

- **Maximum Savings**: ${(report.maxSavings || 0).toFixed(2)}%
- **Best Network**: ${report.cheapestNetwork}
- **Worst Network**: ${report.mostExpensiveNetwork}
- **Average Savings**: ${(report.avgSavings || 0).toFixed(2)}%

## Strategic Recommendations

${report.executiveSummary.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Risk Assessment

**Implementation Complexity**: ${report.executiveSummary.implementationComplexity}

${report.executiveSummary.riskAssessment}

## Next Steps

1. Review detailed cost analysis in subsequent sections
2. Evaluate network-specific considerations
3. Plan migration strategy if applicable
4. Monitor ongoing gas price trends`;
  }

  private generateDetailedCostAnalysis(report: ComparisonReport): string {
    const breakdown = report.savingsBreakdown.breakdown;
    
    return `# Detailed Cost Analysis

## Network Cost Breakdown

${breakdown.map(network => `### ${network.networkName}

- **Total Cost**: $${network.cost.toFixed(6)}
- **Potential Savings**: ${network.savings.toFixed(2)}%
- **Market Rank**: #${network.rank} of ${breakdown.length}
- **Cost Efficiency**: ${this.getCostEfficiencyRating(network.savings)}

#### Cost Components
- Deployment Gas: Estimated based on bytecode size
- Function Execution: Average across common operations
- Network Fees: Current market rates

`).join('\n')}

## Cost Comparison Matrix

| Network | Cost (USD) | Savings (%) | Rank | Efficiency |
|---------|------------|-------------|------|------------|
${breakdown.map(network => `| ${network.networkName} | $${network.cost.toFixed(6)} | ${network.savings.toFixed(1)}% | #${network.rank} | ${this.getCostEfficiencyRating(network.savings)} |`).join('\n')}

## Analysis Methodology

This analysis considers:
- Current gas prices at time of analysis
- Network-specific fee structures
- Contract deployment costs
- Estimated function execution costs
- Market volatility factors`;
  }

  private generateDetailedNetworkComparison(report: ComparisonReport): string {
    return `# Network Comparison

## Networks Analyzed

${report.networksCompared.map(networkId => {
      const networkData = report.savingsBreakdown.breakdown.find(n => n.networkId === networkId);
      return `### ${networkData?.networkName || networkId}

**Network Type**: ${this.getNetworkType(networkId)}
**Consensus**: ${this.getConsensusType(networkId)}
**Average Block Time**: ${this.getBlockTime(networkId)}
**Gas Token**: ${this.getGasToken(networkId)}

#### Advantages
${this.getNetworkAdvantages(networkId).map(adv => `- ${adv}`).join('\n')}

#### Considerations
${this.getNetworkConsiderations(networkId).map(con => `- ${con}`).join('\n')}

`;
    }).join('\n')}

## Comparison Criteria

### Cost Efficiency
Ranked by total deployment and operation costs

### Network Maturity
Considering adoption, security, and ecosystem development

### Technical Features
Evaluating EVM compatibility, throughput, and finality

### Ecosystem Support
Assessing developer tools, documentation, and community`;
  }

  private generateDetailedRecommendations(report: ComparisonReport): string {
    const bestNetwork = report.savingsBreakdown.breakdown[0];
    
    return `# Strategic Recommendations

## Primary Recommendation

**Deploy on ${bestNetwork.networkName}** for optimal cost efficiency with potential savings of ${bestNetwork.savings.toFixed(1)}%.

## Implementation Strategy

### Phase 1: Preparation
1. **Code Audit**: Ensure contract compatibility with target network
2. **Testing**: Deploy on testnet and verify functionality
3. **Gas Optimization**: Implement recommended optimizations
4. **Security Review**: Conduct thorough security assessment

### Phase 2: Deployment
1. **Staging Deployment**: Deploy to staging environment
2. **Performance Testing**: Validate gas estimates
3. **Production Deployment**: Execute final deployment
4. **Monitoring Setup**: Implement cost and performance monitoring

### Phase 3: Optimization
1. **Performance Analysis**: Monitor actual vs. estimated costs
2. **Continuous Optimization**: Implement ongoing improvements
3. **Cost Tracking**: Regular cost analysis and reporting

## Risk Mitigation

### Technical Risks
- **Network Compatibility**: ${this.getCompatibilityRisk(bestNetwork.networkId)}
- **Performance Impact**: ${this.getPerformanceRisk(bestNetwork.networkId)}
- **Security Considerations**: ${this.getSecurityRisk(bestNetwork.networkId)}

### Business Risks
- **Adoption Risk**: Consider network adoption and ecosystem maturity
- **Liquidity Risk**: Evaluate token liquidity and market depth
- **Regulatory Risk**: Monitor regulatory developments

## Alternative Strategies

### Multi-Network Deployment
Consider deploying on multiple networks for:
- Risk diversification
- Market coverage
- User accessibility

### Hybrid Approach
Combine networks based on:
- Use case requirements
- User demographics
- Cost optimization goals

## Monitoring and Maintenance

1. **Regular Cost Reviews**: Monthly cost analysis
2. **Performance Monitoring**: Continuous performance tracking
3. **Market Analysis**: Quarterly market and technology reviews
4. **Optimization Updates**: Implement improvements as needed`;
  }

  private generateSectionContent(sectionType: SectionType, report: ComparisonReport): string {
    switch (sectionType) {
      case SectionType.GAS_OPTIMIZATION:
        return this.generateGasOptimizationContent(report);
      case SectionType.SECURITY_ANALYSIS:
        return this.generateSecurityAnalysisContent(report);
      case SectionType.TECHNICAL_DETAILS:
        return this.generateTechnicalDetailsContent(report);
      case SectionType.APPENDIX:
        return this.generateAppendixContent(report);
      default:
        return `# ${sectionType.replace('_', ' ').toUpperCase()}\n\nContent for this section will be generated based on analysis results.`;
    }
  }

  private generateGasOptimizationContent(report: ComparisonReport): string {
    return `# Gas Optimization Opportunities

## Identified Optimizations

### Code-Level Optimizations
1. **Variable Packing**: Optimize storage variable arrangement
2. **Function Visibility**: Use appropriate visibility modifiers
3. **Loop Optimization**: Minimize gas usage in loops
4. **Event Optimization**: Optimize event emissions

### Deployment Optimizations
1. **Compiler Settings**: Use optimal compiler version and settings
2. **Library Usage**: Leverage existing libraries where appropriate
3. **Proxy Patterns**: Consider upgradeable proxy patterns

## Estimated Impact

- **Potential Gas Savings**: 10-30% depending on implementation
- **Deployment Cost Reduction**: 5-15%
- **Function Execution Savings**: 15-25%

## Implementation Priority

1. **High Impact, Low Effort**: Variable packing, visibility modifiers
2. **Medium Impact, Medium Effort**: Loop optimizations, event optimization
3. **High Impact, High Effort**: Architecture changes, proxy patterns`;
  }

  private generateSecurityAnalysisContent(report: ComparisonReport): string {
    return `# Security Analysis

## Network Security Considerations

${report.networksCompared.map(networkId => `### ${networkId}

**Security Level**: ${this.getSecurityLevel(networkId)}
**Validator Count**: ${this.getValidatorCount(networkId)}
**Finality Time**: ${this.getFinalityTime(networkId)}

`).join('\n')}

## Smart Contract Security

### Common Vulnerabilities
1. **Reentrancy**: Check for reentrancy vulnerabilities
2. **Integer Overflow**: Validate arithmetic operations
3. **Access Control**: Verify permission systems
4. **Gas Limit Issues**: Consider gas limit implications

### Network-Specific Risks
- **MEV Exposure**: Maximal Extractable Value considerations
- **Front-running**: Transaction ordering risks
- **Censorship**: Network censorship resistance

## Recommendations

1. **Security Audits**: Conduct thorough security audits
2. **Testing**: Comprehensive testing on target networks
3. **Monitoring**: Implement security monitoring
4. **Incident Response**: Prepare incident response procedures`;
  }

  private generateTechnicalDetailsContent(report: ComparisonReport): string {
    return `# Technical Implementation Details

## Contract Specifications

- **Contract Name**: ${report.contractName}
- **Source Code Hash**: ${report.sourceCodeHash}
- **Analysis Date**: ${new Date(report.createdAt).toISOString()}

## Network Configurations

${report.networksCompared.map(networkId => `### ${networkId}

- **Chain ID**: ${this.getChainId(networkId)}
- **RPC Endpoint**: ${this.getRpcEndpoint(networkId)}
- **Block Explorer**: ${this.getBlockExplorer(networkId)}
- **Gas Token**: ${this.getGasToken(networkId)}

`).join('\n')}

## Deployment Parameters

\`\`\`json
${JSON.stringify(report.comparisonConfig, null, 2)}
\`\`\`

## Analysis Methodology

1. **Contract Compilation**: Solidity compiler optimization
2. **Gas Estimation**: Static analysis and simulation
3. **Cost Calculation**: Current market rates
4. **Comparison Logic**: Normalized cost comparison

## Data Sources

- Gas price APIs
- Network statistics
- Market data providers
- Historical analysis data`;
  }

  private generateAppendixContent(report: ComparisonReport): string {
    return `# Appendix

## Glossary

**Gas**: Unit of computation on Ethereum-based networks
**Gwei**: Unit of gas price (1 Gwei = 10^-9 ETH)
**Layer 2**: Scaling solutions built on top of Layer 1 networks
**EVM**: Ethereum Virtual Machine

## References

1. Ethereum Gas Documentation
2. Network-specific documentation
3. Gas optimization best practices
4. Security audit guidelines

## Methodology Details

### Gas Estimation Formula
\`\`\`
Total Cost = (Gas Used × Gas Price) + Network Fees
\`\`\`

### Savings Calculation
\`\`\`
Savings % = ((Highest Cost - Network Cost) / Highest Cost) × 100
\`\`\`

## Disclaimer

This analysis is based on current market conditions and estimated gas usage. Actual costs may vary due to:
- Network congestion
- Gas price volatility
- Contract complexity variations
- Market conditions

Regular updates and monitoring are recommended for accurate cost tracking.`;
  }

  /**
   * Export methods
   */
  private exportAsJson(report: ComparisonReport): any {
    return {
      format: 'json',
      data: this.mapToReportDto(report),
      exportedAt: new Date().toISOString(),
    };
  }

  private exportAsCsv(report: ComparisonReport): any {
    const csvData = report.savingsBreakdown.breakdown.map(network => ({
      Network: network.networkName,
      'Cost (USD)': network.cost,
      'Savings (%)': network.savings,
      Rank: network.rank,
    }));

    return {
      format: 'csv',
      filename: `${report.contractName}_comparison_${Date.now()}.csv`,
      data: csvData,
      exportedAt: new Date().toISOString(),
    };
  }

  private exportAsExcel(report: ComparisonReport): any {
    return {
      format: 'excel',
      filename: `${report.contractName}_report_${Date.now()}.xlsx`,
      sheets: {
        Summary: report.savingsBreakdown.breakdown,
        Details: report.sections?.map(s => ({ Section: s.title, Content: s.content })),
      },
      exportedAt: new Date().toISOString(),
    };
  }

  private exportAsPdf(report: ComparisonReport): any {
    return {
      format: 'pdf',
      filename: `${report.contractName}_report_${Date.now()}.pdf`,
      content: this.generatePdfContent(report),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper methods
   */
  private generateCostComparisonChart(report: ComparisonReport): any {
    return {
      type: 'bar',
      data: {
        labels: report.savingsBreakdown.breakdown.map(n => n.networkName),
        datasets: [{
          label: 'Cost (USD)',
          data: report.savingsBreakdown.breakdown.map(n => n.cost),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Network Cost Comparison',
          },
        },
      },
    };
  }

  private generateSavingsChart(report: ComparisonReport): any {
    return {
      type: 'line',
      data: {
        labels: report.savingsBreakdown.breakdown.map(n => n.networkName),
        datasets: [{
          label: 'Savings (%)',
          data: report.savingsBreakdown.breakdown.map(n => n.savings),
          borderColor: 'rgba(75, 192, 192, 1)',
          fill: false,
        }],
      },
    };
  }

  private generateGasUsageChart(report: ComparisonReport): any {
    return {
      type: 'pie',
      data: {
        labels: ['Deployment', 'Function Calls', 'Storage', 'Other'],
        datasets: [{
          data: [40, 30, 20, 10],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 205, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
          ],
        }],
      },
    };
  }

  private generatePdfContent(report: ComparisonReport): string {
    return report.sections?.map(section => `${section.title}\n\n${section.content}`).join('\n\n') || '';
  }

  private getNextOrderIndex(sections: ReportSection[]): number {
    return sections.length > 0 ? Math.max(...sections.map(s => s.orderIndex)) + 1 : 1;
  }

  private getCostEfficiencyRating(savings: number): string {
    if (savings >= 80) return 'Excellent';
    if (savings >= 60) return 'Very Good';
    if (savings >= 40) return 'Good';
    if (savings >= 20) return 'Fair';
    return 'Poor';
  }

  private getNetworkType(networkId: string): string {
    const types: Record<string, string> = {
      ethereum: 'Layer 1 (Mainnet)',
      arbitrum: 'Layer 2 (Optimistic Rollup)',
      optimism: 'Layer 2 (Optimistic Rollup)',
      polygon: 'Sidechain',
      base: 'Layer 2 (Optimistic Rollup)',
    };
    return types[networkId] || 'Unknown';
  }

  private getConsensusType(networkId: string): string {
    const consensus: Record<string, string> = {
      ethereum: 'Proof of Stake',
      arbitrum: 'Fraud Proof',
      optimism: 'Fraud Proof',
      polygon: 'Proof of Stake',
      base: 'Fraud Proof',
    };
    return consensus[networkId] || 'Unknown';
  }

  private getBlockTime(networkId: string): string {
    const times: Record<string, string> = {
      ethereum: '12 seconds',
      arbitrum: '0.25 seconds',
      optimism: '2 seconds',
      polygon: '2 seconds',
      base: '2 seconds',
    };
    return times[networkId] || 'Unknown';
  }

  private getGasToken(networkId: string): string {
    const tokens: Record<string, string> = {
      ethereum: 'ETH',
      arbitrum: 'ETH',
      optimism: 'ETH',
      polygon: 'MATIC',
      base: 'ETH',
    };
    return tokens[networkId] || 'Unknown';
  }

  private getNetworkAdvantages(networkId: string): string[] {
    const advantages: Record<string, string[]> = {
      ethereum: ['Highest security', 'Largest ecosystem', 'Maximum decentralization'],
      arbitrum: ['Low fees', 'Fast transactions', 'EVM compatibility'],
      optimism: ['Low fees', 'Fast finality', 'Strong ecosystem'],
      polygon: ['Very low fees', 'Fast transactions', 'Mature ecosystem'],
      base: ['Coinbase backing', 'Low fees', 'Growing ecosystem'],
    };
    return advantages[networkId] || [];
  }

  private getNetworkConsiderations(networkId: string): string[] {
    const considerations: Record<string, string[]> = {
      ethereum: ['High gas fees', 'Network congestion', 'Slower transactions'],
      arbitrum: ['Newer technology', 'Centralized sequencer', 'Withdrawal delays'],
      optimism: ['Withdrawal delays', 'Centralized sequencer', 'Limited decentralization'],
      polygon: ['Different security model', 'Bridge risks', 'Validator centralization'],
      base: ['Newer network', 'Limited track record', 'Centralized aspects'],
    };
    return considerations[networkId] || [];
  }

  private getCompatibilityRisk(networkId: string): string {
    return networkId === 'ethereum' ? 'Low' : 'Medium';
  }

  private getPerformanceRisk(networkId: string): string {
    return networkId === 'ethereum' ? 'Medium' : 'Low';
  }

  private getSecurityRisk(networkId: string): string {
    return networkId === 'ethereum' ? 'Low' : 'Medium';
  }

  private getSecurityLevel(networkId: string): string {
    const levels: Record<string, string> = {
      ethereum: 'Highest',
      arbitrum: 'High',
      optimism: 'High',
      polygon: 'Medium-High',
      base: 'High',
    };
    return levels[networkId] || 'Unknown';
  }

  private getValidatorCount(networkId: string): string {
    const counts: Record<string, string> = {
      ethereum: '900,000+',
      arbitrum: 'Sequencer + Validators',
      optimism: 'Sequencer + Validators',
      polygon: '100+',
      base: 'Sequencer + Validators',
    };
    return counts[networkId] || 'Unknown';
  }

  private getFinalityTime(networkId: string): string {
    const times: Record<string, string> = {
      ethereum: '12-15 minutes',
      arbitrum: '7 days (withdrawal)',
      optimism: '7 days (withdrawal)',
      polygon: '2-3 minutes',
      base: '7 days (withdrawal)',
    };
    return times[networkId] || 'Unknown';
  }

  private getChainId(networkId: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      arbitrum: 42161,
      optimism: 10,
      polygon: 137,
      base: 8453,
    };
    return chainIds[networkId] || 0;
  }

  private getRpcEndpoint(networkId: string): string {
    return `https://${networkId}.example.com/rpc`;
  }

  private getBlockExplorer(networkId: string): string {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      polygon: 'https://polygonscan.com',
      base: 'https://basescan.org',
    };
    return explorers[networkId] || '';
  }

  private mapToReportDto(report: ComparisonReport): ComparisonReportDto {
    return {
      id: report.id,
      title: report.title,
      description: report.description,
      type: report.reportType,
      status: report.status as ReportStatus,
      contract: {
        name: report.contractName || 'Unknown',
        sourceCodeHash: report.sourceCodeHash || 'unknown',
        compilationSettings: {
          version: '0.8.0',
          optimization: {
            enabled: true,
            runs: 200
          }
        }
      },
      baseline: {
        network: 'ethereum',
        networkDisplayName: 'Ethereum',
        chainId: 1,
        deploymentGas: {
          gasLimit: 0,
          gasPrice: 0,
          totalCost: '0',
          totalCostUSD: 0
        },
        functionGasEstimates: {},
        timestamp: new Date().toISOString()
      },
      comparisons: [],
      summary: {
        totalNetworks: report.networksCompared?.length || 0,
        bestNetwork: { name: '', totalSavings: '0', savingsPercentage: 0 },
        worstNetwork: { name: '', additionalCost: '0', costIncreasePercentage: 0 },
        averageSavings: { absoluteETH: '0', absoluteUSD: 0, percentage: 0 }
      },
      config: report.comparisonConfig || {},
      tags: report.metadata?.tags || [],
      timestamps: {
        created: report.createdAt.toISOString(),
        updated: report.updatedAt.toISOString()
      },
      metadata: {
        version: report.metadata?.version,
        generatedBy: report.metadata?.generatedBy,
        analysisIds: report.metadata?.analysisIds,
        tags: report.metadata?.tags,
        customFields: report.metadata?.customFields,
        userId: report.metadata?.userId,
        analysisCount: report.metadata?.analysisIds?.length || 0,
        totalDuration: report.generationDuration || 0,
        dataSourceVersion: '1.0.0'
      }
    };
  }
}