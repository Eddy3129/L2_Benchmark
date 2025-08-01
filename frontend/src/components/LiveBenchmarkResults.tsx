'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Zap, 
  Clock, 
  Database, 
  TrendingUp, 
  Layers, 
  Network,
  Activity,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Hash,
  Calendar,
  Cpu,
  BarChart3
} from 'lucide-react';

interface LiveBenchmarkResult {
  contractAddress?: string;
  deploymentCost: {
    gasUsed: number;
    gasPrice: string;
    totalCostWei: string;
    totalCostEth: string;
    totalCostUsd: number;
    transactionHash?: string;
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
    transactionHash?: string;
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

interface ContractBenchmarkSession {
  id: string;
  contractAddress: string;
  contractName?: string;
  deploymentResult: LiveBenchmarkResult;
  executionResult?: LiveBenchmarkResult;
  network: NetworkInfo;
  timestamp: number;
}

interface Props {
  sessions: ContractBenchmarkSession[];
  onClearSessions?: () => void;
}

function formatGwei(wei: string): string {
  const gwei = parseFloat(wei) / 1e9;
  return gwei.toFixed(8);
}

function formatEth(wei: string): string {
  const eth = parseFloat(wei) / 1e18;
  return eth.toFixed(18);
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

export default function LiveBenchmarkResults({ sessions, onClearSessions }: Props) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(`${type}-${text}`);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatContractAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSessionSummary = (session: ContractBenchmarkSession) => {
    const deploymentCost = session.deploymentResult.deploymentCost.totalCostUsd;
    const functionCost = session.executionResult?.functionCosts.reduce((sum, fc) => sum + fc.totalCostUsd, 0) || 0;
    const totalCost = deploymentCost + functionCost;
    const totalGas = session.deploymentResult.deploymentCost.gasUsed + 
      (session.executionResult?.functionCosts.reduce((sum, fc) => sum + fc.gasUsed, 0) || 0);
    
    return { totalCost, totalGas, functionCount: session.executionResult?.functionCosts.length || 0 };
  };

  const getTotalSummary = () => {
    return sessions.reduce((acc, session) => {
      const summary = getSessionSummary(session);
      return {
        totalCost: acc.totalCost + summary.totalCost,
        totalGas: acc.totalGas + summary.totalGas,
        totalFunctions: acc.totalFunctions + summary.functionCount,
        totalContracts: acc.totalContracts + 1
      };
    }, { totalCost: 0, totalGas: 0, totalFunctions: 0, totalContracts: 0 });
  };

  if (sessions.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-gray-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No Benchmark Results</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Deploy and execute contracts to see comprehensive benchmark analysis and gas cost comparisons.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalSummary = getTotalSummary();

  return (
    <div className="space-y-6 font-mono">
      {/* Global Summary Dashboard */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-xl border border-gray-600/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Benchmark Analysis Dashboard</h2>
            <p className="text-gray-400">Comprehensive gas cost analysis across {sessions.length} contract{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          {onClearSessions && (
            <Button 
              onClick={onClearSessions}
              variant="outline" 
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Clear All Sessions
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cost</p>
                <p className="text-xl font-bold text-white">{formatUsd(totalSummary.totalCost)}</p>
                <p className="text-xs text-green-400">{totalSummary.totalContracts} contracts</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Gas</p>
                <p className="text-xl font-bold text-white">{totalSummary.totalGas.toLocaleString()}</p>
                <p className="text-xs text-blue-400">cumulative usage</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Functions</p>
                <p className="text-xl font-bold text-white">{totalSummary.totalFunctions}</p>
                <p className="text-xs text-purple-400">executed</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Avg Cost</p>
                <p className="text-xl font-bold text-white">{formatUsd(totalSummary.totalCost / totalSummary.totalContracts)}</p>
                <p className="text-xs text-amber-400">per contract</p>
              </div>
            </div>
          </div>
        </div>
       </div>

      {/* Contract Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Contract Benchmark Sessions</h3>
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {sessions.map((session, index) => {
          const isExpanded = expandedSessions.has(session.id);
          const summary = getSessionSummary(session);
          
          return (
            <Card key={session.id} className="bg-gray-800/50 border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                      <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-semibold text-white">
                          {session.contractName || `Contract ${index + 1}`}
                        </h4>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                          {session.network.displayName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Hash className="w-4 h-4" />
                          <span className="font-mono">{formatContractAddress(session.contractAddress)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-gray-700"
                            onClick={() => copyToClipboard(session.contractAddress, 'address')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(session.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{formatUsd(summary.totalCost)}</div>
                      <div className="text-sm text-gray-400">{summary.totalGas.toLocaleString()} gas</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSessionExpansion(session.id)}
                      className="hover:bg-gray-700"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <Tabs defaultValue="deployment" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border border-gray-600/50 h-12">
                      <TabsTrigger value="deployment" className="h-10 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Deployment</TabsTrigger>
                      <TabsTrigger value="functions" className="h-10 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Functions</TabsTrigger>
                      <TabsTrigger value="fees" className="h-10 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Fee Analysis</TabsTrigger>
                      <TabsTrigger value="network" className="h-10 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Network Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="deployment" className="space-y-4">
                      <div className="bg-gray-900/30 rounded-lg border border-gray-600/30 p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Cpu className="w-5 h-5 text-green-400" />
                          <h4 className="text-lg font-semibold text-white">Deployment Analysis</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Gas Metrics */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Gas Metrics</h5>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Gas Used</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {session.deploymentResult.deploymentCost.gasUsed.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Gas Price</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.deploymentCost.gasPrice)} gwei
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cost Analysis */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Cost Analysis</h5>
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-300">Cost (ETH)</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {session.deploymentResult.deploymentCost.totalCostEth}
                                </span>
                              </div>
                            </div>
                            <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-green-300">Cost (USD)</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatUsd(session.deploymentResult.deploymentCost.totalCostUsd)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Hash */}
                        {session.deploymentResult.deploymentCost.transactionHash && (
                          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-gray-300">Transaction Hash (Proof of Execution)</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 hover:bg-gray-700"
                                onClick={() => copyToClipboard(session.deploymentResult.deploymentCost.transactionHash!, 'tx')}
                              >
                                {copiedHash === `tx-${session.deploymentResult.deploymentCost.transactionHash}` ? (
                                  <span className="text-green-400 text-xs">Copied!</span>
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
                              <code className="text-green-400 text-xs font-mono break-all leading-relaxed">
                                {session.deploymentResult.deploymentCost.transactionHash}
                              </code>
                            </div>
                          </div>
                        )}

                        {/* Wei Details (Collapsible) */}
                        <div className="mt-4 p-3 bg-gray-800/20 rounded border border-gray-600/30">
                          <div className="text-xs text-gray-500 mb-1">Raw Wei Amount</div>
                          <code className="text-xs font-mono text-gray-400 break-all">
                            {session.deploymentResult.deploymentCost.totalCostWei}
                          </code>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="functions" className="space-y-4">
                      <div className="bg-gray-900/30 rounded-lg border border-gray-600/30 p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity className="w-5 h-5 text-purple-400" />
                          <h4 className="text-lg font-semibold text-white">Function Execution Analysis</h4>
                        </div>
                        
                        {!session.executionResult || session.executionResult.functionCosts.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                              <Activity className="w-8 h-8 text-gray-500" />
                            </div>
                            <h5 className="text-lg font-medium text-gray-300 mb-2">No Function Executions</h5>
                            <p className="text-gray-500 max-w-md mx-auto">
                              This contract was deployed but no functions were executed for benchmarking.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Function Summary */}
                            <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-600/30">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-2xl font-bold text-purple-400">
                                    {session.executionResult.functionCosts.length}
                                  </div>
                                  <div className="text-sm text-gray-400">Functions Executed</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-blue-400">
                                    {session.executionResult.functionCosts.reduce((sum, fc) => sum + fc.gasUsed, 0).toLocaleString()}
                                  </div>
                                  <div className="text-sm text-gray-400">Total Gas Used</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-green-400">
                                    {formatUsd(session.executionResult.functionCosts.reduce((sum, fc) => sum + fc.totalCostUsd, 0))}
                                  </div>
                                  <div className="text-sm text-gray-400">Total Cost</div>
                                </div>
                              </div>
                            </div>

                            {/* Individual Function Results */}
                            <div className="space-y-3">
                              {session.executionResult.functionCosts.map((fc, index) => (
                                <div key={index} className="bg-gray-800/40 border border-gray-600/40 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-purple-400 font-mono text-sm">{index + 1}</span>
                                      </div>
                                      <h5 className="font-semibold text-lg text-white">{fc.functionName}</h5>
                                    </div>
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-3 py-1">
                                      {formatUsd(fc.totalCostUsd)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
                                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Gas Used</div>
                                      <div className="font-mono text-white font-semibold">{fc.gasUsed.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
                                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Gas Price</div>
                                      <div className="font-mono text-white font-semibold">{formatGwei(fc.gasPrice)} gwei</div>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
                                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Cost (ETH)</div>
                                      <div className="font-mono text-white font-semibold">{fc.totalCostEth}</div>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded border border-gray-600/50">
                                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Cost (USD)</div>
                                      <div className="font-mono text-white font-semibold">{formatUsd(fc.totalCostUsd)}</div>
                                    </div>
                                  </div>

                                  {/* Transaction Hash */}
                                  {fc.transactionHash && (
                                    <div className="mt-4 p-3 bg-gray-800/30 rounded border border-gray-600/30">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <ExternalLink className="w-4 h-4 text-green-400" />
                                          <span className="text-sm font-medium text-gray-300">Transaction Hash</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-2 hover:bg-gray-700"
                                          onClick={() => copyToClipboard(fc.transactionHash!, 'tx')}
                                        >
                                          {copiedHash === `tx-${fc.transactionHash}` ? (
                                            <span className="text-green-400 text-xs">Copied!</span>
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </Button>
                                      </div>
                                      <code className="text-green-400 text-xs font-mono break-all block bg-gray-900/50 p-2 rounded">
                                        {fc.transactionHash}
                                      </code>
                                    </div>
                                  )}

                                  {/* L2 Specific Costs */}
                                  {session.network.isLayer2 && (fc.l1DataCost !== undefined || fc.l2ExecutionCost !== undefined) && (
                                    <div className="mt-4 p-3 bg-amber-900/10 rounded border border-amber-500/30">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Layers className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm font-medium text-amber-300">Layer 2 Cost Breakdown</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {fc.l1DataCost !== undefined && (
                                          <div className="bg-gray-800/50 p-3 rounded border border-gray-600/50">
                                            <div className="text-xs text-gray-400 mb-1">L1 Data Cost</div>
                                            <div className="font-mono text-white">{fc.l1DataCost.toLocaleString()} gas</div>
                                          </div>
                                        )}
                                        {fc.l2ExecutionCost !== undefined && (
                                          <div className="bg-gray-800/50 p-3 rounded border border-gray-600/50">
                                            <div className="text-xs text-gray-400 mb-1">L2 Execution Cost</div>
                                            <div className="font-mono text-white">{fc.l2ExecutionCost.toLocaleString()} gas</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="fees" className="space-y-4">
                      <div className="bg-gray-900/30 rounded-lg border border-gray-600/30 p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-amber-400" />
                          <h4 className="text-lg font-semibold text-white">Fee Structure Analysis</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Base Fee Structure */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Fee Components</h5>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Base Fee</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.feeComposition.baseFee)} gwei
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Priority Fee</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.feeComposition.priorityFee)} gwei
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Max Fee Per Gas</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.feeComposition.maxFeePerGas)} gwei
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Effective Pricing */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Effective Pricing</h5>
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-300">Effective Gas Price</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.feeComposition.gasPrice)} gwei
                                </span>
                              </div>
                            </div>
                            {session.deploymentResult.feeComposition.l1DataFee && (
                              <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/50">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-amber-300">L1 Data Fee</span>
                                  <span className="font-mono text-lg font-semibold text-white">
                                    {formatEth(session.deploymentResult.feeComposition.l1DataFee)} ETH
                                  </span>
                                </div>
                              </div>
                            )}
                            
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="network" className="space-y-4">
                      <div className="bg-gray-900/30 rounded-lg border border-gray-600/30 p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Network className="w-5 h-5 text-cyan-400" />
                          <h4 className="text-lg font-semibold text-white">Network State Analysis</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Block Information */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Block Information</h5>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Block Number</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {session.deploymentResult.networkMetrics.blockNumber.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Block Timestamp</span>
                                <span className="font-mono text-sm font-semibold text-white">
                                  {formatTimestamp(session.deploymentResult.networkMetrics.blockTimestamp)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Base Fee Per Gas</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {formatGwei(session.deploymentResult.networkMetrics.baseFeePerGas)} gwei
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Network Utilization */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Network Utilization</h5>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Block Gas Limit</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {parseInt(session.deploymentResult.networkMetrics.gasLimit).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Block Gas Used</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {parseInt(session.deploymentResult.networkMetrics.gasUsed).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {/* <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/50">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-blue-300">Block Utilization</span>
                                <span className="font-mono text-lg font-semibold text-white">
                                  {(() => {
                                    const gasUsed = parseInt(session.deploymentResult.networkMetrics.gasUsed);
                                    const gasLimit = parseInt(session.deploymentResult.networkMetrics.gasLimit);
                                    
                                    // Handle unrealistic gas limit values from forked networks
                                    if (gasLimit > 1000000000000 || gasLimit <= 0) {
                                      return 'N/A';
                                    }
                                    
                                    const utilization = (gasUsed / gasLimit) * 100;
                                    return utilization.toFixed(2) + '%';
                                  })()}
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" 
                                  style={{ 
                                    width: `${(() => {
                                      const gasUsed = parseInt(session.deploymentResult.networkMetrics.gasUsed);
                                      const gasLimit = parseInt(session.deploymentResult.networkMetrics.gasLimit);
                                      
                                      // Handle unrealistic gas limit values from forked networks
                                      if (gasLimit > 1000000000000 || gasLimit <= 0) {
                                        return 0;
                                      }
                                      
                                      const utilization = (gasUsed / gasLimit) * 100;
                                      return Math.min(utilization, 100); // Cap at 100%
                                    })()}%` 
                                  }}
                                ></div>
                              </div>
                            </div> */}
                          </div>
                        </div>

                        {/* Network Summary */}
                        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Network className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-gray-300">Network Summary</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-cyan-400">{session.network.displayName}</div>
                              <div className="text-xs text-gray-400">Network</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-cyan-400">{session.network.chainId}</div>
                              <div className="text-xs text-gray-400">Chain ID</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-cyan-400">
                                {session.network.isLayer2 ? 'Layer 2' : 'Layer 1'}
                              </div>
                              <div className="text-xs text-gray-400">Type</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}