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

const CG_API_KEY = 'CG-njMzeCqg4NmSv1JFwKypf5Zy';
const CG_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'x-cg-demo-api-key': CG_API_KEY
  }
};

export function GasDashboard() {
  const [selectedChains, setSelectedChains] = useState<string[]>(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base']);
  const [multiChainData, setMultiChainData] = useState<MultiChainGasData[]>([]);
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

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
        fetchTokenPrices()
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

  const gweiChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#a0aec0', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'circle' } },
      tooltip: {
        backgroundColor: 'rgba(36, 41, 56, 0.95)', titleColor: '#ffffff', bodyColor: '#a0aec0', borderColor: '#4a5568', borderWidth: 1, cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += `${context.parsed.y.toPrecision(3)} Gwei`;
            return label;
          }
        }
      }
    },
    scales: {
      x: { stacked: true, ticks: { color: '#718096' }, grid: { color: 'rgba(74, 85, 104, 0.2)' } },
      y: { type: 'logarithmic', stacked: true, ticks: { color: '#718096', callback: (val) => { if(typeof val === 'number') { if (val < 1) return val.toPrecision(1); if (val >= 1000) return `${val/1000}k`; return val.toString(); } return val; } }, grid: { color: 'rgba(74, 85, 104, 0.2)' } }
    }
  };

  const usdChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(36, 41, 56, 0.95)', titleColor: '#ffffff', bodyColor: '#a0aec0', borderColor: '#4a5568', borderWidth: 1, cornerRadius: 8,
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
      x: { ticks: { color: '#718096' }, grid: { display: false } },
      y: { type: 'linear', ticks: { color: '#718096', callback: (val) => `$${Number(val).toFixed(2)}` }, grid: { color: 'rgba(74, 85, 104, 0.2)' } }
    }
  };

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
      { label: `Base Fee (Gwei)`, data: multiChainData.map(data => getBaseFee(data)), backgroundColor: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.color + '80'), borderWidth: 1 },
      { label: `Priority Fee (Gwei)`, data: multiChainData.map(data => getOptimalPriorityFee(data, 'standard')), backgroundColor: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.color + '40'), borderWidth: 1 }
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
      backgroundColor: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.color),
      borderColor: multiChainData.map(d => multiChainGasService.getChainConfig(d.chainId)?.color + '80'),
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  if (error) {
    return (
      <div className="card p-6 text-center">
        <div className="text-red-400 mb-4"><svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        <h3 className="text-lg font-semibold text-white">Failed to Load Data</h3>
        <p className="text-sm mt-1 text-gray-400">{error}</p>
        <button onClick={fetchAllData} className="btn-primary mt-4 px-4 py-2">Retry</button>
      </div>
    );
  }

  return (
    <div className="card p-6 bg-gray-900 text-white rounded-xl">
      
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Multi-Chain Gas Tracker</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time gas prices across {selectedChains.length} supported networks.</p>
        </div>
        <div className="w-full md:w-auto md:min-w-[300px]">
           <p className="text-xs text-gray-500 text-left md:text-right mb-2">Data from <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-400">CoinGecko</a> & <a href="https://www.blocknative.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">Blocknative</a></p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(tokenPrices).map(([id, price]) => ( <div key={id} className="bg-gray-800 p-3 rounded-lg"><p className="text-sm text-gray-400 capitalize">{id.replace('-network', '')} Price</p><p className="text-xl font-bold text-white">${price.toLocaleString()}</p></div> ))}
            </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {multiChainGasService.supportedChains.map((chain) => ( <button key={chain.id} onClick={() => toggleChain(chain.id)} className={`border border-gray-700 hover:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${selectedChains.includes(chain.id) ? 'bg-blue-600 border-blue-600' : 'bg-gray-800'}`}><span className="font-mono text-lg" style={{color: chain.color}}>{chain.icon}</span><span>{chain.name}</span></button> ))}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-ping' : 'bg-green-400'} transition-colors`}></div>
            <span className="text-xs text-gray-500">{loading ? 'Updating...' : `Updated ${lastUpdate.toLocaleTimeString()}`}</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Std. Tx Cost (USD)</h3>
            <div className="h-72"><Bar data={txCostComparisonData} options={usdChartOptions} /></div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Gas Price Composition (Gwei)</h3>
            <div className="h-72"><Bar data={gasCompositionData} options={gweiChartOptions} /></div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Network Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
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