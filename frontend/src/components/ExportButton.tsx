import React from 'react';
import { BenchmarkSession } from '@/lib/api';

interface ExportButtonProps {
  sessions: BenchmarkSession[];
  analysisResult?: any; // Add the full analysis result for detailed export
}

// Utility function to format small numbers with scientific notation
const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }
  return value.toFixed(6);
};

export function ExportButton({ sessions, analysisResult }: ExportButtonProps) {
  const exportToCSV = () => {
    if (sessions.length === 0 && !analysisResult) {
      alert('No data to export');
      return;
    }

    let csvContent = '';

    // If we have detailed analysis result, create comprehensive report
    if (analysisResult) {
      // Summary Section
      csvContent += 'GAS ANALYSIS REPORT\n';
      csvContent += `Contract Name,${analysisResult.contractName}\n`;
      csvContent += `Analysis Date,${new Date(analysisResult.timestamp).toISOString()}\n`;
      csvContent += `Networks Analyzed,${analysisResult.results.length}\n`;
      csvContent += '\n';

      // Methodology Note
      csvContent += 'METHODOLOGY\n';
      csvContent += 'Measured Data: gasUsed values are accurate measurements from local Hardhat EVM\n';
      csvContent += 'Market Data: Gas prices and token prices are real-time data from APIs\n';
      csvContent += 'Estimated Data: L1/L2 cost breakdowns use simplified formulas and are approximations\n';
      csvContent += '\n';

      // Main Results Table
      csvContent += 'ESTIMATED TRANSACTION COSTS FROM STATIC ANALYSIS\n';
      const networkHeaders = [
        'Network',
        'Contract',
        'Method',
        'Measured gasUsed',
        'L2 gasPrice (gwei)',
        'L1 gasPrice (gwei)',
        'Token Price (USD)',
        'Est. L1 Data Cost (USD)',
        'Est. L2 Execution Cost (USD)',
        'Total Estimated Cost (USD)'
      ];
      csvContent += networkHeaders.join(',') + '\n';

      analysisResult.results.forEach((network: any) => {
        // Deployment row
        const l1GasPrice = network.gasPriceBreakdown?.baseFee ? 
          (network.gasPriceBreakdown.baseFee).toFixed(6) : 'N/A';
        const l2GasPrice = (network.gasPriceBreakdown.totalFee).toFixed(6);
        
        // Calculate estimated L1 and L2 costs
        const estimatedL1Cost = network.deployment.gasUsed && l1GasPrice !== 'N/A' ? 
          formatNumber((network.deployment.gasUsed * 16 * parseFloat(l1GasPrice) * 1e-9 * network.ethPriceUSD)) : 'N/A';
        const estimatedL2Cost = network.deployment.costUSD && estimatedL1Cost !== 'N/A' ? 
          formatNumber(network.deployment.costUSD - parseFloat(estimatedL1Cost)) : formatNumber(network.deployment.costUSD);
        
        const deploymentRow = [
          network.networkName,
          analysisResult.contractName,
          'deploy',
          network.deployment.gasUsed,
          l2GasPrice,
          l1GasPrice,
          network.ethPriceUSD.toFixed(2),
          estimatedL1Cost,
          estimatedL2Cost,
          formatNumber(network.deployment.costUSD)
        ];
        csvContent += deploymentRow.map(field => `"${field}"`).join(',') + '\n';
        
        // Function rows
        network.functions.forEach((func: any) => {
          if (func.gasUsed !== 'N/A' && func.estimatedCostUSD > 0) {
            const funcL1Cost = l1GasPrice !== 'N/A' && network.gasPriceBreakdown?.baseFee ? 
              formatNumber((func.gasUsed * 16 * network.gasPriceBreakdown.baseFee * 1e-9 * network.ethPriceUSD)) : 'N/A';
            const funcL2Cost = funcL1Cost !== 'N/A' ? 
              formatNumber(func.estimatedCostUSD - parseFloat(funcL1Cost)) : formatNumber(func.estimatedCostUSD);
            
            const functionRow = [
              network.networkName,
              analysisResult.contractName,
              func.functionName,
              func.gasUsed,
              l2GasPrice,
              l1GasPrice,
              network.ethPriceUSD.toFixed(2),
              funcL1Cost,
              funcL2Cost,
              formatNumber(func.estimatedCostUSD)
            ];
            csvContent += functionRow.map(field => `"${field}"`).join(',') + '\n';
          }
        });
      });

      csvContent += '\n';

      // Gas Price Data Quality Summary
      csvContent += 'GAS PRICE DATA QUALITY\n';
      const qualityHeaders = [
        'Network',
        'Confidence (%)',
        'Data Source',
        'Base Fee (gwei)',
        'Priority Fee (gwei)',
        'Total Fee (gwei)'
      ];
      csvContent += qualityHeaders.join(',') + '\n';
      
      analysisResult.results.forEach((network: any) => {
        const qualityRow = [
          network.networkName,
          network.gasPriceBreakdown.confidence?.toFixed(1) || 'N/A',
          network.gasPriceBreakdown.source || 'Unknown',
          (network.gasPriceBreakdown.baseFee / 1e9).toFixed(2),
          (network.gasPriceBreakdown.priorityFee / 1e9).toFixed(2),
          (network.gasPriceBreakdown.totalFee / 1e9).toFixed(2)
        ];
        csvContent += qualityRow.map(field => `"${field}"`).join(',') + '\n';
      });
      csvContent += '\n';

      // Network Cost Comparison
      csvContent += 'DEPLOYMENT COST COMPARISON\n';
      const comparisonHeaders = ['Metric', ...analysisResult.results.map((n: any) => n.networkName)];
      csvContent += comparisonHeaders.join(',') + '\n';
      
      // Deployment gas (constant across networks)
      const gasRow = ['Measured Gas Used', ...analysisResult.results.map((n: any) => n.deployment.gasUsed)];
      csvContent += gasRow.map(field => `"${field}"`).join(',') + '\n';
      
      // Total cost in USD
      const costRow = ['Total Cost (USD)', ...analysisResult.results.map((n: any) => formatNumber(n.deployment.costUSD))];
      csvContent += costRow.map(field => `"${field}"`).join(',') + '\n';
      
      // Gas price in gwei
      const gasPriceRow = ['Gas Price (gwei)', ...analysisResult.results.map((n: any) => (n.gasPriceBreakdown.totalFee / 1e9).toFixed(2))];
      csvContent += gasPriceRow.map(field => `"${field}"`).join(',') + '\n';
      
      // Token price
      const tokenPriceRow = ['Token Price (USD)', ...analysisResult.results.map((n: any) => n.ethPriceUSD.toFixed(2))];
      csvContent += tokenPriceRow.map(field => `"${field}"`).join(',') + '\n';

    } else {
      // Fallback to original benchmark format
      const headers = [
        'Date',
        'Total Operations',
        'Average Gas Used',
        'Average Execution Time (s)',
        'Total Transactions',
        'Successful Transactions',
        'Failed Transactions',
        'Success Rate (%)',
        'Total Gas Used',
        'Total Fees (ETH)'
      ];

      const csvData = sessions.map(session => {
        const successRate = session.results?.transactions ? 
          ((session.results.transactions.successfulTransactions / session.results.transactions.totalTransactions) * 100).toFixed(2) : '0';
        
        const totalFeesETH = session.results?.transactions?.totalFees ? 
          (parseFloat(session.results.transactions.totalFees) / 1e18).toFixed(6) : '0';

        return [
          session.createdAt ? new Date(session.createdAt).toISOString() : '',
          session.totalOperations || 0,
          session.avgGasUsed || 0,
          session.avgExecutionTime ? (session.avgExecutionTime / 1000).toFixed(2) : 0,
          session.results?.transactions?.totalTransactions || 0,
          session.results?.transactions?.successfulTransactions || 0,
          session.results?.transactions?.failedTransactions || 0,
          successRate,
          session.results?.transactions?.totalGasUsed || '0',
          totalFeesETH
        ];
      });

      csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = analysisResult 
      ? `gas-analysis-${analysisResult.contractName}-${new Date().toISOString().split('T')[0]}.csv`
      : `benchmark-results-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
      disabled={sessions.length === 0 && !analysisResult}
    >
      <span>📊</span>
      <span>Export Detailed CSV</span>
    </button>
  );
}