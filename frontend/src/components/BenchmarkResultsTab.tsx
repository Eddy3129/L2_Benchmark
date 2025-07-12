'use client';

import React, { useState } from 'react';
import { BarChart3, Clock, Zap, TrendingUp, Network, DollarSign, AlertCircle } from 'lucide-react';
import { NETWORK_CONFIGS } from '@/utils/networkConfig';

interface BenchmarkResult {
  id: string;
  contractName: string;
  networks: string[];
  results: any;
  timestamp: string;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  createdAt: string;
}

interface BenchmarkResultsTabProps {
  benchmarkResult: BenchmarkResult | null;
}

export function BenchmarkResultsTab({ benchmarkResult }: BenchmarkResultsTabProps) {
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'networks' | 'functions' | 'comparison'>('overview');

  if (!benchmarkResult) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">No Benchmark Results</h3>
        <p className="text-gray-500">Run a benchmark to see detailed analysis results here.</p>
      </div>
    );
  }

  const contracts = benchmarkResult.results?.contracts || [];
  const executionSummary = benchmarkResult.results?.executionSummary;
  const hasError = benchmarkResult.results?.error;
  
  const totalGasUsed = contracts.reduce((sum: number, contract: any) => 
    sum + parseInt(contract.transactions?.totalGasUsed || '0'), 0
  );
  const totalFees = contracts.reduce((sum: number, contract: any) => 
    sum + parseFloat(contract.transactions?.totalFees || '0'), 0
  );
  
  // Use executionSummary if available, otherwise calculate from contracts
  const successRate = executionSummary ? 
    executionSummary.successRate : 
    (contracts.length > 0 ? 
      (contracts.reduce((sum: number, contract: any) => 
        sum + (contract.transactions?.successfulTransactions || 0), 0
      ) / Math.max(1, contracts.reduce((sum: number, contract: any) => 
        sum + (contract.transactions?.totalTransactions || 0), 0
      ))) * 100 : 0);

  const getNetworkConfig = (networkId: string) => {
    return NETWORK_CONFIGS[networkId];
  };

  const formatGas = (gas: number) => {
    if (gas >= 1000000) return `${(gas / 1000000).toFixed(2)}M`;
    if (gas >= 1000) return `${(gas / 1000).toFixed(1)}K`;
    return gas.toString();
  };

  const formatTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {hasError && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-medium text-red-400">Execution Error</h3>
          </div>
          <p className="text-red-300">{hasError}</p>
          <p className="text-red-400 text-sm mt-2">
            The benchmark execution failed. Please check your wallet balance, network connectivity, and contract configuration.
          </p>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{benchmarkResult.contractName}</h2>
            <p className="text-gray-400">Benchmark completed on {new Date(benchmarkResult.timestamp).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Network className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Networks</span>
            </div>
            <div className="text-2xl font-bold text-white">{contracts.length}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Total Gas</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatGas(totalGasUsed)}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Total Fees</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalFees.toFixed(6)} ETH</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Avg Time</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatTime(benchmarkResult.avgExecutionTime)}</div>
          </div>
        </div>
      </div>

      {/* Execution Details */}
      {executionSummary && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-400" />
            Execution Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{executionSummary.totalTransactions || 0}</div>
              <div className="text-sm text-gray-400">Total Transactions</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{executionSummary.successfulTransactions || 0}</div>
              <div className="text-sm text-gray-400">Successful</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{(executionSummary.totalGasUsed || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Gas Used</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{(executionSummary.avgExecutionTime || 0).toFixed(2)}s</div>
              <div className="text-sm text-gray-400">Avg Execution Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'networks', label: 'Network Analysis', icon: Network },
              { id: 'functions', label: 'Function Performance', icon: Zap },
              { id: 'comparison', label: 'Cross-Network Comparison', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveResultTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeResultTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeResultTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Benchmark Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Execution Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Operations:</span>
                      <span className="text-white">{benchmarkResult.totalOperations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Gas Used:</span>
                      <span className="text-white">{formatGas(benchmarkResult.avgGasUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Execution Time:</span>
                      <span className="text-white">{formatTime(benchmarkResult.avgExecutionTime)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Network Coverage</h4>
                  <div className="space-y-2">
                    {contracts.map((contract: any, index: number) => {
                      const networkConfig = getNetworkConfig(contract.networkId);
                      return (
                        <div key={contract.networkId} className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: networkConfig?.color || '#6b7280' }}
                          ></div>
                          <span className="text-gray-300">{networkConfig?.name}</span>
                          <span className="text-green-400 text-sm">✓</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Transaction Details */}
              {contracts.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Transaction Details</h3>
                  <div className="space-y-3">
                    {contracts.map((contract: any, contractIndex: number) => {
                      const networkConfig = getNetworkConfig(contract.networkId);
                      return (
                        <div key={contractIndex} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: networkConfig?.color || '#6B7280' }}
                              ></div>
                              <span className="text-white font-medium">{networkConfig?.name || contract.networkId}</span>
                              <span className="text-gray-400">({contract.name})</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">
                                {contract.transactions?.successfulTransactions || 0}/{contract.transactions?.totalTransactions || 0} transactions
                              </div>
                              <div className="text-sm text-gray-400">
                                {contract.transactions?.totalGasUsed || 0} gas used
                              </div>
                            </div>
                          </div>
                          {contract.transactions?.details && contract.transactions.details.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <h4 className="text-sm font-medium text-gray-300">Transaction Hashes:</h4>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {contract.transactions.details.map((tx: any, txIndex: number) => (
                                  <div key={txIndex} className="flex items-center justify-between text-xs bg-gray-600 rounded p-2">
                                    <span className="text-gray-300">{tx.functionName}</span>
                                    <a 
                                      href={`${networkConfig?.explorerUrl}/tx/${tx.hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 font-mono"
                                    >
                                      {tx.hash ? `${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}` : 'N/A'}
                                    </a>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      tx.status === 'confirmed' ? 'bg-green-600 text-green-100' :
                                      tx.status === 'failed' ? 'bg-red-600 text-red-100' :
                                      'bg-yellow-600 text-yellow-100'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeResultTab === 'networks' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Network Performance Analysis</h3>
              <div className="space-y-4">
                {contracts.map((contract: any) => {
                  const networkConfig = getNetworkConfig(contract.networkId);
                  return (
                    <div key={contract.networkId} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: networkConfig?.color || '#6b7280' }}
                        ></div>
                        <h4 className="text-lg font-medium text-white">{networkConfig?.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Total Gas</div>
                          <div className="text-lg font-medium text-white">
                            {formatGas(parseInt(contract.transactions?.totalGasUsed || '0'))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Total Fees</div>
                          <div className="text-lg font-medium text-white">
                            {parseFloat(contract.transactions?.totalFees || '0').toFixed(6)} ETH
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Transactions</div>
                          <div className="text-lg font-medium text-white">
                            {contract.transactions?.successfulTransactions || 0}/{contract.transactions?.totalTransactions || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Success Rate</div>
                          <div className="text-lg font-medium text-green-400">
                            {contract.transactions?.totalTransactions > 0 ? 
                              ((contract.transactions.successfulTransactions / contract.transactions.totalTransactions) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeResultTab === 'functions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Function Performance Analysis</h3>
              <div className="space-y-4">
                {contracts.map((contract: any) => {
                  const networkConfig = getNetworkConfig(contract.networkId);
                  return (
                    <div key={contract.networkId} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: networkConfig?.color || '#6b7280' }}
                        ></div>
                        <h4 className="text-lg font-medium text-white">{networkConfig?.name}</h4>
                      </div>
                      {contract.functions && contract.functions.length > 0 ? (
                        <div className="space-y-3">
                          {contract.functions.map((func: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                              <div className="flex items-center space-x-3">
                                <span className="text-white font-medium">{func.name}</span>
                                {func.success ? (
                                  <span className="text-green-400 text-sm">✓</span>
                                ) : (
                                  <span className="text-red-400 text-sm">✗</span>
                                )}
                              </div>
                              <div className="flex space-x-6 text-sm">
                                <div>
                                  <span className="text-gray-400">Gas: </span>
                                  <span className="text-white">{formatGas(func.gasUsed)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Time: </span>
                                  <span className="text-white">{formatTime(func.executionTime)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-4">
                          No function data available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeResultTab === 'comparison' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Cross-Network Comparison</h3>
              
              {/* Gas Usage Comparison */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-300 mb-4">Gas Usage Comparison</h4>
                <div className="space-y-3">
                  {contracts
                    .sort((a: any, b: any) => parseInt(b.transactions?.totalGasUsed || '0') - parseInt(a.transactions?.totalGasUsed || '0'))
                    .map((contract: any, index: number) => {
                      const networkConfig = getNetworkConfig(contract.networkId);
                      const gasUsed = parseInt(contract.transactions?.totalGasUsed || '0');
                      const maxGas = Math.max(...contracts.map((c: any) => parseInt(c.transactions?.totalGasUsed || '0')));
                      const percentage = maxGas > 0 ? (gasUsed / maxGas) * 100 : 0;
                      
                      return (
                        <div key={contract.networkId} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: networkConfig?.color || '#6b7280' }}
                              ></div>
                              <span className="text-white">{networkConfig?.name}</span>
                            </div>
                            <span className="text-gray-300">{formatGas(gasUsed)}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: networkConfig?.color || '#6b7280'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Cost Comparison */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-300 mb-4">Cost Comparison</h4>
                <div className="space-y-3">
                  {contracts
                    .sort((a: any, b: any) => parseFloat(b.transactions?.totalFees || '0') - parseFloat(a.transactions?.totalFees || '0'))
                    .map((contract: any) => {
                      const networkConfig = getNetworkConfig(contract.networkId);
                      const fees = parseFloat(contract.transactions?.totalFees || '0');
                      const maxFees = Math.max(...contracts.map((c: any) => parseFloat(c.transactions?.totalFees || '0')));
                      const percentage = maxFees > 0 ? (fees / maxFees) * 100 : 0;
                      
                      return (
                        <div key={contract.networkId} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: networkConfig?.color || '#6b7280' }}
                              ></div>
                              <span className="text-white">{networkConfig?.name}</span>
                            </div>
                            <span className="text-gray-300">{fees.toFixed(6)} ETH</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: networkConfig?.color || '#6b7280'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BenchmarkResultsTab;