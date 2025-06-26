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

      // Network Summary
      csvContent += 'NETWORK SUMMARY\n';
      const networkHeaders = [
        'Network',
        'Deployment Gas',
        'Deployment Cost (ETH)',
        'Deployment Cost (USD)',
        'Gas Price (Gwei)',
        'Token Price (USD)',
        'Functions Count',
        'Total Function Cost (USD)',
        'Base Fee (Gwei)',
        'Priority Fee (Gwei)',
        'Total Fee (Gwei)',
        'Confidence',
        'Source'
      ];
      csvContent += networkHeaders.join(',') + '\n';

      analysisResult.results.forEach((network: any) => {
        const totalFunctionCost = network.functions.reduce((sum: number, f: any) => sum + (f.estimatedCostUSD || 0), 0);
        const networkRow = [
          network.networkName,
          network.deployment.gasUsed,
          formatNumber(parseFloat(network.deployment.costETH)),
          formatNumber(network.deployment.costUSD),
          parseFloat(network.gasPrice).toFixed(2),
          network.ethPriceUSD.toFixed(2),
          network.functions.length,
          formatNumber(totalFunctionCost),
          network.gasPriceBreakdown.baseFee.toFixed(2),
          network.gasPriceBreakdown.priorityFee.toFixed(2),
          network.gasPriceBreakdown.totalFee.toFixed(2),
          network.gasPriceBreakdown.confidence.toFixed(2),
          network.gasPriceBreakdown.source
        ];
        csvContent += networkRow.map(field => `"${field}"`).join(',') + '\n';
      });

      csvContent += '\n';

      // Detailed Function Analysis for each network
      analysisResult.results.forEach((network: any) => {
        csvContent += `FUNCTION ANALYSIS - ${network.networkName.toUpperCase()}\n`;
        const functionHeaders = [
          'Function Name',
          'Gas Used',
          `Cost (${network.network.includes('polygon') ? 'POL' : 'ETH'})`,
          'Cost (USD)',
          'Percentage of Network Total'
        ];
        csvContent += functionHeaders.join(',') + '\n';

        const totalNetworkCost = network.functions.reduce((sum: number, f: any) => sum + (f.estimatedCostUSD || 0), 0);
        
        network.functions.forEach((func: any) => {
          const percentage = totalNetworkCost > 0 ? ((func.estimatedCostUSD || 0) / totalNetworkCost * 100) : 0;
          const functionRow = [
            func.functionName,
            func.gasUsed !== 'N/A' ? func.gasUsed : 'N/A',
            func.estimatedCostETH !== 'N/A' ? formatNumber(parseFloat(func.estimatedCostETH)) : 'N/A',
            func.estimatedCostUSD > 0 ? formatNumber(func.estimatedCostUSD) : 'N/A',
            percentage > 0 ? `${percentage.toFixed(2)}%` : 'N/A'
          ];
          csvContent += functionRow.map(field => `"${field}"`).join(',') + '\n';
        });
        csvContent += '\n';
      });

      // Cost Comparison Matrix
      csvContent += 'COST COMPARISON MATRIX\n';
      const allFunctions = new Set<string>();
      analysisResult.results.forEach((network: any) => {
        network.functions.forEach((func: any) => {
          if (func.estimatedCostUSD > 0) {
            allFunctions.add(func.functionName);
          }
        });
      });

      const matrixHeaders = ['Function', ...analysisResult.results.map((n: any) => n.networkName)];
      csvContent += matrixHeaders.join(',') + '\n';

      Array.from(allFunctions).forEach(funcName => {
        const row = [funcName];
        analysisResult.results.forEach((network: any) => {
          const func = network.functions.find((f: any) => f.functionName === funcName);
          row.push(func ? formatNumber(func.estimatedCostUSD) : '0');
        });
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
      });

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
          session.avgExecutionTime || 0,
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