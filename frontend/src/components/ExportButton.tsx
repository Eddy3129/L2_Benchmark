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
  return value.toFixed(7);
};

export function ExportButton({ sessions, analysisResult }: ExportButtonProps) {
  const exportToCSV = () => {
    if (sessions.length === 0 && !analysisResult) {
      alert('No data to export');
      return;
    }

    let csvContent = '';

    // If we have detailed analysis result, create clean table matching frontend
    if (analysisResult) {
      // Headers matching the frontend table exactly
      const headers = [
        'Network',
        'Measured Gas Used',
        'L2 Gas Price (gwei)',
        'L1 Gas Price (gwei)',
        'Token Price (USD)',
        'Est. Deployment Cost (USD)',
        'Est. L2 Execution',
        'Est. L1 Blob Cost',
        'Confidence',
        'vs. Ethereum'
      ];
      csvContent += headers.join(',') + '\n';

      // Helper function to get network display name
      const getNetworkDisplayName = (network: string) => {
        const networkNames: { [key: string]: string } = {
          'mainnet': 'Ethereum',
          'ethereum': 'Ethereum',
          'arbitrum': 'Arbitrum',
          'optimism': 'Optimism',
          'base': 'Base',
          'polygon': 'Polygon PoS',
          'zksync-era': 'zkSync Era',
          'scroll': 'Scroll',
          'linea': 'Linea',
          'ink': 'Ink'
        };
        return networkNames[network] || network;
      };

      // Helper function to calculate savings vs Ethereum
      const ethereumResult = analysisResult.results.find((r: any) => 
        r.network === 'mainnet' || r.network === 'ethereum'
      );
      const ethereumCost = ethereumResult?.deployment?.costUSD || 0;

      // Helper function to get Ethereum L1 gas price
      const ethereumL1GasPrice = ethereumResult?.gasPriceBreakdown?.totalFee || null;

      analysisResult.results.forEach((networkResult: any) => {
        const isMainnet = networkResult.network === 'mainnet' || networkResult.network === 'ethereum';
        const isPolygon = networkResult.network === 'polygon';
        const isEthereumL2 = ['arbitrum', 'optimism', 'base', 'zksync-era', 'scroll', 'linea', 'ink'].includes(networkResult.network);
        
        // Calculate savings percentage
        let savingsPercentage = '-';
        if (ethereumCost > 0 && !isMainnet) {
          const savings = ((ethereumCost - networkResult.deployment.costUSD) / ethereumCost) * 100;
          savingsPercentage = `${savings.toFixed(1)}%`;
        }
        
        // Format L2 Gas Price
        let l2GasPrice = '-';
        if (!isMainnet) {
          l2GasPrice = networkResult.gasPriceBreakdown?.totalFee?.toFixed(7) || '-';
        }
        
        // Format L1 Gas Price
        let l1GasPrice = '-';
        if (isMainnet) {
          l1GasPrice = networkResult.gasPriceBreakdown?.totalFee?.toFixed(7) || '-';
        } else if (isEthereumL2 && ethereumL1GasPrice) {
          l1GasPrice = ethereumL1GasPrice.toFixed(7);
        }
        
        // Format L2 Execution Cost
        let l2ExecutionCost = '-';
        if (isMainnet || isPolygon) {
          l2ExecutionCost = formatNumber(networkResult.deployment.costUSD);
        } else if (isEthereumL2) {
          const l2Cost = networkResult.deployment.l2ExecutionCost || networkResult.deployment.costUSD;
          l2ExecutionCost = formatNumber(l2Cost);
        }
        
        // Format L1 Blob Cost
        let l1BlobCost = '-';
        if (isEthereumL2 && networkResult.deployment.l1DataCost !== undefined) {
          if (networkResult.deployment.l1DataCost === 0) {
            l1BlobCost = '$0.00';
          } else if (Math.abs(networkResult.deployment.l1DataCost) < 0.000001) {
            l1BlobCost = networkResult.deployment.l1DataCost.toExponential(2);
          } else {
            l1BlobCost = formatNumber(networkResult.deployment.l1DataCost);
          }
        }
        
        const row = [
          getNetworkDisplayName(networkResult.network),
          parseInt(networkResult.deployment.gasUsed).toLocaleString(),
          l2GasPrice,
          l1GasPrice,
          `$${networkResult.ethPriceUSD?.toFixed(2) || '-'}`,
          formatNumber(networkResult.deployment.totalCost || networkResult.deployment.costUSD),
          l2ExecutionCost,
          l1BlobCost,
          `${networkResult.gasPriceBreakdown?.confidence?.toFixed(0) || '-'}%`,
          savingsPercentage
        ];
        
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
          (parseFloat(session.results.transactions.totalFees) / 1e18).toFixed(7) : '0';

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
      ? `deployment-cost-estimation-${analysisResult.contractName}-${new Date().toISOString().split('T')[0]}.csv`
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