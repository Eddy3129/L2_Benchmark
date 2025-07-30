import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LogarithmicScale, 
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Scale,
} from 'chart.js';
// import ChartDataLabels from 'chartjs-plugin-datalabels'; 
import { NetworkResult } from '@/types/shared';
import { NETWORK_CONFIGS, getNetworkDisplayName } from '@/utils/networkConfig'; 
import { formatCurrency } from '@/utils/gasUtils';
import { TrendingDown, TrendingUp, DollarSign, Zap, Network, BarChart3, FileText, CheckCircle, AlertTriangle, Download, Info } from 'lucide-react';
import { ExportButton } from './ExportButton';
import { Tooltip as HeroTooltip } from '@heroui/react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend
  // ChartDataLabels 
);

// --- Interfaces ---
interface AnalysisResult {
  contractName: string;
  results: NetworkResult[];
  timestamp: string;
}

interface UnifiedGasResultsProps {
  result: AnalysisResult;
}

// --- Component ---
export function UnifiedGasResults({ result }: UnifiedGasResultsProps) {
  
  // --- Memoized Calculations ---
  const sortedResults = useMemo(() => {
    if (!result || !result.results) return [];

    const ethereum = result.results.find(r => getNetworkDisplayName(r.network) === 'Ethereum');
    const others = result.results.filter(r => getNetworkDisplayName(r.network) !== 'Ethereum');
    
    others.sort((a, b) => a.deployment.costUSD - b.deployment.costUSD);

    return ethereum ? [ethereum, ...others] : others;
  }, [result]);

  const baselineNetwork = useMemo(() => {
    if (!sortedResults || sortedResults.length === 0) return null;
    const potentialBaselines = sortedResults.filter(r => getNetworkDisplayName(r.network) !== 'Ethereum');
    return potentialBaselines.length > 0 ? potentialBaselines[0] : sortedResults[0];
  }, [sortedResults]);

  const summaryStats = useMemo(() => {
    if (!result || !result.results || result.results.length === 0 || !baselineNetwork) {
      return null;
    }
    
    const deploymentCosts = result.results.map(r => r.deployment.costUSD);
    const minCost = Math.min(...deploymentCosts);
    const maxCost = Math.max(...deploymentCosts);

    return {
      networksAnalyzed: result.results.length,
      totalFunctions: result.results.reduce((sum, r) => sum + r.functions.length, 0),
      maxSavings: maxCost - minCost,
      cheapestNetwork: baselineNetwork
    };
  }, [result, baselineNetwork]);

  const deploymentCostData = useMemo(() => {
    if (!sortedResults) return { labels: [], datasets: [] };
    
    const networks = sortedResults.map(r => getNetworkDisplayName(r.network));
    const costs = sortedResults.map(r => r.deployment.costUSD);
    const backgroundColors = sortedResults.map(r => NETWORK_CONFIGS[r.network]?.color || '#6b7280');
    const borderColors = sortedResults.map(r => NETWORK_CONFIGS[r.network]?.color || '#6b7280');

    return {
      labels: networks,
      datasets: [
        {
          label: 'Deployment Cost (USD)',
          data: costs,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }, [sortedResults]);

  const functionCostData = useMemo(() => {
    if (!sortedResults) return { labels: [], datasets: [] };

    const networks = sortedResults.map(r => getNetworkDisplayName(r.network));
    const functionCosts = sortedResults.map(r => 
      r.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0)
    );
    const backgroundColors = sortedResults.map(r => NETWORK_CONFIGS[r.network]?.color || '#6b7280');
    const borderColors = sortedResults.map(r => NETWORK_CONFIGS[r.network]?.color || '#6b7280');

    return {
      labels: networks,
      datasets: [
        {
          label: 'Function Cost (USD)',
          data: functionCosts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }, [sortedResults]);

  // Extract Ethereum mainnet L1 gas price for consistent display across all L2s
  const ethereumL1GasPrice = useMemo(() => {
    if (!result || !result.results) return null;
    
    // Find Ethereum mainnet result
    const ethereumResult = result.results.find(r => 
      r.network === 'mainnet' || r.network === 'ethereum'
    );
    
    // Return the L1 gas price (which is the totalFee for Ethereum mainnet)
    return ethereumResult?.gasPriceBreakdown?.totalFee || null;
  }, [result]);

  
  // --- Chart Options ---
  // UPDATED: Function now accepts a boolean to force power-of-10 ticks
  const getChartOptions = (options: { forceX10Ticks?: boolean }): ChartOptions<'bar'> => {
    const yAxisConfig: any = {
      type: 'logarithmic',
      min: 0.000001,
      ticks: {
        color: '#9ca3af',
        font: { size: 10, family: 'Lekton' },
        callback: (value: any) => formatCurrency(Number(value))
      },
      grid: { color: 'rgba(55, 65, 81, 0.5)' }
    };

    // **THE DEFINITIVE FIX IS HERE**
    // If the flag is true, add the afterBuildTicks callback to take full control.
    if (options.forceX10Ticks) {
      yAxisConfig.afterBuildTicks = (axis: Scale) => {
        const newTicks = [];
        let tickValue = 0.000001; // Start at the minimum
        
        while (tickValue <= 100) { // Set a reasonable upper limit
          newTicks.push({ value: tickValue });
          tickValue *= 10;
        }
        axis.ticks = newTicks;
      };
    } else {
        // For the other chart, we can let it auto-detect the max or set a specific one
        yAxisConfig.max = 100;
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          borderColor: '#374151',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          titleFont: { family: 'Lekton' },
          bodyFont: { family: 'Lekton' },
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatCurrency(value)}`;
            }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af', font: { size: 10, family: 'Lekton' } },
          grid: { color: 'rgba(55, 65, 81, 0.5)' }
        },
        y: yAxisConfig,
      },
    };
  };

  const deploymentChartOptions = useMemo(() => getChartOptions({ forceX10Ticks: true }), []);
  const functionChartOptions = useMemo(() => getChartOptions({ forceX10Ticks: true }), []); 

  
  // --- Helper Functions ---
  const getSavings = (networkResult: NetworkResult) => {
    if (!baselineNetwork) return { savings: 0, percentage: 0 };
    const maxCost = Math.max(...result.results.map(r => r.deployment.costUSD));
    const savings = maxCost - networkResult.deployment.costUSD;
    const percentage = maxCost > 0 ? (savings / maxCost) * 100 : 0;
    return { savings, percentage };
  };

  if (!summaryStats || !baselineNetwork) {
    return (
      <div className="bg-gray-900 text-white p-8 rounded-lg text-center font-lekton">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-lg font-medium">Incomplete Analysis Data</h3>
        <p className="mt-2 text-sm text-gray-400">
          The provided analysis result is missing data. Please try generating the report again.
        </p>
      </div>
    );
  }

  // --- Render JSX ---
  return (
    <div className="bg-gray-900 text-gray-200 p-4 lg:p-6 rounded-xl space-y-6 font-lekton">

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={CheckCircle} 
          title="Cheapest L2 Network" 
          value={getNetworkDisplayName(baselineNetwork.network)}
          subtitle={`at ${formatCurrency(baselineNetwork.deployment.costUSD)}`}
          color="green"
        />
        <StatCard 
          icon={DollarSign} 
          title="Max Potential Savings" 
          value={formatCurrency(summaryStats.maxSavings)}
          subtitle="between analyzed networks"
          color="blue"
        />
        <StatCard 
          icon={Network} 
          title="Networks Analyzed" 
          value={summaryStats.networksAnalyzed.toString()}
          subtitle="total networks"
          color="purple"
        />
        <StatCard 
          icon={Zap} 
          title="Deploy Gas Used" 
          value={sortedResults.length > 0 ? parseInt(sortedResults[0].deployment.gasUsed).toLocaleString() : '0'}
          subtitle="same across all networks"
          color="amber"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Deployment Costs by Network">
          <Bar data={deploymentCostData} options={deploymentChartOptions} />
        </ChartCard>
        <ChartCard title="Total Function Costs by Network">
          <Bar data={functionCostData} options={functionChartOptions} />
        </ChartCard>
      </section>
      
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">Detailed Breakdown</h3>
        <div className="overflow-hidden border border-gray-700 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-white sm:pl-4">Network</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Measured computational gas consumed by the transaction on local Hardhat EVM. This is accurate and constant across all EVM-compatible networks.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>Measured Gas Used</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Real-time gas price on the L2 network from Blocknative API.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>L2 Gas Price (gwei)</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Real-time gas price on Ethereum mainnet from Blocknative API.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>L1 Gas Price (gwei)</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Real-time market price of the network's native token from CoinGecko API.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>Token Price (USD)</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Total estimated cost combining L2 execution and L1 data costs. This is the most accurate final cost estimate.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>Est. Deployment Cost (USD)</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="ESTIMATED: L2 execution cost calculated from measured gas and L2 gas price. Accuracy depends on L1 data cost estimation.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span className="text-yellow-300">Est. L2 Execution</span>
                        <Info className="w-3 h-3 text-yellow-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="ESTIMATED: L1 blob data cost using EIP-4844 blob transactions with standard 1 wei blob base fee. More accurate than legacy calldata calculations.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span className="text-blue-300">Est. L1 Blob Cost</span>
                        <Info className="w-3 h-3 text-blue-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">
                    <HeroTooltip content="Confidence level of gas price data from Blocknative API or provider fallback.">
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <span>Confidence</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </HeroTooltip>
                  </th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">vs. Ethereum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {sortedResults.map((networkResult) => {
                  const config = NETWORK_CONFIGS[networkResult.network];
                  const totalFunctionCost = networkResult.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0);
                  const savings = getSavings(networkResult);
                  const isCheapestL2 = networkResult.network === baselineNetwork.network;
                  
                  return (
                    <tr key={networkResult.network} className="hover:bg-gray-800/50 transition-colors">
                      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-xs sm:pl-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 flex items-center">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config?.color || '#3b82f6' }}></div>
                          </div>
                          <div className="ml-2">
                            <div className="font-medium text-white">{getNetworkDisplayName(networkResult.network)}</div>
                            {isCheapestL2 && <div className="text-green-400 text-xs mt-0.5">Cheapest L2</div>}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-mono">
                        <span className="text-green-400 font-semibold">{parseInt(networkResult.deployment.gasUsed).toLocaleString()}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">
                        {(() => {
                          const isMainnet = networkResult.network === 'mainnet' || networkResult.network === 'ethereum';
                          const isPolygon = networkResult.network === 'polygon';
                          
                          if (isMainnet) {
                            return '—';
                          } else {
                            // Polygon and Ethereum L2s show their own L2 gas price
                            return networkResult.gasPriceBreakdown?.totalFee?.toFixed(7) || '—';
                          }
                        })()} 
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">
                        {(() => {
                          const isMainnet = networkResult.network === 'mainnet' || networkResult.network === 'ethereum';
                          const isPolygon = networkResult.network === 'polygon';
                          
                          if (isMainnet) {
                            return networkResult.gasPriceBreakdown?.totalFee?.toFixed(6) || '—';
                          } else if (isPolygon) {
                            return '—';
                          } else {
                            // Ethereum L2s - show unified mainnet L1 gas price
                            return ethereumL1GasPrice ? ethereumL1GasPrice.toFixed(6) : '—';
                          }
                        })()} 
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">
                        ${networkResult.ethPriceUSD?.toFixed(2) || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-semibold text-white font-mono">
                        {formatCurrency(networkResult.deployment.totalCost || networkResult.deployment.costUSD)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-mono">
                        {(() => {
                          const isEthereumL2 = ['arbitrum', 'optimism', 'base', 'zksync-era', 'scroll', 'linea', 'ink'].includes(networkResult.network);
                          const isMainnet = networkResult.network === 'mainnet' || networkResult.network === 'ethereum';
                          const isPolygon = networkResult.network === 'polygon';
                          
                          if (isMainnet || isPolygon) {
                            // L1 networks show total deployment cost as "L2 execution"
                            return <span className="text-yellow-300">{formatCurrency(networkResult.deployment.costUSD)}</span>;
                          } else if (isEthereumL2) {
                            // Ethereum L2s should show actual L2 execution cost if available, otherwise fallback to total cost
                            const l2Cost = networkResult.deployment.l2ExecutionCost || networkResult.deployment.costUSD;
                            return <span className="text-yellow-300">{formatCurrency(l2Cost)}</span>;
                          } else {
                            return <span className="text-gray-500">—</span>;
                          }
                        })()} 
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-mono">
                        {(() => {
                          const isEthereumL2 = ['arbitrum', 'optimism', 'base', 'zksync-era', 'scroll', 'linea', 'ink'].includes(networkResult.network);
                          const isMainnet = networkResult.network === 'mainnet' || networkResult.network === 'ethereum';
                          const isPolygon = networkResult.network === 'polygon';
                          
                          if (isMainnet || isPolygon) {
                            return <span className="text-gray-500">—</span>;
                          } else if (isEthereumL2) {
                            // Check if l1DataCost exists and is a valid number
                                const l1DataCost = networkResult.deployment.l1DataCost;
                                
                                if (l1DataCost !== undefined && l1DataCost !== null && typeof l1DataCost === 'number' && l1DataCost > 0) {
                              // Format the USD value properly
                              return (
                                <span className="text-blue-300">
                                  {formatCurrency(l1DataCost)}
                                </span>
                              );
                            } else {
                              return <span className="text-gray-500">—</span>;
                            }
                          } else {
                            return <span className="text-gray-500">—</span>;
                          }
                        })()} 
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400">
                        {networkResult.gasPriceBreakdown?.confidence !== undefined ? (
                          <div className="flex items-center justify-end gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              networkResult.gasPriceBreakdown.confidence >= 95 ? 'bg-green-400' :
                              networkResult.gasPriceBreakdown.confidence >= 80 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className="text-xs">{networkResult.gasPriceBreakdown.confidence}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs">
                        <SavingsIndicator savings={savings.savings} percentage={savings.percentage} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'gray' }: {
  icon: React.ElementType,
  title: string,
  value: string,
  subtitle: string,
  color?: 'green' | 'blue' | 'purple' | 'amber' | 'gray'
}) => {
  const colorClasses = {
    green: 'border-green-500/50 text-green-400',
    blue: 'border-blue-500/50 text-blue-400',
    purple: 'border-purple-500/50 text-purple-400',
    amber: 'border-amber-500/50 text-amber-400',
    gray: 'border-gray-600 text-gray-300',
  };

  return (
    <div className={`bg-gray-800/50 p-4 rounded-lg border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${colorClasses[color]}`} strokeWidth={2} />
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
    <div className="p-3 border-b border-gray-700/50">
      <h3 className="text-base font-semibold text-white flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-400" />
        {title}
      </h3>
    </div>
    <div className="p-3">
      <div className="h-64">
        {children}
      </div>
    </div>
  </div>
);

const SavingsIndicator = ({ savings, percentage }: { savings: number, percentage: number }) => {
  if (Math.abs(percentage) < 0.01) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  
  const isSavings = savings > 0;
  const color = 'text-green-400';
  const Icon = TrendingDown;

  return (
    <div className={`flex items-center justify-end gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="font-medium font-mono text-xs">{Math.abs(percentage).toFixed(1)}%</span>
    </div>
  );
};