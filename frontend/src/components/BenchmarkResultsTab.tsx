'use client';

import React from 'react';
import { Download, CheckCircle, XCircle, Clock, Zap, Activity, BarChart3, ArrowUpRight } from 'lucide-react';
import { getNetworkDisplayName, getNetworkColor } from '@/config/networks';

interface TransactionMetrics {
  txHash: string;
  functionName: string;
  contractAddress: string;
  networkId: string;
  gasUsed: number;
  effectiveGasPrice: string;
  l1Fee?: string;
  confirmationTime: number;
  blockNumber: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface BenchmarkSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  transactions: TransactionMetrics[];
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasUsed: number;
    avgGasPrice: string;
    avgConfirmationTime: number;
    totalL1Fees: string;
  };
}

interface BenchmarkResultsTabProps {
  benchmarkResult: BenchmarkSession | null;
}

const API_BASE = 'http://localhost:3001';

export default function BenchmarkResultsTab({ benchmarkResult }: BenchmarkResultsTabProps) {
  if (!benchmarkResult) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-800/30 rounded-lg border border-gray-700">
        <Activity className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">No Results Available</h3>
        <p className="text-gray-500">Run a benchmark to see results here</p>
      </div>
    );
  }

  const exportResults = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/sessions/${benchmarkResult.id}/export`);
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([data.content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  // Group transactions by network
  const networkGroups = benchmarkResult.transactions.reduce((groups, tx) => {
    if (!groups[tx.networkId]) {
      groups[tx.networkId] = [];
    }
    groups[tx.networkId].push(tx);
    return groups;
  }, {} as Record<string, TransactionMetrics[]>);

  // Calculate network-specific stats
  const networkStats = Object.entries(networkGroups).map(([networkId, txs]) => {
    const successfulTxs = txs.filter(tx => tx.success);
    const avgGasUsed = successfulTxs.length > 0 
      ? successfulTxs.reduce((sum, tx) => sum + tx.gasUsed, 0) / successfulTxs.length 
      : 0;
    const avgConfirmationTime = successfulTxs.length > 0
      ? successfulTxs.reduce((sum, tx) => sum + tx.confirmationTime, 0) / successfulTxs.length
      : 0;
    
    return {
      networkId,
      txCount: txs.length,
      successCount: successfulTxs.length,
      successRate: txs.length > 0 ? (successfulTxs.length / txs.length) * 100 : 0,
      avgGasUsed,
      avgConfirmationTime
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Benchmark Results</h1>
        <p className="text-gray-400">Analysis of smart contract performance across networks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-white">{benchmarkResult.summary.totalTransactions}</p>
          <p className="text-xs text-gray-400 mt-1">
            {benchmarkResult.summary.successfulTransactions} successful / {benchmarkResult.summary.failedTransactions} failed
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-2 text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {benchmarkResult.summary.totalTransactions > 0 
              ? Math.round((benchmarkResult.summary.successfulTransactions / benchmarkResult.summary.totalTransactions) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Across all networks</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-2 text-orange-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Avg Gas</span>
          </div>
          <p className="text-2xl font-bold text-white">{Math.round(benchmarkResult.summary.totalGasUsed / benchmarkResult.summary.successfulTransactions).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Units per transaction</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Avg Time</span>
          </div>
          <p className="text-2xl font-bold text-white">{Math.round(benchmarkResult.summary.avgConfirmationTime)}ms</p>
          <p className="text-xs text-gray-400 mt-1">Confirmation time</p>
        </div>
      </div>

      {/* Network Comparison */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Network Comparison</h2>
          </div>
          <button
            onClick={exportResults}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/30">
              <tr>
                <th className="px-4 py-3 rounded-tl-md">Network</th>
                <th className="px-4 py-3">Txs</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Avg Gas</th>
                <th className="px-4 py-3 rounded-tr-md">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {networkStats.map((stat, index) => (
                <tr key={stat.networkId} className="border-b border-gray-700 hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getNetworkColor(stat.networkId) }}
                      />
                      <span>{getNetworkDisplayName(stat.networkId)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{stat.txCount}</td>
                  <td className="px-4 py-3">
                    <span className={stat.successRate > 80 ? 'text-green-400' : stat.successRate > 50 ? 'text-yellow-400' : 'text-red-400'}>
                      {Math.round(stat.successRate)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">{Math.round(stat.avgGasUsed).toLocaleString()}</td>
                  <td className="px-4 py-3">{Math.round(stat.avgConfirmationTime)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {benchmarkResult.transactions.slice(-10).reverse().map((tx, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-md">
              <div className="flex items-center space-x-3">
                {tx.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-mono text-sm">{tx.functionName}()</p>
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getNetworkColor(tx.networkId) }}
                    />
                    <p className="text-gray-400 text-xs">{getNetworkDisplayName(tx.networkId)}</p>
                  </div>
                  <p className="text-gray-500 text-xs font-mono">{tx.contractAddress.slice(0, 10)}...</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-orange-400">
                    <Zap className="w-3 h-3" />
                    <span>{tx.gasUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-purple-400">
                    <Clock className="w-3 h-3" />
                    <span>{tx.confirmationTime}ms</span>
                  </div>
                </div>
                {tx.txHash && (
                  <a 
                    href={`${getNetworkExplorerUrl(tx.networkId)}/tx/${tx.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                  >
                    <span className="font-mono">{tx.txHash.slice(0, 10)}...</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to get explorer URL
function getNetworkExplorerUrl(networkId: string): string {
  // This is a simplified version - in a real app, you'd get this from your network config
  const explorers: Record<string, string> = {
    arbitrumSepolia: 'https://sepolia.arbiscan.io',
    optimismSepolia: 'https://sepolia-optimism.etherscan.io',
    baseSepolia: 'https://sepolia.basescan.org',
    polygonAmoy: 'https://amoy.polygonscan.com',
    sepolia: 'https://sepolia.etherscan.io',
  };
  
  return explorers[networkId] || 'https://etherscan.io';
}