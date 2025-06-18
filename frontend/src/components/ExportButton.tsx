'use client';

import { BenchmarkSession } from '@/lib/api';

interface ExportButtonProps {
  sessions: BenchmarkSession[];
}

export function ExportButton({ sessions }: ExportButtonProps) {
  const exportToCSV = () => {
    if (sessions.length === 0) {
      alert('No data to export');
      return;
    }

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

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `benchmark-results-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
      disabled={sessions.length === 0}
    >
      <span>📊</span>
      <span>Export CSV</span>
    </button>
  );
}