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
import { TrendingDown, TrendingUp, DollarSign, Zap, Network, BarChart3, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

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
      
      <header className="pb-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Gas Cost Analysis Report</h1>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-gray-400">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="font-mono text-xs">{result.contractName}</span>
          </div>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xs">Report generated on {new Date(result.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </header>

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
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Total Cost</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">L2 Execution</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">L1 Data Cost</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Confidence Level</th>
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
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-semibold text-white font-mono">
                        {formatCurrency(networkResult.deployment.totalCost || networkResult.deployment.costUSD)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">
                        {networkResult.deployment.l2ExecutionCost ? formatCurrency(networkResult.deployment.l2ExecutionCost) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">
                        {networkResult.deployment.l1DataCost ? formatCurrency(networkResult.deployment.l1DataCost) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400">
                        {networkResult.simulationData ? (
                          <div className="flex items-center justify-end gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              networkResult.simulationData.simulationAccuracy === 'HIGH' ? 'bg-green-400' :
                              networkResult.simulationData.simulationAccuracy === 'MEDIUM' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className="text-xs">{networkResult.simulationData.simulationAccuracy}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">STATIC</span>
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