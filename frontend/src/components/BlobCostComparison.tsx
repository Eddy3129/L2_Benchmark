'use client'

import React, { useState } from 'react';
import { apiService } from '../lib/api';
import { NETWORK_CONFIGS, getNetworkColor } from '../utils/networkConfig';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface BlobCostResult {
  network: string;
  networkName: string;
  blobTransaction: {
    blobsUsed: number;
    blobDataSize: number;
    regularGasUsed: number;
    blobGasUsed: number;
    regularGasCostETH: string;
    blobGasCostETH: string;
    totalCostETH: string;
    totalCostUSD: number;
    costPerKB: number;
    costPerL2Transaction: number;
  };
  gasBreakdown: {
    regularGasPrice: number;
    estimatedBlobGasPrice: number;
    tokenPriceUSD: number;
  };
  comparison: {
    vsTraditionalCalldata: {
      gasUsed: number;
      costETH: string;
      costUSD: number;
      costPerKB: number;
    };
    efficiency: {
      dataCompressionRatio: number;
      costReductionVsCalldata: number;
    };
  };
}

interface BlobAnalysisResult {
  blobDataSize: number;
  results: BlobCostResult[];
  timestamp: string;
  analysis: string;
}

const BlobCostComparison: React.FC = () => {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['arbitrum', 'optimism', 'base']);
  const [blobDataSize, setBlobDataSize] = useState<number>(131072); // 128KB default
  const [confidenceLevel, setConfidenceLevel] = useState<number>(70);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [results, setResults] = useState<BlobAnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  // EIP-4844 supporting L2 networks
  const supportedNetworks = [
    'arbitrum',
    'optimism', 
    'base',
    'polygon',
    'zksync-era'
  ];

  const handleNetworkToggle = (networkId: string) => {
    setSelectedNetworks(prev => 
      prev.includes(networkId)
        ? prev.filter(id => id !== networkId)
        : [...prev, networkId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedNetworks.length === 0) {
      setError('Please select at least one L2 network');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      const result = await apiService.compareBlobCosts({
        l2Networks: selectedNetworks,
        blobDataSize,
        confidenceLevel,
        saveToDatabase: true
      });
      
      // Calculate cost reduction vs calldata for each network
      result.results.forEach((networkResult: BlobCostResult) => {
        const blobCost = networkResult.blobTransaction.totalCostUSD;
        const calldataCost = networkResult.comparison.vsTraditionalCalldata.costUSD;
        networkResult.comparison.efficiency.costReductionVsCalldata = 
          ((calldataCost - blobCost) / calldataCost) * 100;
      });
      
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  // Chart data for blob costs comparison
  const blobCostChartData = results ? {
    labels: results.results.map(r => NETWORK_CONFIGS[r.network]?.name || r.networkName),
    datasets: [
      {
        label: 'Blob Transaction Cost (USD)',
        data: results.results.map(r => r.blobTransaction.totalCostUSD),
        backgroundColor: results.results.map((r, i) => getNetworkColor(r.network, i)),
        borderColor: results.results.map((r, i) => getNetworkColor(r.network, i)),
        borderWidth: 1,
      },
      {
        label: 'Traditional Calldata Cost (USD)',
        data: results.results.map(r => r.comparison.vsTraditionalCalldata.costUSD),
        backgroundColor: results.results.map((r, i) => getNetworkColor(r.network, i) + '40'),
        borderColor: results.results.map((r, i) => getNetworkColor(r.network, i)),
        borderWidth: 1,
        borderDash: [5, 5],
      }
    ]
  } : null;

  // Chart data for cost per L2 transaction
  const costPerTxChartData = results ? {
    labels: results.results.map(r => NETWORK_CONFIGS[r.network]?.name || r.networkName),
    datasets: [
      {
        label: 'Cost per L2 Transaction (USD)',
        data: results.results.map(r => r.blobTransaction.costPerL2Transaction),
        backgroundColor: results.results.map((r, i) => getNetworkColor(r.network, i)),
        borderColor: results.results.map((r, i) => getNetworkColor(r.network, i)),
        borderWidth: 2,
        fill: false,
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb' // gray-200
        }
      },
      title: {
        display: true,
        text: 'EIP-4844 Blob Transaction Cost Analysis',
        color: '#f9fafb' // gray-50
      },
      tooltip: {
        backgroundColor: '#374151', // gray-700
        titleColor: '#f9fafb', // gray-50
        bodyColor: '#e5e7eb', // gray-200
        borderColor: '#6b7280', // gray-500
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#e5e7eb' // gray-200
        },
        grid: {
          color: '#4b5563' // gray-600
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#e5e7eb', // gray-200
          callback: function(value: any) {
            return formatCurrency(value);
          }
        },
        grid: {
          color: '#4b5563' // gray-600
        }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          EIP-4844 Blob Cost Comparison
        </h1>
        <p className="text-gray-300 mb-6">
          Compare blob transaction costs across different Layer 2 networks using testnet RPCs with mainnet pricing.
        </p>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Network Selection */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-3">
              Select L2 Networks (EIP-4844 Supported)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {supportedNetworks.map(networkId => {
                const config = NETWORK_CONFIGS[networkId];
                if (!config) return null;
                
                return (
                  <label key={networkId} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNetworks.includes(networkId)}
                      onChange={() => handleNetworkToggle(networkId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    ></span>
                    <span className="text-sm font-medium text-gray-300">
                      {config.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blob Data Size (bytes)
              </label>
              <input
                type="number"
                value={blobDataSize}
                onChange={(e) => setBlobDataSize(Number(e.target.value))}
                min="1"
                max="786432" // 6 blobs * 128KB
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Max: 786,432 bytes (6 blobs × 128KB)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Gas Price Confidence Level (%)
              </label>
              <input
                type="number"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                min="50"
                max="99"
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || selectedNetworks.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? 'Analyzing Blob Costs...' : 'Analyze Blob Costs'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Analysis Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-900/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300">Blob Data Size</h3>
                <p className="text-2xl font-bold text-blue-100">
                  {formatNumber(results.blobDataSize / 1024, 0)} KB
                </p>
              </div>
              <div className="bg-green-900/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-300">Networks Analyzed</h3>
                <p className="text-2xl font-bold text-green-100">{results.results.length}</p>
              </div>
              <div className="bg-purple-900/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-300">Cheapest Network</h3>
                <p className="text-lg font-bold text-purple-100">
                  {results.results.reduce((min, current) => 
                    current.blobTransaction.totalCostUSD < min.blobTransaction.totalCostUSD ? current : min
                  ).networkName}
                </p>
              </div>
              <div className="bg-orange-900/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-300">Max Savings vs Calldata</h3>
                <p className="text-2xl font-bold text-orange-100">
                  {formatNumber(Math.max(...results.results.map(r => r.comparison.efficiency.costReductionVsCalldata)), 1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Cost Comparison</h3>
              {blobCostChartData && <Bar data={blobCostChartData} options={chartOptions} />}
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Cost per L2 Transaction</h3>
              {costPerTxChartData && <Line data={costPerTxChartData} options={chartOptions} />}
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Detailed Analysis</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Blobs Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Blob Cost (USD)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Calldata Cost (USD)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Savings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Cost per L2 Tx
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-600">
                  {results.results.map((result, index) => (
                    <tr key={result.network} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getNetworkColor(result.network, index) }}
                          ></span>
                          <span className="text-sm font-medium text-white">
                            {result.networkName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {result.blobTransaction.blobsUsed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(result.blobTransaction.totalCostUSD)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(result.comparison.vsTraditionalCalldata.costUSD)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          result.comparison.efficiency.costReductionVsCalldata > 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {result.comparison.efficiency.costReductionVsCalldata > 0 ? '+' : ''}
                          {formatNumber(result.comparison.efficiency.costReductionVsCalldata, 1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(result.blobTransaction.costPerL2Transaction)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.results.map((result, index) => (
                <div key={result.network} className="border border-gray-600 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getNetworkColor(result.network, index) }}
                    ></span>
                    {result.networkName}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Regular Gas:</span>
                      <span className="font-medium text-gray-300">{formatNumber(result.gasBreakdown.regularGasPrice, 2)} gwei</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Blob Gas:</span>
                      <span className="font-medium text-gray-300">{formatNumber(result.gasBreakdown.estimatedBlobGasPrice, 2)} gwei</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Regular Gas Used:</span>
                      <span className="font-medium text-gray-300">{formatNumber(result.blobTransaction.regularGasUsed, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Blob Gas Used:</span>
                      <span className="font-medium text-gray-300">{formatNumber(result.blobTransaction.blobGasUsed, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Token Price:</span>
                      <span className="font-medium text-gray-300">{formatCurrency(result.gasBreakdown.tokenPriceUSD)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlobCostComparison;