import React, { useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalysisResult {
  contractName: string;
  results: NetworkResult[];
  timestamp: string;
}

// Import shared types and utilities
import { NetworkResult, GasEstimate } from '@/types/shared';
import { NETWORK_CONFIGS, getNetworkColor } from '@/utils/networkConfig';
import { formatCurrency, formatGasUsed } from '@/utils/gasUtils';
import { createMultiDatasetChart, getLineChartOptions, getBarChartOptions } from '@/utils/chartConfig';

// Use centralized network configuration (imported above)

// Utility function to format small numbers with scientific notation
const formatNumber = (value: number, decimals: number = 4): string => {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }
  return value.toFixed(decimals);
};

// Remove duplicate formatCurrency function since it's imported from utils

interface GasAnalysisResultsProps {
  result: AnalysisResult;
}

export function GasAnalysisResults({ result }: GasAnalysisResultsProps) {
  // Function cost comparison data (line chart for better small number visualization)
  const functionCostLineData = useMemo(() => {
    const functionCosts: { [key: string]: number[] } = {};
    const networkNames = result.results.map(r => NETWORK_CONFIGS[r.network]?.name || r.networkName);
    
    // Collect all unique function names
    const allFunctions = new Set<string>();
    result.results.forEach(networkResult => {
      networkResult.functions.forEach(func => {
        if (func.estimatedCostUSD > 0) {
          allFunctions.add(func.functionName);
        }
      });
    });

    // Create datasets for each function
    const datasets = Array.from(allFunctions).slice(0, 6).map((funcName, index) => {
      const data = result.results.map(networkResult => {
        const func = networkResult.functions.find(f => f.functionName === funcName);
        return func ? func.estimatedCostUSD : 0;
      });

      return {
        label: funcName,
        data,
        borderColor: CHART_COLORS[index],
        backgroundColor: CHART_COLORS[index] + '20',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false,
      };
    });

    return {
      labels: networkNames,
      datasets
    };
  }, [result]);

  // Network cost comparison data (line chart)
  const networkCostLineData = useMemo(() => {
    const networks = result.results.map(r => NETWORK_CONFIGS[r.network]?.name || r.networkName);
    const deploymentCosts = result.results.map(r => r.deployment.costUSD);
    const totalFunctionCosts = result.results.map(r => 
      r.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0)
    );

    return {
      labels: networks,
      datasets: [
        {
          label: 'Deployment Cost (USD)',
          data: deploymentCosts,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f620',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Total Function Costs (USD)',
          data: totalFunctionCosts,
          borderColor: '#10b981',
          backgroundColor: '#10b98120',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: false,
        }
      ]
    };
  }, [result]);

  // Gas usage comparison (line chart)
  const gasUsageLineData = useMemo(() => {
    const networks = result.results.map(r => NETWORK_CONFIGS[r.network]?.name || r.networkName);
    const gasUsage = result.results.map(r => parseInt(r.deployment.gasUsed) / 1000); // Convert to K gas

    return {
      labels: networks,
      datasets: [{
        label: 'Deployment Gas (K)',
        data: gasUsage,
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b20',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        fillColor: '#f59e0b10',
      }]
    };
  }, [result]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('USD') || label.includes('Cost')) {
              return `${label}: ${formatCurrency(value)}`;
            }
            return `${label}: ${formatNumber(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 11, weight: '500' } },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      },
      y: {
        ticks: { 
          color: '#9ca3af', 
          font: { size: 11, weight: '500' },
          callback: function(value: any) {
            if (typeof value === 'number') {
              return formatNumber(value, 6);
            }
            return value;
          }
        },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const summaryStats = useMemo(() => {
    const totalDeploymentCost = result.results.reduce((sum, r) => sum + r.deployment.costUSD, 0);
    const totalFunctionCost = result.results.reduce((sum, r) => 
      sum + r.functions.reduce((fSum, f) => fSum + (f.estimatedCostUSD || 0), 0), 0
    );
    const avgGasPrice = result.results.reduce((sum, r) => sum + parseFloat(r.gasPrice), 0) / result.results.length;
    const totalGasUsed = result.results.reduce((sum, r) => sum + parseInt(r.deployment.gasUsed), 0);
    
    return {
      totalDeploymentCost,
      totalFunctionCost,
      avgGasPrice,
      totalGasUsed,
      networksAnalyzed: result.results.length,
      totalFunctions: result.results.reduce((sum, r) => sum + r.functions.length, 0)
    };
  }, [result]);

  return (
    <div className="space-y-8">
      {/* Enhanced Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg border border-blue-700/50 p-4">
          <div className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-1">Networks</div>
          <div className="text-2xl font-bold text-blue-400">{summaryStats.networksAnalyzed}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg border border-green-700/50 p-4">
          <div className="text-xs font-medium text-green-300 uppercase tracking-wider mb-1">Deploy Cost</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(summaryStats.totalDeploymentCost)}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg border border-purple-700/50 p-4">
          <div className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-1">Functions</div>
          <div className="text-2xl font-bold text-purple-400">{summaryStats.totalFunctions}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-lg border border-orange-700/50 p-4">
          <div className="text-xs font-medium text-orange-300 uppercase tracking-wider mb-1">Avg Gas Price</div>
          <div className="text-2xl font-bold text-orange-400">{summaryStats.avgGasPrice.toFixed(1)} Gwei</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-lg border border-cyan-700/50 p-4">
          <div className="text-xs font-medium text-cyan-300 uppercase tracking-wider mb-1">Function Cost</div>
          <div className="text-2xl font-bold text-cyan-400">{formatCurrency(summaryStats.totalFunctionCost)}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 rounded-lg border border-indigo-700/50 p-4">
          <div className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-1">Total Gas</div>
          <div className="text-2xl font-bold text-indigo-400">{(summaryStats.totalGasUsed / 1000).toFixed(0)}K</div>
        </div>
      </div>

      {/* Professional Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Function Cost Trends - Line Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
              </svg>
              Function Cost Trends Across Networks
            </h3>
            <p className="text-sm text-gray-400 mt-1">Compare function costs across different networks (scientific notation for values &lt; 0.001)</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Line data={functionCostLineData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Network Cost Comparison - Line Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Network Cost Comparison
            </h3>
            <p className="text-sm text-gray-400 mt-1">Deployment vs function costs by network</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Line data={networkCostLineData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Gas Usage Trends - Line Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Gas Usage Trends
            </h3>
            <p className="text-sm text-gray-400 mt-1">Deployment gas usage across networks</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Line data={gasUsageLineData} options={lineChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M7 7h10" />
            </svg>
            Network Analysis Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Gas</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Cost</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Price (Used)</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Price (Source)</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Token Price</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Functions</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Function Cost</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {result.results.map((networkResult, index) => {
                const config = NETWORK_CONFIGS[networkResult.network];
                const totalFunctionCost = networkResult.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0);
                return (
                  <tr key={networkResult.network} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: config?.color || '#3b82f6' }}
                        ></div>
                        <span className="text-sm font-medium text-white">{config?.name || networkResult.networkName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300 font-mono">
                      {parseInt(networkResult.deployment.gasUsed).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-400 font-mono font-semibold">
                      {formatCurrency(networkResult.deployment.costUSD)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-400 font-mono">
                      {networkResult.gasPriceBreakdown?.totalFee ? `${networkResult.gasPriceBreakdown.totalFee.toFixed(4)} Gwei` : `${parseFloat(networkResult.gasPrice).toFixed(1)} Gwei`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-400 font-mono text-xs">
                      {networkResult.gasPriceBreakdown?.source || 'mainnet'} (conf: {networkResult.gasPriceBreakdown?.confidence || 70}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-yellow-400 font-mono">
                      ${networkResult.ethPriceUSD.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-400 font-semibold">
                      {networkResult.functions.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cyan-400 font-mono font-semibold">
                      {formatCurrency(totalFunctionCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Function Details by Network */}
      {result.results.map((networkResult) => {
        const config = NETWORK_CONFIGS[networkResult.network];
        return (
          <div key={networkResult.network} className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: config?.color || '#3b82f6' }}
                ></div>
                <span>{config?.name || networkResult.networkName} - Function Analysis</span>
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                  {networkResult.functions.length} functions
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Function</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost ({config?.symbol || 'ETH'})</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost (USD)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {networkResult.functions.map((func, index) => {
                    const totalNetworkCost = networkResult.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0);
                    const percentage = totalNetworkCost > 0 ? ((func.estimatedCostUSD || 0) / totalNetworkCost * 100) : 0;
                    return (
                      <tr key={index} className="hover:bg-gray-750 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-white">
                          <code className="bg-gray-700 px-2 py-1 rounded text-xs">{func.functionName}</code>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-300 font-mono">
                          {func.gasUsed !== 'N/A' ? parseInt(func.gasUsed).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-orange-400 font-mono">
                          {networkResult.gasPriceBreakdown?.totalFee ? `${networkResult.gasPriceBreakdown.totalFee.toFixed(4)} Gwei` : `${parseFloat(networkResult.gasPrice).toFixed(1)} Gwei`}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-blue-400 font-mono">
                          {func.estimatedCostETH !== 'N/A' ? formatNumber(parseFloat(func.estimatedCostETH), 6) : 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-green-400 font-mono font-semibold">
                          {func.estimatedCostUSD > 0 ? formatCurrency(func.estimatedCostUSD) : 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-purple-400 font-medium">
                          {percentage > 0 ? `${percentage.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}