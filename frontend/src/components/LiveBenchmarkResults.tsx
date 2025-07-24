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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">Total Cost</div>
                <div className="text-lg font-bold">{formatUsd(totalCost)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">Gas Price</div>
                <div className="text-lg font-bold">{formatGwei(result.feeComposition.gasPrice)} gwei</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">Execution Time</div>
                <div className="text-lg font-bold">{result.executionTime}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500">Network</div>
                <div className="text-lg font-bold">{network?.displayName || 'Unknown'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deployment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
          <TabsTrigger value="fees">Fee Composition</TabsTrigger>
          <TabsTrigger value="network">Network Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Contract Deployment Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Gas Used</span>
                    <span className="font-mono">{result.deploymentCost.gasUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Gas Price</span>
                    <span className="font-mono">{formatGwei(result.deploymentCost.gasPrice)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Total Cost (Wei)</span>
                    <span className="font-mono text-xs">{result.deploymentCost.totalCostWei}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Cost (ETH)</span>
                    <span className="font-mono">{result.deploymentCost.totalCostEth}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Cost (USD)</span>
                    <span className="font-mono font-bold">{formatUsd(result.deploymentCost.totalCostUsd)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Function Call Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.functionCosts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No function calls were benchmarked</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.functionCosts.map((fc, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg">{fc.functionName}</h4>
                        <Badge variant="secondary">{formatUsd(fc.totalCostUsd)}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Gas Used</div>
                          <div className="font-mono">{fc.gasUsed.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Gas Price</div>
                          <div className="font-mono">{formatGwei(fc.gasPrice)} gwei</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Cost (ETH)</div>
                          <div className="font-mono">{fc.totalCostEth}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Cost (USD)</div>
                          <div className="font-mono font-bold">{formatUsd(fc.totalCostUsd)}</div>
                        </div>
                      </div>

                      {/* L2 Specific Costs */}
                      {network?.isLayer2 && (fc.l1DataCost !== undefined || fc.l2ExecutionCost !== undefined) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-4 w-4" />
                            <span className="text-sm font-medium">L2 Cost Breakdown</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {fc.l1DataCost !== undefined && (
                              <div>
                                <div className="text-gray-500">L1 Data Cost</div>
                                <div className="font-mono">{fc.l1DataCost.toLocaleString()} gas</div>
                              </div>
                            )}
                            {fc.l2ExecutionCost !== undefined && (
                              <div>
                                <div className="text-gray-500">L2 Execution Cost</div>
                                <div className="font-mono">{fc.l2ExecutionCost.toLocaleString()} gas</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Fee Composition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Base Fee</span>
                    <span className="font-mono">{formatGwei(result.feeComposition.baseFee)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Priority Fee</span>
                    <span className="font-mono">{formatGwei(result.feeComposition.priorityFee)} gwei</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Max Fee Per Gas</span>
                    <span className="font-mono">{formatGwei(result.feeComposition.maxFeePerGas)} gwei</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Effective Gas Price</span>
                    <span className="font-mono font-bold">{formatGwei(result.feeComposition.gasPrice)} gwei</span>
                  </div>
                  {result.feeComposition.l1DataFee && (
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium">L1 Data Fee</span>
                      <span className="font-mono">{formatEth(result.feeComposition.l1DataFee)} ETH</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Block Number</span>
                    <span className="font-mono">{result.networkMetrics.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Block Timestamp</span>
                    <span className="font-mono text-xs">{formatTimestamp(result.networkMetrics.blockTimestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Base Fee Per Gas</span>
                    <span className="font-mono">{formatGwei(result.networkMetrics.baseFeePerGas)} gwei</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Block Gas Limit</span>
                    <span className="font-mono">{parseInt(result.networkMetrics.gasLimit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Block Gas Used</span>
                    <span className="font-mono">{parseInt(result.networkMetrics.gasUsed).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Block Utilization</span>
                    <span className="font-mono font-bold">
                      {((parseInt(result.networkMetrics.gasUsed) / parseInt(result.networkMetrics.gasLimit)) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}