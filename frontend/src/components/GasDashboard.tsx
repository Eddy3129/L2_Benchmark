'use client';

import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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



// --- Interfaces ---
interface BlobCostResult {
  network: string;
  networkName: string;
  blobTransaction: {
    totalCostUSD: number;
    costPerL2Transaction: number;
    blobsUsed: number;
    regularGasUsed: number;
    blobGasUsed: number;
  };
  comparison: {
    vsTraditionalCalldata: {
      costUSD: number;
    };
    efficiency: {
      costReductionVsCalldata: number;
    };
  };
  gasBreakdown: {
    regularGasPrice: number;
    estimatedBlobGasPrice: number;
    tokenPriceUSD: number;
  };
}

interface BlobAnalysisResult {
  blobDataSize: number;
  results: BlobCostResult[];
}

// --- GasDashboard Component ---
export function GasDashboard() {
  const [selectedChains, setSelectedChains] = useState<string[]>(['polygon', 'arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era', 'scroll', 'ink', 'linea']);
  const [multiChainData, setMultiChainData] = useState<MultiChainGasData[]>([]);
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<BlobAnalysisResult | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);

  // --- Data Fetching ---
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
      // Fallback to empty prices if backend fails
      setTokenPrices({});
    }
  };

  const fetchBlobData = async () => {
    try {
      setBlobLoading(true);
      const eip4844Networks = ['arbitrum', 'optimism', 'base', 'zksync-era', 'scroll', 'linea', 'ink'];
      const supportedNetworks = selectedChains.filter(chain => eip4844Networks.includes(chain));
      
      if (supportedNetworks.length === 0) {
        setBlobData(null);
        return;
      }

      const blobRequest = {
        l2Networks: supportedNetworks,
        blobDataSize: 131072, // Standard 128KB blob
        confidenceLevel: 90,
        saveToDatabase: false
      };
      
      const result = await apiService.compareBlobCosts(blobRequest);
      
      setBlobData(result);
    } catch (err) {
      console.error('Failed to fetch blob data:', err);
    } finally {
      setBlobLoading(false);
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
        fetchBlobData()
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
  }, [selectedChains]);

  const toggleChain = (chainId: string) => {
    setSelectedChains(prev => prev.includes(chainId) ? prev.filter(id => id !== chainId) : [...prev, chainId]);
  };

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
          color: '#F9FAFB', 
          font: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '600' }, 
          usePointStyle: true, 
          pointStyle: 'circle',
          padding: 20,
          boxWidth: 14,
          boxHeight: 14
        } 
      },
      tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.98)', 
          titleColor: '#F9FAFB', 
          bodyColor: '#E5E7EB', 
          borderColor: '#6B7280', 
          borderWidth: 2, 
          cornerRadius: 8,
          titleFont: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '600' },
          bodyFont: { family: 'Inter, system-ui, sans-serif', size: 12 },
          padding: 12,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                const value = context.parsed.y;
                if (value < 0.001) {
                  label += value.toExponential(2);
                } else if (value < 1) {
                  label += value.toPrecision(3);
                } else {
                  label += value.toFixed(3);
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
          color: '#E5E7EB', 
          font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '500' },
          maxRotation: 45,
          minRotation: 0
        }, 
        grid: { 
          color: 'rgba(156, 163, 175, 0.25)', 
          lineWidth: 1,
          drawBorder: false
        },
        border: {
          color: '#9CA3AF'
        }
      },
      y: { 
        type: 'logarithmic', 
        ticks: { 
          color: '#E5E7EB', 
          font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '500' },
          callback: (val) => { 
            if(typeof val === 'number') { 
              if (val < 0.001) return val.toExponential(1); 
              if (val < 1) return val.toPrecision(3); 
              if (val >= 1000) return `${(val/1000).toFixed(1)}k`; 
              return val.toFixed(3); 
            } 
            return val; 
          } 
        }, 
        grid: { 
          color: 'rgba(156, 163, 175, 0.2)', 
          lineWidth: 1,
          drawBorder: false
        },
        border: {
          color: '#9CA3AF'
        }
      }
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 9,
        borderWidth: 3,
        backgroundColor: '#FFFFFF',
        hoverBorderWidth: 4
      },
      line: {
        tension: 0.15,
        borderWidth: 3
      }
    }
  };

  const gweiChartOptions: ChartOptions<'line'> = {
    ...baseLineChartOptions,
    scales: {
      ...baseLineChartOptions.scales,
      y: {
        ...baseLineChartOptions.scales?.y,
        type: 'linear',
        beginAtZero: true,
        ticks: {
          ...baseLineChartOptions.scales?.y?.ticks,
          callback: (val) => {
            if (typeof val === 'number') {
              if (val < 0.001) return `${val.toExponential(2)} Gwei`;
              if (val >= 1000) return `${(val/1000).toFixed(1)}k Gwei`;
              return `${val.toFixed(3)} Gwei`;
            }
            return val;
          }
        }
      }
    },
    plugins: {
        ...baseLineChartOptions.plugins,
        tooltip: {
            ...baseLineChartOptions.plugins?.tooltip,
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  const value = context.parsed.y;
                  if (value < 0.001) {
                    label += `${value.toExponential(2)} Gwei`;
                  } else if (value < 1) {
                    label += `${value.toPrecision(3)} Gwei`;
                  } else {
                    label += `${value.toFixed(3)} Gwei`;
                  }
                }
                return label;
              }
            }
        }
    }
  };

  const usdChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
        titleColor: '#F9FAFB', 
        bodyColor: '#D1D5DB', 
        borderColor: '#374151', 
        borderWidth: 1, 
        cornerRadius: 12,
        titleFont: { family: 'Lekton', size: 11 },
        bodyFont: { family: 'Lekton', size: 10 },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || 'Cost';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += `$${context.parsed.y.toFixed(4)}`;
            return label;
          }
        }
      }
    },
    scales: {
      x: { 
        ticks: { color: '#9CA3AF', font: { family: 'Lekton', size: 9 } }, 
        grid: { display: false } 
      },
      y: { 
        type: 'linear', 
        ticks: { 
          color: '#9CA3AF', 
          font: { family: 'Lekton', size: 9 },
          callback: (val) => `$${Number(val).toFixed(2)}` 
        }, 
        grid: { color: '#374151', lineWidth: 0.5 } 
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
        backgroundColor: '#3B82F6',
        borderColor: '#ffffff',
        borderWidth: 1
      },
      line: {
        tension: 0.2,
        borderWidth: 1
      }
    }
  };

  // --- Data Transformation for Charts ---
  const getBaseFee = (chainData: MultiChainGasData): number => chainData?.gasData?.blockPrices?.[0]?.baseFeePerGas || 0;
  const getOptimalPriorityFee = (chainData: MultiChainGasData, urgency: 'slow' | 'standard' | 'fast'): number => multiChainGasService.getOptimalPriorityFee(chainData.distribution, urgency);
  const getOptimalTotalFee = (chainData: MultiChainGasData, urgency: 'slow' | 'standard' | 'fast'): number => multiChainGasService.calculateOptimalGasPrice(chainData.distribution, urgency);
  const gweiToUsd = (gwei: number, config: ChainConfig): number => {
    const priceKey = config.coingeckoSymbol || config.coingeckoId;
    const price = priceKey ? tokenPrices[priceKey] : undefined;
    if (!price || !gwei) return 0;
    const GWEI_IN_NATIVE_TOKEN = 1_000_000_000;
    return (gwei / GWEI_IN_NATIVE_TOKEN) * price;
  };

  const gasCompositionData = {
    labels: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.name),
    datasets: [
      { 
        label: `Base Fee (Gwei)`, 
        data: multiChainData.map(data => getBaseFee(data)), 
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: false,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#2563EB',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#2563EB',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 4,
        tension: 0.2,
        borderWidth: 3
      },
      { 
        label: `Priority Fee (Gwei)`, 
        data: multiChainData.map(data => getOptimalPriorityFee(data, 'standard')), 
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        fill: false,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#DC2626',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#DC2626',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 4,
        tension: 0.2,
        borderWidth: 3
      }
    ]
  };
  
  const txCostComparisonData = {
    labels: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.name),
    datasets: [{
      label: 'Standard Transaction Cost (USD)',
      data: multiChainData.map(d => {
        const config = multiChainGasService.getChainConfig(d.chainId);
        if (!config) return 0;
        const totalGas = getOptimalTotalFee(d, 'standard');
        return gweiToUsd(totalGas * 21000, config);
      }),
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.15)',
      fill: true,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#059669',
      pointBorderWidth: 3,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: '#059669',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 4,
      tension: 0.2,
      borderWidth: 3
    }]
  };

  const blobCostComparisonData = blobData && blobData.results && blobData.results.length > 0 ? {
    labels: blobData.results.map(r => r.networkName),
    datasets: [
      {
        label: 'Blob Transaction Cost (USD)',
        data: blobData.results.map(r => r.blobTransaction.totalCostUSD),
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        fill: false,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#7C3AED',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#7C3AED',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 4,
        tension: 0.2,
        borderWidth: 3
      },
      {
        label: 'Calldata Transaction Cost (USD)',
        data: blobData.results.map(r => r.comparison.vsTraditionalCalldata.costUSD),
        borderColor: '#D97706',
        backgroundColor: 'rgba(217, 119, 6, 0.15)',
        fill: false,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#D97706',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#D97706',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 4,
        tension: 0.2,
        borderWidth: 3
      }
    ]
  } : null;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(value);
  };
  
  // --- Render Logic ---
  if (error) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-center">
        <div className="text-red-400 mb-3"><svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        <h3 className="text-base font-funnel font-medium text-white">Failed to Load Data</h3>
        <p className="text-sm mt-1 text-gray-400 font-lekton">{error}</p>
        <button onClick={fetchAllData} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-lekton mt-3 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-funnel font-semibold text-white">Multi-Chain Gas Tracker</h2>
          <p className="text-sm text-gray-400 mt-1 font-lekton">Real-time gas prices across {selectedChains.length} supported networks.</p>
        </div>
        <div className="w-full md:w-auto md:min-w-[280px]">
            <p className="text-xs text-gray-500 text-left md:text-right mb-2 font-lekton">Data from <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">CoinGecko</a> & <a href="https://www.blocknative.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">Blocknative</a></p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tokenPrices).map(([id, price]) => ( <div key={id} className="bg-gray-800/70 p-2 rounded border border-gray-700"><p className="text-xs text-gray-400 capitalize font-lekton">{id.replace('-network', '')} Price</p><p className="text-sm font-lekton font-medium text-white">${price.toLocaleString()}</p></div> ))}
            </div>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {multiChainGasService.supportedChains.map((chain) => ( <button key={chain.id} onClick={() => toggleChain(chain.id)} className={`border border-gray-700 hover:bg-gray-700 text-white text-xs px-2 py-1.5 rounded font-lekton flex items-center space-x-1.5 transition-colors ${selectedChains.includes(chain.id) ? 'bg-blue-600/20 border-blue-600/30' : 'bg-gray-800/50'}`}><span className="text-sm" style={{color: chain.color}}>{chain.icon}</span><span>{chain.name}</span></button> ))}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-blue-400 animate-ping' : 'bg-green-400'} transition-colors`}></div>
            <span className="text-xs text-gray-500 font-lekton">{loading ? 'Updating...' : `Updated ${lastUpdate.toLocaleTimeString()}`}</span>
          </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/30 border border-gray-700 p-3 rounded">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-funnel font-medium text-white">Std. Tx Cost (USD)</h3>
              <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Confidence: 99%</span>
            </div>
            <div className="h-64"><Bar data={{
              labels: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.name),
              datasets: [{
                label: 'Standard Transaction Cost (USD)',
                data: multiChainData.map(d => {
                  const config = multiChainGasService.getChainConfig(d.chainId);
                  if (!config) return 0;
                  const totalGas = getOptimalTotalFee(d, 'standard');
                  return gweiToUsd(totalGas * 21000, config);
                }),
                backgroundColor: multiChainData.map(d => {
                  const config = multiChainGasService.getChainConfig(d.chainId);
                  return config ? `${config.color}80` : '#05966980';
                }),
                borderColor: multiChainData.map(d => {
                  const config = multiChainGasService.getChainConfig(d.chainId);
                  return config ? config.color : '#059669';
                }),
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false
              }]
            }} options={{
              ...baseLineChartOptions,
              scales: {
                ...baseLineChartOptions.scales,
                y: {
                  ...baseLineChartOptions.scales?.y,
                  type: 'logarithmic',
                  beginAtZero: false,
                  ticks: {
                    ...baseLineChartOptions.scales?.y?.ticks,
                    callback: (val) => {
                       if (typeof val === 'number') {
                         if (val < 0.0001) return `$${val.toExponential(2)}`;
                         if (val >= 1) return `$${val.toFixed(2)}`;
                         if (val >= 0.01) return `$${val.toFixed(3)}`;
                         return `$${val.toFixed(4)}`;
                       }
                       return val;
                     }
                  }
                }
              },
              plugins: {
                ...baseLineChartOptions.plugins,
                legend: { display: false },
                tooltip: {
                   ...baseLineChartOptions.plugins?.tooltip,
                   callbacks: {
                     label: function(context: any) {
                       let label = context.dataset.label || 'Cost';
                       if (label) label += ': ';
                       if (context.parsed.y !== null) {
                         const value = context.parsed.y;
                         if (value < 0.0001) {
                           label += `$${value.toExponential(2)}`;
                         } else if (value >= 1) {
                           label += `$${value.toFixed(2)}`;
                         } else if (value >= 0.01) {
                           label += `$${value.toFixed(3)}`;
                         } else {
                           label += `$${value.toFixed(4)}`;
                         }
                       }
                       return label;
                     }
                   }
                 }
              }
            }} /></div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700 p-3 rounded">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-funnel font-medium text-white">Gas Price Composition (Native Token)</h3>
              <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Confidence: 99%</span>
            </div>
            <div className="h-64"><Line data={gasCompositionData} options={gweiChartOptions} /></div>
        </div>
      </div>

      {/* EIP-4844 Blob Cost Analysis */}
      {(blobData && blobData.results && blobData.results.length > 0) || blobLoading ? (
        <div className="bg-gray-800/30 border border-gray-700 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-funnel font-semibold text-white">EIP-4844 Blob Cost Analysis</h3>
              <p className="text-sm text-gray-400 font-lekton">128KB blob vs traditional calldata costs (Real-time Blocknative data)</p>
            </div>
            {blobLoading && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
                <span className="text-xs text-gray-400">Loading blob data...</span>
              </div>
            )}
          </div>
          
          {/* Academic Explanation */}
          <div className="bg-blue-900/20 border border-blue-700/50 p-3 rounded mb-4">
            <h4 className="text-sm font-medium text-blue-300 mb-2">📚 Academic Note: EIP-4844 Blob Transactions</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <p><strong>Scope Limitation:</strong> EIP-4844 blob transactions (Type 3) are currently only supported on Ethereum mainnet (Chain ID: 1).</p>
            <p><strong>Layer 2 Status:</strong> All Layer 2 networks (Arbitrum, Optimism, Base, Polygon, etc.) do not support blob transactions and use traditional calldata for data availability.</p>
            <p><strong>Blob Cost Analysis:</strong> Shows estimated costs for Layer 2 networks to post transaction data to Ethereum mainnet via EIP-4844 blob transactions.</p>
            <p><strong>Confidence Level:</strong> 90% confidence level used for gas price predictions based on Blocknative mempool analysis.</p>
            <p><strong>Data Source:</strong> Blocknative API with fallback to predicted values for next block inclusion probability.</p>
            </div>
          </div>
          
          {blobData && blobData.results && blobData.results.length > 0 ? (
            <>
              <div className="h-72 mb-4">
                <Line data={blobCostComparisonData!} options={{
                  ...baseLineChartOptions,
                  scales: {
                    ...baseLineChartOptions.scales,
                    y: {
                       type: 'linear',
                       beginAtZero: true,
                       ticks: {
                         color: '#E5E7EB',
                         font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '500' },
                         callback: (val) => {
                           if (typeof val === 'number') {
                             if (val < 0.0001) return `$${val.toExponential(2)}`;
                             if (val >= 1) return `$${val.toFixed(2)}`;
                             if (val >= 0.01) return `$${val.toFixed(3)}`;
                             return `$${val.toFixed(4)}`;
                           }
                           return val;
                         }
                       },
                       grid: { color: 'rgba(156, 163, 175, 0.2)', lineWidth: 1, drawBorder: false },
                       border: { color: '#9CA3AF' }
                     }
                  },
                  plugins: {
                    ...baseLineChartOptions.plugins,
                    legend: {
                      position: 'top',
                      align: 'center',
                      labels: {
                        color: '#F9FAFB',
                        font: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '600' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        boxWidth: 14,
                        boxHeight: 14
                      }
                    },
                    tooltip: {
                      ...baseLineChartOptions.plugins?.tooltip,
                      callbacks: {
                        label: function(context: any) {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          if (value < 0.0001) {
                            return `${label}: $${value.toExponential(2)}`;
                          } else if (value >= 1) {
                            return `${label}: $${value.toFixed(2)}`;
                          } else if (value >= 0.01) {
                            return `${label}: $${value.toFixed(3)}`;
                          } else {
                            return `${label}: $${value.toFixed(4)}`;
                          }
                        }
                      }
                    }
                  }
                }} />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-lekton">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="p-2 text-left font-medium text-gray-400">Network</th>
                      <th className="p-2 text-right font-medium text-gray-400">Blob Gas (Units)</th>
                      <th className="p-2 text-right font-medium text-gray-400">Blob Cost (USD)</th>
                      <th className="p-2 text-right font-medium text-gray-400">Calldata Cost (USD)</th>
                      <th className="p-2 text-right font-medium text-gray-400">Cost per L2 Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blobData.results.map((result) => (
                        <tr key={result.network} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                          <td className="p-2">
                            <span className="font-medium text-white">{result.networkName}</span>
                          </td>
                          <td className="p-2 text-right font-mono text-cyan-300">
                              {(result.blobTransaction.regularGasUsed + result.blobTransaction.blobGasUsed).toLocaleString()}
                            </td>
                          <td className="p-2 text-right font-mono text-cyan-300">
                              {formatCurrency(result.blobTransaction.totalCostUSD)}
                            </td>
                          <td className="p-2 text-right font-mono text-amber-300">
                            {formatCurrency(result.comparison.vsTraditionalCalldata.costUSD)}
                          </td>
                          <td className="p-2 text-right font-mono text-gray-300">
                            {formatCurrency(result.blobTransaction.costPerL2Transaction)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : blobLoading ? (
            <div className="h-32 flex items-center justify-center bg-gray-900/50 rounded border border-gray-600">
              <div className="text-center">
                <div className="text-gray-400 mb-2 font-lekton">⚠️ Loading blob cost analysis...</div>
                <div className="text-xs text-gray-500 font-lekton">EIP-4844 blob transactions are only supported on Ethereum mainnet</div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center bg-gray-900/50 rounded border border-gray-600">
              <div className="text-center">
                <div className="text-gray-400 mb-2 font-lekton">⚠️ No Blob Data Available</div>
                <div className="text-xs text-gray-500 font-lekton">EIP-4844 blob transactions are only supported on Ethereum mainnet</div>
              </div>
            </div>
          )}
        </div>
      ) : null}
      
      {/* Network Summary Table */}
      <div className="bg-gray-800/30 border border-gray-700 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-funnel font-semibold text-white">EIP-1559 Gas Analysis (Layer 2 Comparison)</h3>
          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Confidence: 99%</span>
        </div>
        
        {/* Academic Methodology */}
        <div className="bg-amber-900/20 border border-amber-700/50 p-3 rounded mb-4">
          <h4 className="text-sm font-medium text-amber-300 mb-2">🔬 Methodology & Confidence Levels</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-lekton">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2 text-left font-medium text-gray-400">Network (Type)</th>
                <th className="p-2 text-right font-medium text-gray-400"><Tooltip content="Base fee per gas for current block in native token units (EIP-1559)" className="max-w-48 text-xs bg-gray-900/95 border border-gray-600"><span className="cursor-pointer underline decoration-dotted">Base Fee (Native)</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400"><Tooltip content="Max fee per gas in native token units (used for type2 transactions: EIP-1559)" className="max-w-48 text-xs bg-gray-900/95 border border-gray-600"><span className="cursor-pointer underline decoration-dotted">Max Fee (Native)</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400"><Tooltip content="Standard transfer cost (21,000 gas) in USD" className="max-w-48 text-xs bg-gray-900/95 border border-gray-600"><span className="cursor-pointer underline decoration-dotted">Std Transfer (21k gas)</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400"><Tooltip content="Blob transaction cost for data availability in USD" className="max-w-48 text-xs bg-gray-900/95 border border-gray-600"><span className="cursor-pointer underline decoration-dotted">Blob Cost</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400"><Tooltip content="Traditional calldata cost for comparison in USD" className="max-w-48 text-xs bg-gray-900/95 border border-gray-600"><span className="cursor-pointer underline decoration-dotted">Calldata Cost</span></Tooltip></th>
              </tr>
            </thead>
            <tbody>
              {multiChainData.map((chainData) => {
                const config = multiChainGasService.getChainConfig(chainData.chainId);
                if (!config) return null;

                const baseFee = getBaseFee(chainData);
                const blobBaseFee = chainData?.gasData?.blockPrices?.[0]?.blobBaseFeePerGas || 0;
                const maxFee = getOptimalTotalFee(chainData, 'standard');
                const standardTxCostUsd = gweiToUsd(maxFee * 21000, config);
                
                // Find blob data for this network
                const blobResult = blobData?.results?.find(r => r.network === chainData.chainId);
                const blobCostUsd = blobResult?.blobTransaction?.totalCostUSD || 0;
                const calldataCostUsd = blobResult?.comparison?.vsTraditionalCalldata?.costUSD || 0;
                
                return (
                  <tr key={chainData.chainId} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                    <td className="p-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xl" style={{color: config.color}}>{config.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{config.name}</span>
                          <span className="text-xs text-gray-400">
                            {config.name.includes('Arbitrum') || config.name.includes('Optimism') || config.name.includes('Base') ? 'Optimistic Rollup' :
                             config.name.includes('zkSync') || config.name.includes('Polygon zkEVM') || config.name.includes('Scroll') || config.name.includes('Linea') ? 'ZK Rollup' :
                             config.name.includes('Polygon') && !config.name.includes('zkEVM') ? 'Sidechain' :
                             config.name.includes('Ink') ? 'Optimistic Rollup' : 'Layer 2'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right font-mono text-blue-400">
                      {baseFee < 0.001 ? baseFee.toExponential(2) : baseFee.toPrecision(3)}
                    </td>
                    <td className="p-2 text-right font-mono text-green-400">
                      {maxFee < 0.001 ? maxFee.toExponential(2) : maxFee.toPrecision(3)}
                    </td>
                    <td className="p-2 text-right font-mono text-cyan-300 font-bold">
                      ${standardTxCostUsd.toFixed(4)}
                    </td>
                    <td className="p-2 text-right font-mono text-orange-400">
                      {blobCostUsd > 0 ? `$${blobCostUsd.toFixed(4)}` : '—'}
                    </td>
                    <td className="p-2 text-right font-mono text-amber-400">
                      {calldataCostUsd > 0 ? `$${calldataCostUsd.toFixed(4)}` : '—'}
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
