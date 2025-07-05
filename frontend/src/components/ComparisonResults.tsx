import React from 'react';
import { ComparisonResult } from '../lib/api';
import { NetworkComparison } from '@/types/shared';
import { TrendingDown, TrendingUp, DollarSign, Zap, Network } from 'lucide-react';
import { getNetworkDisplayName, getNetworkConfig } from '@/utils/networkConfig';
import { formatCurrency, formatPercentage, getGasPriceFromBreakdown } from '@/utils/gasUtils';

interface ComparisonResultsProps {
  result: ComparisonResult;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({ result }) => {
  const formatGas = (gas: string | number) => {
    const gasNum = typeof gas === 'string' ? parseInt(gas) : gas;
    return new Intl.NumberFormat('en-US').format(gasNum);
  };

  const getSavingsColor = (savings: number) => {
    if (savings > 0) return 'text-green-600';
    if (savings < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSavingsIcon = (savings: number) => {
    return savings > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />;
  };

  // Get all unique function names
  const allFunctions = new Set<string>();
  result.comparisons.forEach(comp => {
    comp.functions.forEach(func => allFunctions.add(func.functionName));
  });
  const functionNames = Array.from(allFunctions);

  // Get network names
  const networks = result.comparisons.map(comp => comp.network);
  const baselineNetwork = 'Sepolia';

  // Use centralized network display name utility

  // Helper to find function data for a specific network
  const getFunctionData = (networkName: string, functionName: string) => {
    const comparison = result.comparisons.find(comp => comp.network === networkName);
    if (!comparison) return null;
    return comparison.functions.find(func => func.functionName === functionName);
  };

  // Helper to get local function data
  const getLocalFunctionData = (functionName: string) => {
    const comparison = result.comparisons[0]; // Assuming first comparison has local data
    if (!comparison) return null;
    return comparison.functions.find(func => func.functionName === functionName);
  };

  // Helper to get native token symbol for a network
  const getNativeTokenSymbol = (networkName: string) => {
    const config = getNetworkConfig(networkName);
    return config?.symbol || 'ETH'; // Default to ETH if not found
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Layer 2 Gas Cost Comparison</h2>
        <p className="text-gray-600">Contract: {result.contractName}</p>
        <p className="text-sm text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Networks Compared</p>
            <p className="text-xl font-bold text-white">{result.comparisons.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Functions Analyzed</p>
            <p className="text-xl font-bold text-white">{functionNames.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Cheapest Network</p>
            <p className="text-xl font-bold text-green-400">
              {result.comparisons.reduce((best, current) => 
                current.summary.totalSavings > best.summary.totalSavings ? current : best
              ).network}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Max Savings</p>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(Math.max(...result.comparisons.map(c => c.summary.totalSavings)))}
            </p>
          </div>
        </div>
      </div>

        {/* Total Savings Summary */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Total Cost Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {result.comparisons.map((comp, index) => (
            <div key={`total-cost-${comp.network}-${index}`} className="text-center p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm font-medium">{getNetworkDisplayName(comp.network)}</p>
              <p className="text-xl font-bold text-white">{formatCurrency(comp.summary.totalL2Cost)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {getSavingsIcon(comp.summary.totalSavings)}
                <span className={`text-sm font-medium ${getSavingsColor(comp.summary.totalSavings)}`}>
                  {comp.summary.totalSavings > 0 ? 'Save' : 'Pay'} {formatCurrency(Math.abs(comp.summary.totalSavings))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Comparison Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Deployment Costs
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-white font-medium">Metric</th>
                <th className="px-4 py-3 text-center text-white font-medium">{baselineNetwork}</th>
                {networks.map((network, index) => (
                  <th key={`metric-${network}-${index}`} className="px-4 py-3 text-center text-white font-medium">{getNetworkDisplayName(network)}</th>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-3 text-left text-white font-medium">Gas Price</th>
                <th className="px-4 py-3 text-center text-white font-medium">
                  {getGasPriceFromBreakdown(result.local?.gasPriceBreakdown, result.local?.gasPrice)}
                </th>
                {result.comparisons.map((comp, index) => (
                  <th key={`gas-price-${comp.network}-${index}`} className="px-4 py-3 text-center text-white font-medium">
                    {getGasPriceFromBreakdown(comp.gasPriceBreakdown, comp.gasPrice)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              <tr className="hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 font-medium">Gas Price</td>
                <td className="px-4 py-3 text-center text-orange-400 font-mono">
                  {getGasPriceFromBreakdown(result.local?.gasPriceBreakdown, result.local?.gasPrice)}
                </td>
                {result.comparisons.map((comp, index) => (
                  <td key={`gas-price-row-${comp.network}-${index}`} className="px-4 py-3 text-center text-orange-400 font-mono">
                    {getGasPriceFromBreakdown(comp.gasPriceBreakdown, comp.gasPrice)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 font-medium">Native Token</td>
                <td className="px-4 py-3 text-center text-blue-400 font-medium">
                  ETH
                </td>
                {result.comparisons.map((comp, index) => (
                  <td key={`native-token-${comp.network}-${index}`} className="px-4 py-3 text-center text-blue-400 font-medium">
                    {getNativeTokenSymbol(comp.network)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 font-medium">Gas Used</td>
                <td className="px-4 py-3 text-center text-white">
                  {formatGas(result.comparisons[0]?.deployment?.baseline?.gasUsed || 0)}
                </td>
                {result.comparisons.map((comp, index) => (
                  <td key={`gas-used-${comp.network}-${index}`} className="px-4 py-3 text-center text-white">
                    {formatGas(comp.deployment?.l2?.gasUsed || 0)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 font-medium">Cost (USD)</td>
                <td className="px-4 py-3 text-center text-white">
                  {formatCurrency(result.comparisons[0]?.deployment?.baseline?.costUSD || 0)}
                </td>
                {result.comparisons.map((comp, index) => (
                  <td key={`cost-usd-${comp.network}-${index}`} className="px-4 py-3 text-center text-white">
                    {formatCurrency(comp.deployment?.l2?.costUSD || 0)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 font-medium">Savings vs Sepolia</td>
                <td className="px-4 py-3 text-center text-gray-400">-</td>
                {result.comparisons.map((comp, index) => (
                  <td key={`savings-${comp.network}-${index}`} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getSavingsIcon(comp.deployment?.savings?.costSavingsUSD || 0)}
                      <span className={getSavingsColor(comp.deployment?.savings?.costSavingsUSD || 0)}>
                        {formatPercentage(comp.deployment?.savings?.percentageSaving || 0)}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Function Costs Comparison Table */}
      {functionNames.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Network className="w-5 h-5" />
              Function Interaction Costs
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-white font-medium">Function</th>
                  <th className="px-4 py-3 text-center text-white font-medium">{baselineNetwork}</th>
                  {networks.map((network, index) => (
                    <th key={`function-header-${network}-${index}`} className="px-4 py-3 text-center text-white font-medium">{getNetworkDisplayName(network)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {functionNames.map((functionName, funcIndex) => {
                  const localFunc = getLocalFunctionData(functionName);
                  return (
                    <tr key={`function-${functionName}-${funcIndex}`} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-300 font-medium">{functionName}</td>
                      <td className="px-4 py-3 text-center">
                        {localFunc ? (
                          <div className="space-y-1">
                            <div className="text-white">{formatCurrency(localFunc.baseline?.costUSD || 0)}</div>
                             <div className="text-gray-400 text-xs font-mono">
                               0%
                             </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      {networks.map((network, networkIndex) => {
                        const funcData = getFunctionData(network, functionName);
                        return (
                          <td key={`function-data-${functionName}-${network}-${funcIndex}-${networkIndex}`} className="px-4 py-3 text-center">
                            {funcData ? (
                              <div className="space-y-1">
                                <div className="text-white">{formatCurrency(funcData.l2?.costUSD || 0)}</div>
                                <div className="flex items-center justify-center gap-1 text-xs">
                                  {getSavingsIcon(funcData.savings?.costSavingsUSD || 0)}
                                  <span className={getSavingsColor(funcData.savings?.costSavingsUSD || 0)}>
                                    {formatPercentage(funcData.savings?.percentageSaving || 0)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default ComparisonResults;