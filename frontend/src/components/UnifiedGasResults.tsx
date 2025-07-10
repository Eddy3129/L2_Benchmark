import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { NetworkResult } from '@/types/shared';
import { NETWORK_CONFIGS, getNetworkDisplayName } from '@/utils/networkConfig';
import { formatCurrency } from '@/utils/gasUtils';
import { TrendingDown, TrendingUp, DollarSign, Zap, Network, BarChart3, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

// --- Constants ---
const CHART_PALETTE = {
  primary: 'rgba(99, 102, 241, 0.8)', // indigo-500 with opacity
  primary_border: 'rgba(99, 102, 241, 1)',
  secondary: 'rgba(59, 130, 246, 0.8)', // blue-500 with opacity
  secondary_border: 'rgba(59, 130, 246, 1)',
};

// --- Component ---
export function UnifiedGasResults({ result }: UnifiedGasResultsProps) {
  // --- Memoized Calculations ---

  const baselineNetwork = useMemo(() => {
    if (!result || !result.results || result.results.length === 0) {
      return null;
    }
    return result.results.reduce((cheapest, current) => 
      current.deployment.costUSD < cheapest.deployment.costUSD ? current : cheapest
    );
  }, [result]);

  const summaryStats = useMemo(() => {
    if (!result || !result.results || result.results.length === 0 || !baselineNetwork) {
      return null;
    }
    
    const deploymentCosts = result.results.map(r => r.deployment.costUSD);
    const minCost = Math.min(...deploymentCosts);
    const maxCost = Math.max(...deploymentCosts);
    const totalDeploymentCost = result.results.reduce((sum, r) => sum + r.deployment.costUSD, 0);
    const totalFunctionCost = result.results.reduce((sum, r) => 
      sum + r.functions.reduce((funcSum, f) => funcSum + (f.estimatedCostUSD || 0), 0), 0
    );

    return {
      totalDeploymentCost,
      totalFunctionCost,
      networksAnalyzed: result.results.length,
      totalFunctions: result.results.reduce((sum, r) => sum + r.functions.length, 0),
      maxSavings: maxCost - minCost,
      cheapestNetwork: baselineNetwork
    };
  }, [result, baselineNetwork]);

  const deploymentCostData = useMemo(() => {
    if (!result) return { labels: [], datasets: [] };
    const networks = result.results.map(r => getNetworkDisplayName(r.network));
    const costs = result.results.map(r => r.deployment.costUSD);

    return {
      labels: networks,
      datasets: [
        {
          label: 'Deployment Cost (USD)',
          data: costs,
          backgroundColor: CHART_PALETTE.primary,
          borderColor: CHART_PALETTE.primary_border,
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }, [result]);

  const functionCostData = useMemo(() => {
    if (!result) return { labels: [], datasets: [] };
    const networks = result.results.map(r => getNetworkDisplayName(r.network));
    const functionCosts = result.results.map(r => 
      r.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0)
    );

    return {
      labels: networks,
      datasets: [
        {
          label: 'Function Cost (USD)',
          data: functionCosts,
          backgroundColor: CHART_PALETTE.secondary,
          borderColor: CHART_PALETTE.secondary_border,
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }, [result]);

  // --- Chart Options ---
  const chartOptions: ChartOptions<'bar'> = {
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
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 10, family: 'Lekton' } },
        grid: { color: 'rgba(55, 65, 81, 0.5)' }
      },
      y: {
        type: 'linear',
        ticks: { 
          color: '#9ca3af', 
          font: { size: 10, family: 'Lekton' },
          callback: (value: any) => formatCurrency(value)
        },
        grid: { color: 'rgba(55, 65, 81, 0.5)' }
      }
    },
  };

  // --- Helper Functions ---
  const getSavings = (networkResult: NetworkResult) => {
    if (!baselineNetwork) return { savings: 0, percentage: 0 };
    const savings = baselineNetwork.deployment.costUSD - networkResult.deployment.costUSD;
    const percentage = baselineNetwork.deployment.costUSD > 0 
      ? (savings / baselineNetwork.deployment.costUSD) * 100 
      : 0;
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
      
      {/* Header */}
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

      {/* Summary Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={CheckCircle} 
          title="Cheapest Network" 
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
          title="Functions Analyzed" 
          value={summaryStats.totalFunctions.toString()}
          subtitle="total functions"
          color="amber"
        />
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Deployment Costs by Network">
          <Bar data={deploymentCostData} options={chartOptions} />
        </ChartCard>
        <ChartCard title="Total Function Costs by Network">
          <Bar data={functionCostData} options={chartOptions} />
        </ChartCard>
      </section>

      {/* Detailed Table */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">Detailed Breakdown</h3>
        <div className="overflow-hidden border border-gray-700 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-white sm:pl-4">Network</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Deploy Cost</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Deploy Gas</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Gas Price</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">Function Cost</th>
                  <th scope="col" className="px-2 py-3 text-right text-xs font-semibold text-white">vs. Cheapest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {result.results.map((networkResult) => {
                  const config = NETWORK_CONFIGS[networkResult.network];
                  const totalFunctionCost = networkResult.functions.reduce((sum, f) => sum + (f.estimatedCostUSD || 0), 0);
                  const savings = getSavings(networkResult);
                  const isBaseline = networkResult.network === baselineNetwork.network;
                  
                  return (
                    <tr key={networkResult.network} className="hover:bg-gray-800/50 transition-colors">
                      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-xs sm:pl-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 flex items-center">
                             <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config?.color || '#3b82f6' }}></div>
                          </div>
                          <div className="ml-2">
                            <div className="font-medium text-white">{getNetworkDisplayName(networkResult.network)}</div>
                            {isBaseline && <div className="text-green-400 text-xs mt-0.5">Cheapest</div>}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs font-semibold text-white font-mono">{formatCurrency(networkResult.deployment.costUSD)}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">{parseInt(networkResult.deployment.gasUsed).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-gray-400 font-mono">{parseFloat(networkResult.gasPrice).toFixed(2)} Gwei</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-white font-mono">{formatCurrency(totalFunctionCost)}</td>
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

// --- Sub-components for better structure ---

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
  const color = isSavings ? 'text-green-400' : 'text-red-400';
  const Icon = isSavings ? TrendingDown : TrendingUp;

  return (
    <div className={`flex items-center justify-end gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="font-medium font-mono text-xs">{Math.abs(percentage).toFixed(1)}%</span>
    </div>
  );
};
