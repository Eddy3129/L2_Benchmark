'use client';

import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
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

// Hardcoded CoinGecko API Key from the original code
const CG_API_KEY = 'CG-njMzeCqg4NmSv1JFwKypf5Zy';
const CG_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'x-cg-demo-api-key': CG_API_KEY
  }
};

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
  const [selectedChains, setSelectedChains] = useState<string[]>(['mainnet', 'polygon', 'arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era']);
  const [multiChainData, setMultiChainData] = useState<MultiChainGasData[]>([]);
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<BlobAnalysisResult | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);

  // --- Data Fetching ---
  const fetchTokenPrices = async () => {
    const idsToFetch = new Set<string>();
    const symbolsToFetch = new Set<string>();
    selectedChains.forEach(id => {
      const config = multiChainGasService.getChainConfig(id);
      if (config?.coingeckoId) idsToFetch.add(config.coingeckoId);
      if (config?.coingeckoSymbol) symbolsToFetch.add(config.coingeckoSymbol);
    });

    const pricePromises = [];
    if (idsToFetch.size > 0) {
      const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${Array.from(idsToFetch).join(',')}`;
      pricePromises.push(fetch(url, CG_OPTIONS).then(res => res.json()));
    }
    if (symbolsToFetch.size > 0) {
      const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=${Array.from(symbolsToFetch).join(',')}`;
      pricePromises.push(fetch(url, CG_OPTIONS).then(res => res.json()));
    }

    try {
      const results = await Promise.all(pricePromises);
      const newPrices: { [key: string]: number } = {};
      results.forEach(result => {
        for (const key in result) {
          if (result[key].usd) newPrices[key] = result[key].usd;
        }
      });
      setTokenPrices(newPrices);
    } catch (priceError) {
      console.error('Could not fetch token prices:', priceError);
    }
  };

  const fetchBlobData = async () => {
    try {
      setBlobLoading(true);
      const eip4844Networks = ['arbitrum', 'optimism', 'base', 'polygon', 'zksync-era'];
      const supportedNetworks = selectedChains.filter(chain => eip4844Networks.includes(chain));
      
      if (supportedNetworks.length === 0) {
        setBlobData(null);
        return;
      }

      const result = await apiService.compareBlobCosts({
        l2Networks: supportedNetworks,
        blobDataSize: 131072, // Standard 128KB blob
        confidenceLevel: 90,
        saveToDatabase: false
      });
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

  const baseBarChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    barPercentage: 0.4,
    categoryPercentage: 0.7,
    plugins: {
      legend: { 
        position: 'top', 
        labels: { 
          color: '#D1D5DB', 
          font: { family: 'Lekton', size: 11 }, 
          usePointStyle: true, 
          pointStyle: 'circle',
          padding: 12
        } 
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
        titleColor: '#F9FAFB', 
        bodyColor: '#D1D5DB', 
        borderColor: '#374151', 
        borderWidth: 1, 
        cornerRadius: 12,
        titleFont: { family: 'Lekton', size: 11 },
        bodyFont: { family: 'Lekton', size: 10 },
      }
    },
    scales: {
      x: { 
        ticks: { color: '#9CA3AF', font: { family: 'Lekton', size: 9 } }, 
        grid: { color: '#374151', lineWidth: 0.5 } 
      },
      y: { 
        type: 'logarithmic', 
        ticks: { 
          color: '#9CA3AF', 
          font: { family: 'Lekton', size: 9 },
          callback: (val) => { 
            if(typeof val === 'number') { 
              if (val < 1) return val.toPrecision(1); 
              if (val >= 1000) return `${val/1000}k`; 
              return val.toString(); 
            } 
            return val; 
          } 
        }, 
        grid: { color: '#374151', lineWidth: 0.5 } 
      }
    }
  };

  const gweiChartOptions: ChartOptions<'bar'> = {
    ...baseBarChartOptions,
    scales: {
      ...baseBarChartOptions.scales,
      x: {
        ...baseBarChartOptions.scales?.x,
        stacked: true,
      },
      y: {
        ...baseBarChartOptions.scales?.y,
        stacked: true,
      }
    },
    plugins: {
        ...baseBarChartOptions.plugins,
        tooltip: {
            ...baseBarChartOptions.plugins?.tooltip,
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) label += `${context.parsed.y.toPrecision(3)} Gwei`;
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
        backgroundColor: multiChainData.map(d => {
            const config = multiChainGasService.getChainConfig(d.chainId);
            return config ? config.color + 'CC' : '#374151'; // Use network color with 80% opacity
        }),
        borderWidth: 0,
      },
      { 
        label: `Priority Fee (Gwei)`, 
        data: multiChainData.map(data => getOptimalPriorityFee(data, 'standard')), 
        backgroundColor: multiChainData.map(d => {
            const config = multiChainGasService.getChainConfig(d.chainId);
            return config ? config.color + '80' : '#4b5563'; // Use network color with 50% opacity
        }),
        borderWidth: 0,
        // By applying a simple numeric radius to the top dataset, Chart.js
        // will correctly round only the top corners of the entire stack.
        borderRadius: 12,
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
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      pointBackgroundColor: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.color),
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.3
    }]
  };

  const blobCostComparisonData = blobData && blobData.results && blobData.results.length > 0 ? {
    labels: blobData.results.flatMap(r => [`${r.networkName} - Blob`, `${r.networkName} - Calldata`]),
    datasets: [
      {
        label: 'Transaction Cost (USD)',
        data: blobData.results.flatMap(r => [
          r.blobTransaction.totalCostUSD,
          r.comparison.vsTraditionalCalldata.costUSD
        ]),
        backgroundColor: blobData.results.flatMap(r => {
            const config = multiChainGasService.getChainConfig(r.network);
            const mainColor = config ? config.color : '#06b6d4';
            return [mainColor + 'CC', mainColor + '60'];
        }),
        borderWidth: 1,
        borderRadius: 12,
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
            <h3 className="text-base font-funnel font-medium text-white mb-3">Std. Tx Cost (USD)</h3>
            <div className="h-64"><Line data={txCostComparisonData} options={usdChartOptions} /></div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700 p-3 rounded">
            <h3 className="text-base font-funnel font-medium text-white mb-3">Gas Price Composition (Gwei)</h3>
            <div className="h-64"><Bar data={gasCompositionData} options={gweiChartOptions} /></div>
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
          
          {blobData && blobData.results && blobData.results.length > 0 ? (
            <>
              <div className="h-72 mb-4">
                <Bar data={blobCostComparisonData!} options={{
                  ...baseBarChartOptions,
                  scales: {
                    ...baseBarChartOptions.scales,
                    y: {
                       type: 'logarithmic',
                       ticks: {
                         color: '#718096',
                         callback: (val) => `$${Number(val).toFixed(2)}`
                       },
                       grid: { color: 'rgba(74, 85, 104, 0.2)' }
                     }
                  },
                  plugins: {
                    ...baseBarChartOptions.plugins,
                    tooltip: {
                      ...baseBarChartOptions.plugins?.tooltip,
                      callbacks: {
                        label: function(context: any) {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          return `${label}: ${formatCurrency(value)}`;
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
            <div className="h-32 flex items-center justify-center">
              <div className="text-gray-400 font-lekton">Loading blob cost analysis...</div>
            </div>
          ) : null}
        </div>
      ) : null}
      
      {/* Network Summary Table */}
      <div className="bg-gray-800/30 border border-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-funnel font-semibold text-white mb-4">Network Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed font-lekton">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2 text-left font-medium text-gray-400 w-[18%]">Network</th>
                <th className="p-2 text-right font-medium text-gray-400 w-[12%]"><Tooltip content={gasTerms['Base Fee']} className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Base</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400 w-[14%]"><Tooltip content={gasTerms['Priority Fee']} className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Priority (Std)</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400 w-[22%]"><Tooltip content={gasTerms['Std. Tx Cost (USD)']} className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Std. Tx Cost (USD)</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400 w-[11%]"><Tooltip content="Total fee (Base + Priority) for a slow transaction." className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Slow</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400 w-[11%]"><Tooltip content="Total fee (Base + Priority) for a standard transaction." className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Standard</span></Tooltip></th>
                <th className="p-2 text-right font-medium text-gray-400 w-[11%]"><Tooltip content="Total fee (Base + Priority) for a fast transaction." className="max-w-48 text-xs"><span className="cursor-pointer underline decoration-dotted">Fast</span></Tooltip></th>
              </tr>
            </thead>
            <tbody>
              {multiChainData.map((chainData) => {
                const config = multiChainGasService.getChainConfig(chainData.chainId);
                if (!config) return null;

                const baseFee = getBaseFee(chainData);
                const stdPriorityFee = getOptimalPriorityFee(chainData, 'standard');
                const slowFee = getOptimalTotalFee(chainData, 'slow');
                const standardFee = getOptimalTotalFee(chainData, 'standard');
                const fastFee = getOptimalTotalFee(chainData, 'fast');
                const standardTxCostUsd = gweiToUsd(standardFee * 21000, config); 
                
                return (
                  <tr key={chainData.chainId} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                    <td className="p-2"><div className="flex items-center space-x-3"><span className="font-mono text-xl" style={{color: config.color}}>{config.icon}</span><span className="font-medium text-white">{config.name}</span></div></td>
                    <td className="p-2 text-right font-mono text-white">{baseFee.toPrecision(3)}</td>
                    <td className="p-2 text-right font-mono text-cyan-400">{stdPriorityFee.toPrecision(3)}</td>
                    <td className="p-2 text-right font-mono text-green-400 font-bold">${standardTxCostUsd.toFixed(4)}</td>
                    <td className="p-2 text-right font-mono text-gray-400">{slowFee.toPrecision(3)}</td>
                    <td className="p-2 text-right font-mono text-green-400">{standardFee.toPrecision(3)}</td>
                    <td className="p-2 text-right font-mono text-red-400">{fastFee.toPrecision(3)}</td>
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
