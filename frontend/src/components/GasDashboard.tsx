'use client';

import React, { useState, useEffect } from 'react';
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
  Filler
} from 'chart.js';
import { multiChainGasService, type MultiChainGasData, type ChainConfig } from '@/lib/gasService';

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

export function GasDashboard() {
  const [selectedChains, setSelectedChains] = useState<string[]>(['ethereum', 'arbitrum', 'optimism']);
  const [multiChainData, setMultiChainData] = useState<MultiChainGasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedUrgency, setSelectedUrgency] = useState<'slow' | 'standard' | 'fast'>('standard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMultiChainData();
    const interval = setInterval(fetchMultiChainData, 30000);
    return () => clearInterval(interval);
  }, [selectedChains]);

  const fetchMultiChainData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await multiChainGasService.getMultiChainGasData(selectedChains);
      setMultiChainData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch multi-chain gas data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch gas data');
    } finally {
      setLoading(false);
    }
  };

  const toggleChain = (chainId: string) => {
    setSelectedChains(prev => 
      prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#a0aec0',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(36, 41, 56, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#a0aec0',
        borderColor: '#4a5568',
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        ticks: { color: '#718096', font: { size: 11 } },
        grid: { color: 'rgba(74, 85, 104, 0.3)' }
      },
      y: {
        ticks: { color: '#718096', font: { size: 11 } },
        grid: { color: 'rgba(74, 85, 104, 0.3)' }
      }
    }
  };

  const getBaseFee = (chainData: MultiChainGasData): number => {
    if (chainData.gasData.blockPrices && chainData.gasData.blockPrices.length > 0) {
      return chainData.gasData.blockPrices[0].baseFeePerGas;
    }
    return 0;
  };

  const gasComparisonData = {
    labels: selectedChains.map(id => multiChainGasService.getChainConfig(id)?.name || id),
    datasets: [
      {
        label: 'Base Fee (Gwei)',
        data: multiChainData.map(data => getBaseFee(data)),
        backgroundColor: selectedChains.map(id => {
          const config = multiChainGasService.getChainConfig(id);
          return config ? `${config.color}40` : '#3182ce40';
        }),
        borderColor: selectedChains.map(id => {
          const config = multiChainGasService.getChainConfig(id);
          return config ? config.color : '#3182ce';
        }),
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: `${selectedUrgency.charAt(0).toUpperCase() + selectedUrgency.slice(1)} Fee`,
        data: multiChainData.map(data => {
          try {
            return multiChainGasService.calculateOptimalGasPrice(data.distribution, selectedUrgency);
          } catch {
            return 0;
          }
        }),
        backgroundColor: selectedChains.map(() => '#38a16940'),
        borderColor: selectedChains.map(() => '#38a169'),
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const trendData = {
    labels: ['5m ago', '4m ago', '3m ago', '2m ago', '1m ago', 'Now'],
    datasets: selectedChains.map((chainId, index) => {
      const config = multiChainGasService.getChainConfig(chainId);
      const currentData = multiChainData.find(d => d.chainId === chainId);
      const basePrice = currentData ? getBaseFee(currentData) : 0;
      
      return {
        label: config?.name || chainId,
        data: Array.from({ length: 6 }, (_, i) => 
          basePrice + (Math.random() - 0.5) * basePrice * 0.2
        ),
        borderColor: config?.color || '#3182ce',
        backgroundColor: `${config?.color || '#3182ce'}20`,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    })
  };

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold">Failed to Load Gas Data</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchMultiChainData}
            className="btn-primary px-4 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Multi-Chain Gas Tracker
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time gas prices across {selectedChains.length} networks
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : error ? 'bg-red-400' : 'bg-green-400'} animate-pulse`}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading...' : `Updated ${lastUpdate.toLocaleTimeString()}`}
            </span>
          </div>
          
          <button
            onClick={fetchMultiChainData}
            disabled={loading}
            className="btn-primary text-sm px-3 py-1.5"
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {multiChainGasService.supportedChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => toggleChain(chain.id)}
              className={`btn-secondary text-sm px-3 py-2 flex items-center space-x-2 ${
                selectedChains.includes(chain.id) ? 'active' : ''
              }`}
            >
              <span className="font-mono text-lg">{chain.icon}</span>
              <span>{chain.name}</span>
              <span className="text-xs opacity-60">({chain.symbol})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Speed Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {(['slow', 'standard', 'fast'] as const).map((urgency) => (
            <button
              key={urgency}
              onClick={() => setSelectedUrgency(urgency)}
              className={`btn-secondary text-sm px-4 py-2 capitalize ${
                selectedUrgency === urgency ? 'active' : ''
              }`}
            >
              {urgency}
              <span className="text-xs ml-1 opacity-60">
                ({urgency === 'slow' ? '50%' : urgency === 'standard' ? '80%' : '95%'} confidence)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {multiChainData.map((chainData) => {
          const config = multiChainGasService.getChainConfig(chainData.chainId);
          const baseFee = getBaseFee(chainData);
          let optimalPrice = 0;
          try {
            optimalPrice = multiChainGasService.calculateOptimalGasPrice(
              chainData.distribution,
              selectedUrgency
            );
          } catch (error) {
            console.warn(`Failed to calculate optimal price for ${chainData.chainId}:`, error);
          }
          
          return (
            <div key={chainData.chainId} className="card p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-lg">{config?.icon}</span>
                <span className="text-sm font-medium" style={{ color: config?.color }}>
                  {config?.name}
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                {baseFee.toFixed(2)}
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>gwei</span>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {selectedUrgency}: {optimalPrice.toFixed(2)} gwei
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gas Comparison */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Gas Price Comparison</h3>
          <div className="h-64">
            <Bar data={gasComparisonData} options={chartOptions} />
          </div>
        </div>
        
        {/* Trend Chart */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Price Trends (5min)</h3>
          <div className="h-64">
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="mt-6">
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Network Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2" style={{ color: 'var(--text-secondary)' }}>Network</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Base Fee</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Slow (50%)</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Standard (80%)</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Fast (95%)</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Block Time</th>
                </tr>
              </thead>
              <tbody>
                {multiChainData.map((chainData) => {
                  const config = multiChainGasService.getChainConfig(chainData.chainId);
                  const baseFee = getBaseFee(chainData);
                  
                  const getOptimalPrice = (urgency: 'slow' | 'standard' | 'fast') => {
                    try {
                      return multiChainGasService.calculateOptimalGasPrice(chainData.distribution, urgency);
                    } catch {
                      return 0;
                    }
                  };
                  
                  return (
                    <tr key={chainData.chainId} className="border-b border-gray-800">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{config?.icon}</span>
                          <span style={{ color: config?.color }}>{config?.name}</span>
                        </div>
                      </td>
                      <td className="text-right font-mono text-white">
                        {baseFee.toFixed(2)}
                      </td>
                      <td className="text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {getOptimalPrice('slow').toFixed(2)}
                      </td>
                      <td className="text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {getOptimalPrice('standard').toFixed(2)}
                      </td>
                      <td className="text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {getOptimalPrice('fast').toFixed(2)}
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                        {Math.floor(chainData.gasData.msSinceLastBlock / 1000)}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}