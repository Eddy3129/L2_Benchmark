'use client';

import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalysisResult {
  contractName: string;
  results: NetworkResult[];
  timestamp: string;
}

interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
  };
  functions: GasEstimate[];
  gasPrice: string;
  ethPriceUSD: number;
  gasPriceBreakdown: {
    baseFee: number;
    priorityFee: number;
    totalFee: number;
    confidence: number;
    source: string;
  };
}

interface GasEstimate {
  functionName: string;
  gasUsed: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
}

const NETWORK_CONFIG: { [key: string]: { name: string; color: string; symbol: string } } = {
  arbitrumSepolia: { name: 'Arbitrum Sepolia', color: '#2563eb', symbol: 'ETH' },
  optimismSepolia: { name: 'Optimism Sepolia', color: '#dc2626', symbol: 'ETH' },
  baseSepolia: { name: 'Base Sepolia', color: '#1d4ed8', symbol: 'ETH' },
  polygonAmoy: { name: 'Polygon Amoy', color: '#7c3aed', symbol: 'POL' },
};

interface GasAnalysisResultsProps {
  result: AnalysisResult;
}

export function GasAnalysisResults({ result }: GasAnalysisResultsProps) {
  const chartData = useMemo(() => {
    const networks = result.results.map(r => NETWORK_CONFIG[r.network]?.name || r.networkName);
    const deploymentCosts = result.results.map(r => r.deployment.costUSD);
    const avgFunctionCosts = result.results.map(r => {
      const validFunctions = r.functions.filter(f => f.estimatedCostUSD > 0);
      return validFunctions.length > 0 
        ? validFunctions.reduce((sum, f) => sum + f.estimatedCostUSD, 0) / validFunctions.length
        : 0;
    });

    return {
      labels: networks,
      datasets: [
        {
          label: 'Deployment Cost (USD)',
          data: deploymentCosts,
          backgroundColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color + '40' || '#3b82f640'),
          borderColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color || '#3b82f6'),
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Avg Function Cost (USD)',
          data: avgFunctionCosts,
          backgroundColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color + '20' || '#3b82f620'),
          borderColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color || '#3b82f6'),
          borderWidth: 2,
          borderRadius: 4,
        }
      ]
    };
  }, [result]);

  const gasUsageData = useMemo(() => {
    const networks = result.results.map(r => NETWORK_CONFIG[r.network]?.name || r.networkName);
    const deploymentGas = result.results.map(r => parseInt(r.deployment.gasUsed) / 1000); // Convert to K gas
    
    return {
      labels: networks,
      datasets: [{
        label: 'Deployment Gas (K)',
        data: deploymentGas,
        backgroundColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color + '60' || '#3b82f660'),
        borderColor: result.results.map(r => NETWORK_CONFIG[r.network]?.color || '#3b82f6'),
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      }]
    };
  }, [result]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: { size: 12 },
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      }
    }
  };

  const summaryStats = useMemo(() => {
    const totalDeploymentCost = result.results.reduce((sum, r) => sum + r.deployment.costUSD, 0);
    const avgDeploymentCost = totalDeploymentCost / result.results.length;
    const totalFunctions = result.results.reduce((sum, r) => sum + r.functions.length, 0);
    const avgGasPrice = result.results.reduce((sum, r) => sum + parseFloat(r.gasPrice), 0) / result.results.length;
    
    return {
      avgDeploymentCost,
      totalFunctions,
      avgGasPrice,
      networksAnalyzed: result.results.length
    };
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Networks</div>
          <div className="text-xl font-bold text-blue-400">{summaryStats.networksAnalyzed}</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Deploy Cost</div>
          <div className="text-xl font-bold text-green-400">${summaryStats.avgDeploymentCost.toFixed(3)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Functions</div>
          <div className="text-xl font-bold text-purple-400">{summaryStats.totalFunctions}</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Gas Price</div>
          <div className="text-xl font-bold text-orange-400">{summaryStats.avgGasPrice.toFixed(1)} Gwei</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Cost Comparison (USD)</h3>
          </div>
          <div className="p-4">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Gas Usage Trends</h3>
          </div>
          <div className="p-4">
            <div className="h-64">
              <Line data={gasUsageData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Detailed Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Network</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Gas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Deploy Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Token Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Functions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {result.results.map((networkResult, index) => {
                const config = NETWORK_CONFIG[networkResult.network];
                return (
                  <tr key={networkResult.network} className="hover:bg-gray-750">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: config?.color || '#3b82f6' }}
                        ></div>
                        <span className="text-sm font-medium text-white">{config?.name || networkResult.networkName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-300 font-mono">
                      {parseInt(networkResult.deployment.gasUsed).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-green-400 font-mono">
                      ${networkResult.deployment.costUSD.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-blue-400 font-mono">
                      {parseFloat(networkResult.gasPrice).toFixed(1)} Gwei
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-yellow-400 font-mono">
                      ${networkResult.ethPriceUSD.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-purple-400">
                      {networkResult.functions.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Function Details */}
      {result.results.map((networkResult) => {
        const config = NETWORK_CONFIG[networkResult.network];
        return (
          <div key={networkResult.network} className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: config?.color || '#3b82f6' }}
                ></div>
                <span>{config?.name || networkResult.networkName} - Function Analysis</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Function</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gas Used</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost ({config?.symbol || 'ETH'})</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {networkResult.functions.map((func, index) => (
                    <tr key={index} className="hover:bg-gray-750">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        {func.functionName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-300 font-mono">
                        {func.gasUsed !== 'N/A' ? parseInt(func.gasUsed).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-blue-400 font-mono">
                        {func.estimatedCostETH !== 'N/A' ? parseFloat(func.estimatedCostETH).toFixed(6) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-green-400 font-mono">
                        {func.estimatedCostUSD > 0 ? `$${func.estimatedCostUSD.toFixed(4)}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}