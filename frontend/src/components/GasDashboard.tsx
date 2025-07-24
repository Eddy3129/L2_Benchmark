'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import merge from 'lodash.merge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { multiChainGasService, type MultiChainGasData, type ChainConfig } from '@/lib/gasService';
import { Tooltip } from '@heroui/tooltip';
import { gasTerms } from '@/lib/dictionary';
import { apiService } from '@/lib/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// --- GasDashboard Component ---
export function GasDashboard() {
  // Default to all supported chains
  const allChains = multiChainGasService.supportedChains.map(chain => chain.id);
  const [selectedChains] = useState<string[]>(allChains);
  const [multiChainData, setMultiChainData] = useState<MultiChainGasData[]>([]);
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [ethereumBlockPrices, setEthereumBlockPrices] = useState<any>(null);

  // --- Data Fetching ---
  const fetchEthereumBlockPrices = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/gas-analyzer/ethereum-block-prices`);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setEthereumBlockPrices(result.data);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (blockPriceError) {
      console.error('Could not fetch Ethereum block prices from backend:', blockPriceError);
      setEthereumBlockPrices(null);
    }
  };

  const fetchTokenPrices = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const chainsParam = selectedChains.join(',');
      const url = `${backendUrl}/api/gas-analyzer/token-prices?chains=${chainsParam}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setTokenPrices(result.data);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (priceError) {
      console.error('Could not fetch token prices from backend:', priceError);
      setTokenPrices({});
    }
  };

  const fetchAllData = async () => {
    try {
      if (!loading) setLoading(true);
      setError(null);
      await Promise.all([
        (async () => {
          const data = await multiChainGasService.getMultiChainGasData(selectedChains);
          const validData = data.filter(d => d.gasData && d.distribution);
          setMultiChainData(validData);
        })(),
        fetchTokenPrices(),
        fetchEthereumBlockPrices(),
      ]);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Chart Configurations ---
  const baseLineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: { 
        position: 'top',
        align: 'center',
        labels: { 
          color: '#9CA3AF', // gray-400
          font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: '500' }, 
          usePointStyle: true, 
          pointStyle: 'circle',
          padding: 15,
          boxWidth: 6,
          boxHeight: 6
        } 
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
        titleColor: '#F9FAFB', 
        bodyColor: '#E5E7EB', 
        borderColor: '#4B5563', 
        borderWidth: 1, 
        cornerRadius: 6,
        titleFont: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' },
        bodyFont: { family: 'Inter, system-ui, sans-serif', size: 11 },
        padding: 8,
        displayColors: true,
        boxPadding: 3,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              const value = context.parsed.y;
              if (value > 0 && value < 0.001) {
                label += value.toExponential(2);
              } else if (value < 1) {
                label += value.toFixed(4);
              } else {
                label += value.toFixed(2);
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { 
        ticks: { 
          color: '#9CA3AF', 
          font: { family: 'Inter, system-ui, sans-serif', size: 10 },
          maxRotation: 45,
          minRotation: 0
        }, 
        grid: { 
          color: 'rgba(75, 85, 99, 0.2)', // gray-500 with alpha
          drawBorder: false
        },
        border: { color: '#4B5563' } // gray-600
      },
      y: { 
        type: 'logarithmic', 
        ticks: { 
          color: '#9CA3AF', 
          font: { family: 'Inter, system-ui, sans-serif', size: 10 },
          callback: (value: any) => { 
            if (typeof value !== 'number') return value;
            if (value === 0) return '0';
            if (value > 0 && value < 0.001) return value.toExponential(1);
            if (value < 1) return value.toFixed(3);
            if (value >= 1000) return `${(value/1000).toFixed(0)}k`; 
            return value.toFixed(1); 
          } 
        }, 
        grid: { 
          color: 'rgba(75, 85, 99, 0.2)', // gray-500 with alpha
          drawBorder: false
        },
        border: { color: '#4B5563' } // gray-600
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
        hoverBorderWidth: 2
      },
      line: {
        tension: 0.1,
        borderWidth: 2
      }
    }
  };

  const gweiChartOptions = merge({}, baseLineChartOptions, {
    scales: {
      y: {
        ticks: {
          callback: (val: any) => {
            if (typeof val !== 'number') return val;
            if (val === 0) return '0';
            if (val > 0 && val < 0.001) return `${val.toExponential(1)}`;
            if (val < 1) return `${val.toFixed(3)}`;
            return `${val.toFixed(1)}`;
          }
        }
      }
    }
  });

  const usdChartOptions = merge({}, baseLineChartOptions, {
    scales: {
      y: {
        ticks: {
          callback: (val: any) => {
            if (typeof val !== 'number') return val;
            if (val === 0) return '$0';
            if (val > 0 && val < 0.001) return `$${val.toExponential(2)}`;
            if (val < 1) return `$${val.toFixed(4)}`;
            return `$${val.toFixed(2)}`;
          }
        }
      }
    }
  });

  // --- Data Transformation for Charts ---
  const getBaseFee = (chainData: MultiChainGasData): number => 
    chainData?.gasData?.blockPrices?.[0]?.baseFeePerGas || 0;

  const getStandardPriorityFee = (chainData: MultiChainGasData): number => 
    multiChainGasService.getOptimalPriorityFee(chainData.distribution, 'standard');

  const getStandardTotalFee = (chainData: MultiChainGasData): number => {
    const baseFee = getBaseFee(chainData);
    const priorityFee = getStandardPriorityFee(chainData);
    return baseFee + priorityFee;
  };

  const gweiToUsd = (gwei: number, config: ChainConfig): number => {
    const priceKey = config.coingeckoSymbol || config.coingeckoId;
    const price = priceKey ? tokenPrices[priceKey] : undefined;
    if (!price || !gwei) return 0;
    const GWEI_IN_NATIVE_TOKEN = 1_000_000_000;
    return (gwei / GWEI_IN_NATIVE_TOKEN) * price;
  };

  const combinedFeeData = {
    labels: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.name || d.chainId),
    datasets: [
      {
        label: 'Base Fee',
        data: multiChainData.map(getBaseFee),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointBackgroundColor: '#EF4444',
      },
      {
        label: 'Priority Fee',
        data: multiChainData.map(getStandardPriorityFee),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10B981',
      },
      {
        label: 'Total Fee',
        data: multiChainData.map(getStandardTotalFee),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3B82F6',
      }
    ]
  };

  const txCostData = {
    labels: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.name || d.chainId),
    datasets: [
      {
        label: 'Tx Cost (USD)',
        data: multiChainData.map(d => {
          const config = multiChainGasService.getChainConfig(d.chainId);
          if (!config) return 0;
          const totalFeeGwei = getStandardTotalFee(d);
          return gweiToUsd(totalFeeGwei * 21000, config);
        }),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        pointBackgroundColor: '#8B5CF6',
      }
    ]
  };

  // --- Formatting Helpers ---
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(value);
  };

  const formatGwei = (value: number): string => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '0.0000';
    }
    if (value > 0 && value < 0.0001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  const formatTypeLabel = (type: string): string => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // --- Render Logic ---
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/50 p-8 rounded-xl text-center backdrop-blur-sm">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-100 mb-2">Failed to Load Dashboard</h3>
          <p className="text-red-300/80 mb-6">{error}</p>
          <button 
            onClick={fetchAllData} 
            className="bg-red-700 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-105"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 bg-gray-900 text-gray-300">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Multi-Chain Gas Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time gas price analysis across blockchain networks</p>
            <div className="flex items-center space-x-3 mt-2">
              {loading && (
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              )}
              <div className="text-xs text-gray-300 font-mono bg-gray-700 px-3 py-1.5 rounded-full border border-gray-600">
                {loading ? 'Updating...' : `Updated: ${lastUpdate.toLocaleTimeString()}`}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {ethereumBlockPrices && ethereumBlockPrices.blockPrices && ethereumBlockPrices.blockPrices[0] && (
              <>
                <div className="text-xs text-gray-300 bg-gray-700 px-3 py-1.5 rounded-full border border-gray-600">
                  ETH Base Fee: {ethereumBlockPrices.blockPrices[0].baseFeePerGas ? `${ethereumBlockPrices.blockPrices[0].baseFeePerGas.toFixed(2)} Gwei` : 'N/A'}
                </div>
                <div className="text-xs text-gray-300 bg-gray-700 px-3 py-1.5 rounded-full border border-gray-600">
                  ETH Blob Fee: {ethereumBlockPrices.blockPrices[0].blobBaseFeePerGas ? `${(ethereumBlockPrices.blockPrices[0].blobBaseFeePerGas).toExponential(2)} Gwei` : 'N/A'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-200">Gas Price Metrics</h2>
        
        {/* Charts Container - 1x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Combined Gas Fees Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Gas Fees (Gwei)</h3>
            </div>
            <div className="h-64">
              <Line options={gweiChartOptions} data={combinedFeeData} />
            </div>
          </div>

          {/* Transaction Cost Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Transaction Cost (USD)</h3>
            </div>
            <div className="h-64">
              <Line options={usdChartOptions} data={txCostData} />
            </div>
          </div>

        </div>
      </div>

      {/* Gas Analysis Table */}
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-900/80 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-gray-200">Network Gas Analysis</h2>
          <p className="text-sm text-gray-400 mt-1">Standard transaction gas metrics (21,000 gas limit)</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Network
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Base Fee (Gwei)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority Fee (Gwei)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Fee (Gwei)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tx Cost (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/50 divide-y divide-gray-700/50">
              {multiChainData.map((d, index) => {
                const config = multiChainGasService.getChainConfig(d.chainId);
                if (!config) return null;
                
                const baseFee = getBaseFee(d);
                const priorityFee = getStandardPriorityFee(d);
                const totalFee = getStandardTotalFee(d);
                const txCost = gweiToUsd(totalFee * 21000, config);

                return (
                  <tr key={d.chainId} className={`${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-900/50'} hover:bg-gray-700/50 transition-colors duration-150`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-100">{config.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        config.type === 'optimistic-rollup' ? 'bg-blue-900/50 text-blue-300' :
                        config.type === 'zk-rollup' ? 'bg-purple-900/50 text-purple-300' :
                        config.type === 'sidechain' ? 'bg-green-900/50 text-green-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {formatTypeLabel(config.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono text-gray-200">
                        {formatGwei(baseFee)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono text-gray-200">
                        {formatGwei(priorityFee)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono font-medium text-gray-100">
                        {formatGwei(totalFee)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono font-medium text-gray-100">
                        {formatCurrency(txCost)}
                      </span>
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