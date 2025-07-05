import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

import { NetworkResult } from '@/types/shared';
import { NETWORK_CONFIGS, getNetworkDisplayName } from '@/utils/networkConfig';
import { formatCurrency, formatGasUsed } from '@/utils/gasUtils';
import { TrendingDown, TrendingUp, DollarSign, Zap, Network, BarChart3 } from 'lucide-react';

interface AnalysisResult {
  contractName: string;
  results: NetworkResult[];
  timestamp: string;
}

interface UnifiedGasResultsProps {
  result: AnalysisResult;
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function UnifiedGasResults({ result }: UnifiedGasResultsProps) {
  // Calculate baseline (cheapest network) for comparison
  const baselineNetwork = useMemo(() => {
    return result.results.reduce((cheapest, current) => 
      current.deployment.costUSD < cheapest.deployment.costUSD ? current : cheapest
    );
  }, [result]);

  // Deployment cost chart (USD bars only)
  const deploymentCostData = useMemo(() => {
    const networks = result.results.map(r => getNetworkDisplayName(r.network));
    const costs = result.results.map(r => r.deployment.costUSD);
    const colors = result.results.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);

    return {
      labels: networks,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Deployment Cost (USD)',
          data: costs,
          backgroundColor: colors.map(color => color + '80'),
          borderColor: colors,
          borderWidth: 1,
          yAxisID: 'y',
        }
      ]
    };
  }, [result]);

  // Function cost chart (USD bars only)
  const functionCostData = useMemo(() => {
    const networks = result.results.map(r => getNetworkDisplayName(r.network));
    const functionCosts = result.results.map(r => 
      r.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0)
    );
    const colors = result.results.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);

    return {
      labels: networks,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Function Cost (USD)',
          data: functionCosts,
          backgroundColor: colors.map(color => color + '80'),
          borderColor: colors,
          borderWidth: 1,
          yAxisID: 'y',
        }
      ]
    };
  }, [result]);



  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
            return `${label}: $${value.toFixed(2)}`;
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'USD ($)',
          color: '#9ca3af',
          font: { size: 12, weight: '500' }
        },
        ticks: { 
          color: '#9ca3af', 
          font: { size: 11, weight: '500' },
          callback: function(value: any) {
            return '$' + value.toFixed(2);
          }
        },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      }
    },
  };

  // Calculate savings compared to baseline
  const getSavings = (networkResult: NetworkResult) => {
    const savings = baselineNetwork.deployment.costUSD - networkResult.deployment.costUSD;
    const percentage = baselineNetwork.deployment.costUSD > 0 ? 
      (savings / baselineNetwork.deployment.costUSD) * 100 : 0;
    return { savings, percentage };
  };

  const getSavingsColor = (savings: number) => {
    if (savings > 0) return 'text-green-400';
    if (savings < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSavingsIcon = (savings: number) => {
    return savings > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />;
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalDeploymentCost = result.results.reduce((sum, r) => sum + r.deployment.costUSD, 0);
    const totalFunctionCost = result.results.reduce((sum, r) => 
      sum + r.functions.reduce((funcSum, f) => funcSum + (f.estimatedCostUSD || 0), 0), 0
    );
    const avgGasPrice = result.results.reduce((sum, r) => sum + parseFloat(r.gasPrice), 0) / result.results.length;
    const totalDeploymentGas = result.results.reduce((sum, r) => sum + parseInt(r.deployment.gasUsed), 0);
    
    // Calculate max savings
    const deploymentCosts = result.results.map(r => r.deployment.costUSD);
    const minCost = Math.min(...deploymentCosts);
    const maxCost = Math.max(...deploymentCosts);
    const maxSavings = maxCost - minCost;

    return {
      totalDeploymentCost,
      totalFunctionCost,
      avgGasPrice,
      totalDeploymentGas,
      networksAnalyzed: result.results.length,
      totalFunctions: result.results.reduce((sum, r) => sum + r.functions.length, 0),
      maxSavings,
      cheapestNetwork: baselineNetwork
    };
  }, [result, baselineNetwork]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Gas Cost Analysis</h2>
        <p className="text-gray-600">Contract: {result.contractName}</p>
        <p className="text-sm text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg border border-blue-700/50 p-4">
          <div className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-1">Networks</div>
          <div className="text-2xl font-bold text-blue-400">{summaryStats.networksAnalyzed}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg border border-green-700/50 p-4">
            <div className="text-xs font-medium text-green-300 uppercase tracking-wider mb-1">Deploy Cost</div>
            <div className="text-lg font-bold text-green-400">${summaryStats.totalDeploymentCost.toFixed(2)}</div>
          </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg border border-purple-700/50 p-4">
          <div className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-1">Functions</div>
          <div className="text-2xl font-bold text-purple-400">{summaryStats.totalFunctions}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-lg border border-orange-700/50 p-4">
          <div className="text-xs font-medium text-orange-300 uppercase tracking-wider mb-1">Avg Gas Price</div>
          <div className="text-lg font-bold text-orange-400">{summaryStats.avgGasPrice.toFixed(2)} Gwei</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-lg border border-cyan-700/50 p-4">
          <div className="text-xs font-medium text-cyan-300 uppercase tracking-wider mb-1">Function Cost</div>
          <div className="text-lg font-bold text-cyan-400">${summaryStats.totalFunctionCost.toFixed(2)}</div>
          <div className="text-xs text-cyan-300">Avg: {summaryStats.avgGasPrice.toFixed(2)} Gwei</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 rounded-lg border border-yellow-700/50 p-4">
          <div className="text-xs font-medium text-yellow-300 uppercase tracking-wider mb-1">Deploy Gas</div>
          <div className="text-lg font-bold text-yellow-400">{(summaryStats.totalDeploymentGas / summaryStats.networksAnalyzed).toLocaleString()}</div>
          <div className="text-xs text-yellow-300">Avg per network</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 rounded-lg border border-indigo-700/50 p-4">
          <div className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-1">Max Savings</div>
          <div className="text-lg font-bold text-indigo-400">${summaryStats.maxSavings.toFixed(2)}</div>
        </div>
      </div>

      {/* Cost Comparison Summary */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Cost Comparison Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {result.results.map((networkResult, index) => {
            const savings = getSavings(networkResult);
            const config = NETWORK_CONFIGS[networkResult.network];
            return (
              <div key={`cost-summary-${networkResult.network}-${index}`} className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: config?.color || '#3b82f6' }}
                  ></div>
                  <p className="text-gray-300 text-sm font-medium">{getNetworkDisplayName(networkResult.network)}</p>
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(networkResult.deployment.costUSD)}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getSavingsIcon(savings.savings)}
                  <span className={`text-sm font-medium ${getSavingsColor(savings.savings)}`}>
                    {savings.savings > 0 ? 'Save' : 'Pay'} {formatCurrency(Math.abs(savings.savings))}
                  </span>
                </div>
                <div className={`text-xs ${getSavingsColor(savings.savings)}`}>
                  {savings.percentage > 0 ? '-' : '+'}{Math.abs(savings.percentage).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Cost Bar Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Deployment Costs
            </h3>
            <p className="text-sm text-gray-400 mt-1">Contract deployment costs across networks (USD)</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Bar data={deploymentCostData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Function Cost Bar Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Function Costs
            </h3>
            <p className="text-sm text-gray-400 mt-1">Total function interaction costs (USD)</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Bar data={functionCostData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Network Analysis Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Network className="w-5 h-5" />
            Network Analysis Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Gas</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Cost</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Price</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Functions</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Function Cost</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Savings vs Cheapest</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {result.results.map((networkResult, index) => {
                const config = NETWORK_CONFIGS[networkResult.network];
                const totalFunctionCost = networkResult.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0);
                const savings = getSavings(networkResult);
                return (
                  <tr key={`network-${networkResult.network}-${index}`} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: config?.color || '#3b82f6' }}
                        ></div>
                        <span className="text-sm font-medium text-white">{getNetworkDisplayName(networkResult.network)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300 font-mono">
                      {parseInt(networkResult.deployment.gasUsed).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-400 font-mono font-semibold">
                      {formatCurrency(networkResult.deployment.costUSD)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-400 font-mono">
                      {parseFloat(networkResult.gasPrice).toFixed(2)} Gwei
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-400 font-semibold">
                      {networkResult.functions.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cyan-400 font-mono font-semibold">
                      {formatCurrency(totalFunctionCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                        {getSavingsIcon(savings.savings)}
                        <span className={getSavingsColor(savings.savings)}>
                          {savings.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}