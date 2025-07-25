'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Zap, 
  Clock, 
  Database, 
  TrendingUp, 
  Layers, 
  Network,
  Activity
} from 'lucide-react';

interface LiveBenchmarkResult {
  deploymentCost: {
    gasUsed: number;
    gasPrice: string;
    totalCostWei: string;
    totalCostEth: string;
    totalCostUsd: number;
  };
  functionCosts: {
    functionName: string;
    gasUsed: number;
    gasPrice: string;
    totalCostWei: string;
    totalCostEth: string;
    totalCostUsd: number;
    l1DataCost?: number;
    l2ExecutionCost?: number;
  }[];
  feeComposition: {
    baseFee: string;
    priorityFee: string;
    maxFeePerGas: string;
    gasPrice: string;
    l1DataFee?: string;
  };
  networkMetrics: {
    blockNumber: number;
    blockTimestamp: number;
    gasLimit: string;
    gasUsed: string;
    baseFeePerGas: string;
  };
  executionTime: number;
}

interface NetworkInfo {
  name: string;
  displayName: string;
  chainId: number;
  category: string;
  isLayer2?: boolean;
}

interface Props {
  result: LiveBenchmarkResult;
  network?: NetworkInfo;
}

function formatGwei(wei: string): string {
  const gwei = parseFloat(wei) / 1e9;
  return gwei.toFixed(2);
}

function formatEth(wei: string): string {
  const eth = parseFloat(wei) / 1e18;
  return eth.toFixed(8);
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(amount);
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export default function LiveBenchmarkResults({ result, network }: Props) {
  const totalFunctionCost = result.functionCosts.reduce((sum, fc) => sum + fc.totalCostUsd, 0);
  const totalCost = result.deploymentCost.totalCostUsd + totalFunctionCost;

  return (
    <div className="space-y-6 font-lekton">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-green-500/50 text-green-400">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-400" strokeWidth={2} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Total Cost</p>
              <p className="text-xl font-bold text-white">{formatUsd(totalCost)}</p>
              <p className="text-xs text-gray-500">deployment + functions</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-blue-500/50 text-blue-400">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-blue-400" strokeWidth={2} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Gas Price</p>
              <p className="text-xl font-bold text-white">{formatGwei(result.feeComposition.gasPrice)} gwei</p>
              <p className="text-xs text-gray-500">effective rate</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-purple-500/50 text-purple-400">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-400" strokeWidth={2} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Execution Time</p>
              <p className="text-xl font-bold text-white">{result.executionTime}ms</p>
              <p className="text-xs text-gray-500">total duration</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-amber-500/50 text-amber-400">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-amber-400" strokeWidth={2} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Network</p>
              <p className="text-xl font-bold text-white">{network?.displayName || 'Unknown'}</p>
              <p className="text-xs text-gray-500">chain {network?.chainId}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="deployment" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-700/50">
          <TabsTrigger value="deployment" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Deployment</TabsTrigger>
          <TabsTrigger value="functions" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Functions</TabsTrigger>
          <TabsTrigger value="fees" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Fee Composition</TabsTrigger>
          <TabsTrigger value="network" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Network Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment" className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="p-3 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                Contract Deployment Cost
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Gas Used</span>
                    <span className="font-mono text-white">{result.deploymentCost.gasUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Gas Price</span>
                    <span className="font-mono text-white">{formatGwei(result.deploymentCost.gasPrice)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Total Cost (Wei)</span>
                    <span className="font-mono text-xs text-white">{result.deploymentCost.totalCostWei}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded-lg border border-blue-500/50">
                    <span className="text-sm font-medium text-blue-300">Cost (ETH)</span>
                    <span className="font-mono text-white">{result.deploymentCost.totalCostEth}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-900/20 rounded-lg border border-green-500/50">
                    <span className="text-sm font-medium text-green-300">Cost (USD)</span>
                    <span className="font-mono font-bold text-white">{formatUsd(result.deploymentCost.totalCostUsd)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="p-3 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Function Call Costs
              </h3>
            </div>
            <div className="p-4">
              {result.functionCosts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No function calls were benchmarked</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.functionCosts.map((fc, index) => (
                    <div key={index} className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg text-white">{fc.functionName}</h4>
                        <Badge variant="outline" className="text-green-400 border-green-500/50 bg-green-900/20">{formatUsd(fc.totalCostUsd)}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-gray-400 mb-1">Gas Used</div>
                          <div className="font-mono text-white">{fc.gasUsed.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-gray-400 mb-1">Gas Price</div>
                          <div className="font-mono text-white">{formatGwei(fc.gasPrice)} gwei</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-gray-400 mb-1">Cost (ETH)</div>
                          <div className="font-mono text-white">{fc.totalCostEth}</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-gray-400 mb-1">Cost (USD)</div>
                          <div className="font-mono font-bold text-white">{formatUsd(fc.totalCostUsd)}</div>
                        </div>
                      </div>

                      {/* L2 Specific Costs */}
                      {network?.isLayer2 && (fc.l1DataCost !== undefined || fc.l2ExecutionCost !== undefined) && (
                        <div className="mt-3 pt-3 border-t border-gray-600/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-4 w-4 text-indigo-400" />
                            <span className="text-sm font-medium text-white">L2 Cost Breakdown</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {fc.l1DataCost !== undefined && (
                              <div className="bg-gray-800/50 p-2 rounded">
                                <div className="text-gray-400 mb-1">L1 Data Cost</div>
                                <div className="font-mono text-white">{fc.l1DataCost.toLocaleString()} gas</div>
                              </div>
                            )}
                            {fc.l2ExecutionCost !== undefined && (
                              <div className="bg-gray-800/50 p-2 rounded">
                                <div className="text-gray-400 mb-1">L2 Execution Cost</div>
                                <div className="font-mono text-white">{fc.l2ExecutionCost.toLocaleString()} gas</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="p-3 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Fee Composition
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Base Fee</span>
                    <span className="font-mono text-white">{formatGwei(result.feeComposition.baseFee)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Priority Fee</span>
                    <span className="font-mono text-white">{formatGwei(result.feeComposition.priorityFee)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Max Fee Per Gas</span>
                    <span className="font-mono text-white">{formatGwei(result.feeComposition.maxFeePerGas)} gwei</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded-lg border border-blue-500/50">
                    <span className="text-sm font-medium text-blue-300">Effective Gas Price</span>
                    <span className="font-mono font-bold text-white">{formatGwei(result.feeComposition.gasPrice)} gwei</span>
                  </div>
                  {result.feeComposition.l1DataFee && (
                    <div className="flex justify-between items-center p-3 bg-amber-900/20 rounded-lg border border-amber-500/50">
                      <span className="text-sm font-medium text-amber-300">L1 Data Fee</span>
                      <span className="font-mono text-white">{formatEth(result.feeComposition.l1DataFee)} ETH</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="p-3 border-b border-gray-700/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                Network Metrics
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Block Number</span>
                    <span className="font-mono text-white">{result.networkMetrics.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Block Timestamp</span>
                    <span className="font-mono text-xs text-white">{formatTimestamp(result.networkMetrics.blockTimestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Base Fee Per Gas</span>
                    <span className="font-mono text-white">{formatGwei(result.networkMetrics.baseFeePerGas)} gwei</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Block Gas Limit</span>
                    <span className="font-mono text-white">{parseInt(result.networkMetrics.gasLimit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-600/50">
                    <span className="text-sm font-medium text-gray-300">Block Gas Used</span>
                    <span className="font-mono text-white">{parseInt(result.networkMetrics.gasUsed).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded-lg border border-blue-500/50">
                    <span className="text-sm font-medium text-blue-300">Block Utilization</span>
                    <span className="font-mono font-bold text-white">
                      {((parseInt(result.networkMetrics.gasUsed) / parseInt(result.networkMetrics.gasLimit)) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}