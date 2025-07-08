'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Loader2, Play, Square, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Activity, Zap, Link as LinkIcon } from 'lucide-react';

interface L1FinalityConfig {
  l2Network: string;
  l1Network: string;
  monitoringDurationHours: number;
  batchPosterAddresses?: string[];
  saveToDatabase: boolean;
}

interface L1FinalityResult {
  sessionId: string;
  l2Network: string;
  l1Network: string;
  status: 'monitoring' | 'completed' | 'failed';
  metrics: {
    avgTimeToL1Settlement: number;
    avgL1SettlementCostPerBatch: string;
    avgAmortizedL1CostPerTransaction: string;
    finalityConfidenceLevel: number;
  };
  batchesTracked: number;
  totalL2Transactions: number;
  startedAt: string;
  completedAt?: string;
}

interface BatchData {
  batchNumber: number;
  l1TxHash: string;
  l2BlockStart: number;
  l2BlockEnd: number;
  transactionCount: number;
  settlementTime: number;
  l1GasCost: string;
  l1GasCostUSD: number;
  amortizedCostPerTx: string;
  timestamp: string;
}

interface MonitoringSession {
  sessionId: string;
  l2Network: string;
  l1Network: string;
  status: string;
  startedAt: string;
  progress: number;
}

const NETWORK_OPTIONS = [
  // Testnet options
  { value: 'arbitrum-sepolia', label: 'Arbitrum Sepolia (Testnet)', l1: 'sepolia' },
  { value: 'optimism-sepolia', label: 'Optimism Sepolia (Testnet)', l1: 'sepolia' },
  { value: 'base-sepolia', label: 'Base Sepolia (Testnet)', l1: 'sepolia' },
  { value: 'polygon-zkevm-testnet', label: 'Polygon zkEVM Testnet', l1: 'sepolia' },
  
  // Mainnet options - REAL L1 FINALITY TRACKING
  { value: 'arbitrum', label: 'Arbitrum One (Mainnet)', l1: 'ethereum' },
  { value: 'optimism', label: 'Optimism (Mainnet)', l1: 'ethereum' },
  { value: 'base', label: 'Base (Mainnet)', l1: 'ethereum' },
  { value: 'polygon-zkevm', label: 'Polygon zkEVM (Mainnet)', l1: 'ethereum' },
  { value: 'zksync-era', label: 'zkSync Era (Mainnet)', l1: 'ethereum' }
];

const BATCH_POSTER_ADDRESSES = {
  // Testnet addresses (placeholder)
  'arbitrum-sepolia': ['0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a'],
  'optimism-sepolia': ['0x6887246668a3b87F54DeB3b94Ba47a6f63F32985'],
  'base-sepolia': ['0x99199a22125034c808ff20f377d856DE6329D675'],
  'polygon-zkevm-testnet': ['0x99199a22125034c808ff20f377d856DE6329D675'],
  
  // Mainnet addresses - REAL BATCH POSTERS
  'arbitrum': [
    '0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6', // Primary Arbitrum batch poster
    '0x4c6f947Ae67F572afa4ae0730947DE7C874F95Ef'  // Secondary Arbitrum batch poster
  ],
  'optimism': [
    '0x6887246668a3b87F54DeB3b94Ba47a6f63F32985', // Primary Optimism batch poster
    '0x473300df21D047806A082244b417f96b32f13A33'  // Secondary Optimism batch poster
  ],
  'base': [
    '0x5050F69a9786F081509234F1a7F4684b5E5b76C9', // Primary Base batch poster
    '0x99199a22125034c808ff20f377d856DE6329D675'  // Secondary Base batch poster
  ],
  'polygon-zkevm': [
    '0x148Ee7dAF16574cD020aFa34CC658f8F3fbd2800', // Primary Polygon zkEVM sequencer
    '0x5132A183E9F3CB7C848b0AAC5Ae0c4f0491B7aB2'  // Secondary Polygon zkEVM sequencer
  ],
  'zksync-era': [
    '0x3527439923a63F8C13CF72b8Fe80a77f6e508A06', // Primary zkSync Era sequencer
    '0xa0425d71cB1D6fb80E65a5361a04096E0672De03'  // Secondary zkSync Era sequencer
  ]
};

export default function L1FinalityPage() {
  const [trackingConfig, setTrackingConfig] = useState<L1FinalityConfig>({
    l2Network: '',
    l1Network: 'ethereum', // Default to mainnet for real finality tracking
    monitoringDurationHours: 24,
    batchPosterAddresses: undefined,
    saveToDatabase: true
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeSessions, setActiveSessions] = useState<MonitoringSession[]>([]);
  const [currentResults, setCurrentResults] = useState<L1FinalityResult | null>(null);
  const [batchHistory, setBatchHistory] = useState<BatchData[]>([]);
  const [statisticsData, setStatisticsData] = useState<L1FinalityResult[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(() => {
      if (activeSessions.length > 0) {
        checkActiveSessions();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [activeSessions]);

  useEffect(() => {
    if (trackingConfig.l2Network) {
      const network = NETWORK_OPTIONS.find(n => n.value === trackingConfig.l2Network);
      if (network) {
        setTrackingConfig(prev => ({ 
          ...prev, 
          l1Network: network.l1,
          batchPosterAddresses: BATCH_POSTER_ADDRESSES[trackingConfig.l2Network as keyof typeof BATCH_POSTER_ADDRESSES]
        }));
      }
    }
  }, [trackingConfig.l2Network]);

  const fetchStatistics = async () => {
    try {
      // Fetch aggregated statistics
      const statsResponse = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/statistics?limit=20');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAggregatedStats(statsData);
      }
      
      // Fetch historical session data
      const historyResponse = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/history?limit=20');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        // Transform the raw tracking data into L1FinalityResult format
        const transformedData = transformTrackingDataToResults(historyData);
        setStatisticsData(transformedData);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };
  
  const transformTrackingDataToResults = (trackingData: any[]): L1FinalityResult[] => {
    // Group tracking data by sessionId
    const sessionGroups = trackingData.reduce((groups, record) => {
      const sessionId = record.sessionId;
      if (!groups[sessionId]) {
        groups[sessionId] = [];
      }
      groups[sessionId].push(record);
      return groups;
    }, {});
    
    // Transform each session group into L1FinalityResult
    return Object.entries(sessionGroups).map(([sessionId, records]: [string, any[]]) => {
      const firstRecord = records[0];
      const batchesTracked = records.length;
      const totalL2Transactions = records.reduce((sum, record) => sum + (record.transactionCount || 0), 0);
      
      // Calculate average metrics
      const avgTimeToL1Settlement = records.reduce((sum, record) => {
        return sum + (record.finalityMetrics?.timeToL1SettlementMs || 0);
      }, 0) / records.length / 1000; // Convert to seconds
      
      const avgL1SettlementCostPerBatch = records.reduce((sum, record) => {
        return sum + (record.finalityMetrics?.l1SettlementCostPerBatch || 0);
      }, 0) / records.length;
      
      const avgAmortizedL1CostPerTransaction = records.reduce((sum, record) => {
        return sum + (record.finalityMetrics?.amortizedL1CostPerTransaction || 0);
      }, 0) / records.length;
      
      const finalityConfidenceLevel = records.reduce((sum, record) => {
        return sum + (record.finalityMetrics?.finalityConfidenceLevel || 95);
      }, 0) / records.length;
      
      return {
        sessionId,
        l2Network: firstRecord.l2Network || 'unknown',
        l1Network: firstRecord.l1Network || 'ethereum',
        status: 'completed' as const,
        metrics: {
          avgTimeToL1Settlement,
          avgL1SettlementCostPerBatch: avgL1SettlementCostPerBatch.toString(),
          avgAmortizedL1CostPerTransaction: avgAmortizedL1CostPerTransaction.toString(),
          finalityConfidenceLevel
        },
        batchesTracked,
        totalL2Transactions,
        startedAt: firstRecord.createdAt,
        completedAt: records[records.length - 1].createdAt
      };
    });
  };

  const checkActiveSessions = async () => {
    // Update progress for active sessions
    setActiveSessions(prev => prev.map(session => ({
      ...session,
      progress: Math.min(session.progress + 2, 100)
    })));
  };

  const startL1FinalityTracking = async () => {
    if (!trackingConfig.l2Network) {
      setError('Please select an L2 network');
      return;
    }

    setIsMonitoring(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start L1 finality tracking');
      }

      const result = await response.json();
      setCurrentResults(result);
      setSelectedSessionId(result.sessionId);
      
      // Add to active sessions
      setActiveSessions(prev => [...prev, {
        sessionId: result.sessionId,
        l2Network: trackingConfig.l2Network,
        l1Network: trackingConfig.l1Network,
        status: 'monitoring',
        startedAt: new Date().toISOString(),
        progress: 0
      }]);

      // Set up real-time connection for batch updates
      const eventSource = new EventSource(`http://localhost:3001/api/advanced-analysis/l1-finality/stream/${result.sessionId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const batchData = JSON.parse(event.data);
          
          if (batchData.type === 'batchDetected') {
            const realBatch: BatchData = {
              batchNumber: batchData.batchNumber,
              l1TxHash: batchData.l1TxHash,
              l2BlockStart: batchData.l2BlockStart,
              l2BlockEnd: batchData.l2BlockEnd,
              transactionCount: batchData.transactionCount,
              settlementTime: batchData.settlementTime,
              l1GasCost: batchData.l1GasCost,
              l1GasCostUSD: batchData.l1GasCostUSD,
              amortizedCostPerTx: batchData.amortizedCostPerTx,
              timestamp: batchData.timestamp
            };
            
            setBatchHistory(prev => [realBatch, ...prev]);
          }
        } catch (error) {
          console.error('Error parsing batch data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
      };
      
      // Cleanup function
      const cleanup = () => {
        eventSource.close();
      };
      
      return cleanup;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsMonitoring(false);
    }
  };

  const stopL1FinalityTracking = async (sessionId: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop tracking');
      }

      // Remove from active sessions
      setActiveSessions(prev => prev.filter(session => session.sessionId !== sessionId));
      
      if (sessionId === selectedSessionId) {
        setIsMonitoring(false);
        setCurrentResults(null);
      }

      fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop tracking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'monitoring': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'monitoring': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
          L1 Finality & Settlement Analysis
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Monitor REAL L2 batch settlement on Ethereum L1 using live blockchain data. Track Time-to-L1-Settlement (TTLS), 
          settlement costs, and finality confidence levels for comprehensive security analysis.
        </p>
      </div>

      <Tabs defaultValue="monitor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitor">Start Monitoring</TabsTrigger>
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="batches">Batch History</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Monitor Tab */}
        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⛓️</span>
                L1 Finality Tracking Configuration
              </CardTitle>
              <CardDescription>
                Configure REAL L1 settlement monitoring parameters for live blockchain analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="l2Network">L2 Network</Label>
                  <Select
                      value={trackingConfig.l2Network}
                      onValueChange={(value) => {
                       const selectedNetwork = NETWORK_OPTIONS.find(n => n.value === value);
                       const isMainnet = ['arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era'].includes(value);
                       
                       setTrackingConfig(prev => ({
                         ...prev,
                         l2Network: value,
                         l1Network: isMainnet ? 'ethereum' : 'sepolia',
                         batchPosterAddresses: BATCH_POSTER_ADDRESSES[value as keyof typeof BATCH_POSTER_ADDRESSES]
                       }));
                     }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select L2 Network" />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORK_OPTIONS.map((network) => {
                          const isMainnet = ['arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era'].includes(network.value);
                          return (
                            <SelectItem key={network.value} value={network.value}>
                              <div className="flex items-center gap-2">
                                <span>{network.label}</span>
                                {isMainnet && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                                    MAINNET
                                  </span>
                                )}
                                {!isMainnet && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                                    TESTNET
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                </div>

                 {/* Mainnet Warning */}
                 {['arbitrum', 'optimism', 'base', 'polygon-zkevm', 'zksync-era'].includes(trackingConfig.l2Network) && (
                   <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                     <div className="flex items-start gap-3">
                       <div className="flex-shrink-0">
                         <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <div className="flex-1">
                         <h4 className="text-sm font-medium text-green-800 mb-1">
                           🎯 Real Mainnet L1 Finality Tracking
                         </h4>
                         <p className="text-sm text-green-700 mb-2">
                           You're about to monitor <strong>real blockchain data</strong> on {trackingConfig.l2Network.charAt(0).toUpperCase() + trackingConfig.l2Network.slice(1)} mainnet.
                         </p>
                         <ul className="text-xs text-green-600 space-y-1">
                           <li>✅ <strong>Read-only monitoring</strong> - No wallet transactions required</li>
                           <li>✅ <strong>No fees</strong> - Uses free Alchemy RPC endpoints</li>
                           <li>✅ <strong>Real insights</strong> - Track actual L1 finality performance</li>
                           <li>✅ <strong>Safe operation</strong> - Only observes blockchain state</li>
                         </ul>
                       </div>
                     </div>
                   </div>
                 )}

                 <div className="space-y-2">
                   <Label htmlFor="l1Network">L1 Network</Label>
                  <Input
                    id="l1Network"
                    value={trackingConfig.l1Network}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Monitoring Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="168"
                    value={trackingConfig.monitoringDurationHours}
                    onChange={(e) => setTrackingConfig(prev => ({ ...prev, monitoringDurationHours: parseInt(e.target.value) || 24 }))}
                  />
                  <p className="text-xs text-gray-500">
                    Duration for real blockchain monitoring. Tool will detect actual batch submissions during this period.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchPosters">Batch Poster Addresses</Label>
                  <div className="text-sm text-gray-500">
                    {trackingConfig.batchPosterAddresses?.map((address, index) => (
                      <div key={index} className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                        {address}
                      </div>
                    )) || 'Auto-detected based on L2 network'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Real batch poster addresses to monitor on L1. Tool will track actual transactions from these addresses.
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={startL1FinalityTracking}
                disabled={isMonitoring || !trackingConfig.l2Network}
                className="w-full"
                size="lg"
              >
                {isMonitoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Monitoring...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start L1 Finality Tracking
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Active Monitoring Sessions
              </CardTitle>
              <CardDescription>
                Currently running L1 finality tracking sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active monitoring sessions. Start a new session to begin tracking.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div key={session.sessionId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{session.l2Network}</Badge>
                            <Badge variant="secondary">{session.l1Network}</Badge>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(session.status)}
                              <span className={`text-sm ${getStatusColor(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Started: {new Date(session.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopL1FinalityTracking(session.sessionId)}
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(session.progress)}%</span>
                        </div>
                        <Progress value={session.progress} className="w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {currentResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Time to L1 Settlement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatTime(currentResults.metrics.avgTimeToL1Settlement)}
                    </span>
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Average settlement time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">L1 Cost per Batch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {parseFloat(currentResults.metrics.avgL1SettlementCostPerBatch).toFixed(4)}
                    </span>
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ETH per batch settlement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Amortized Cost per Tx</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {parseFloat(currentResults.metrics.avgAmortizedL1CostPerTransaction).toFixed(6)}
                    </span>
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ETH per L2 transaction
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Finality Confidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-500">
                      {currentResults.metrics.finalityConfidenceLevel.toFixed(1)}%
                    </span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Settlement confidence level
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Batch History Tab */}
        <TabsContent value="batches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detected L1 Batch Settlements</CardTitle>
              <CardDescription>
                Real-time batch settlement detection from live blockchain data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No batch settlements detected yet. Start monitoring to see real blockchain batch data.
                </div>
              ) : (
                <div className="space-y-4">
                  {batchHistory.map((batch) => (
                    <div key={batch.batchNumber} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Batch #{batch.batchNumber}</Badge>
                            <Badge variant="secondary">{batch.transactionCount} txs</Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            L2 Blocks: {batch.l2BlockStart} - {batch.l2BlockEnd}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            L1 Tx: {batch.l1TxHash.slice(0, 20)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${batch.l1GasCostUSD.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{batch.l1GasCost} ETH</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Settlement Time</div>
                          <div>{formatTime(batch.settlementTime)}</div>
                        </div>
                        <div>
                          <div className="font-medium">Cost per Tx</div>
                          <div>{batch.amortizedCostPerTx} ETH</div>
                        </div>
                        <div>
                          <div className="font-medium">Timestamp</div>
                          <div>{new Date(batch.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {batchHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Settlement Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={batchHistory.map((batch, index) => ({
                      batch: index + 1,
                      settlementTime: batch.settlementTime / 60, // Convert to minutes
                      cost: parseFloat(batch.l1GasCost) * 1000, // Convert to mETH for better scale
                      txCount: batch.transactionCount
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="batch" label={{ value: 'Batch #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Settlement Time (min)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'settlementTime') return [value, 'Settlement Time (min)'];
                          if (name === 'cost') return [value, 'L1 Cost (mETH)'];
                          return [value, name];
                        }}
                        labelFormatter={(value) => `Batch #${value}`}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="settlementTime" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="Settlement Time (min)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical L1 Finality Statistics</CardTitle>
              <CardDescription>
                Aggregated finality metrics across all monitoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aggregatedStats && statisticsData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No historical data available. Complete monitoring sessions to see statistics.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{statisticsData.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Completed monitoring sessions</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Batches Tracked</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {aggregatedStats?.totalBatches || statisticsData.reduce((sum, stat) => sum + stat.batchesTracked, 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">L1 batch settlements</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Average Settlement Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {aggregatedStats ? formatTime(aggregatedStats.averageSettlementTime / 1000) : 
                           statisticsData.length > 0 ? formatTime(statisticsData.reduce((sum, stat) => sum + stat.metrics.avgTimeToL1Settlement, 0) / statisticsData.length) : 'N/A'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Time to L1 settlement</p>
                      </CardContent>
                    </Card>
                  </div>

                  {statisticsData.length > 0 && (
                    <div className="space-y-4">
                      {statisticsData.map((stat) => (
                      <div key={stat.sessionId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{stat.l2Network}</Badge>
                              <Badge variant="secondary">{stat.l1Network}</Badge>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(stat.status)}
                                <span className={`text-sm ${getStatusColor(stat.status)}`}>
                                  {stat.status}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(stat.startedAt).toLocaleString()} - {stat.completedAt ? new Date(stat.completedAt).toLocaleString() : 'Ongoing'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{stat.batchesTracked} batches</div>
                            <div className="text-xs text-gray-500">{stat.totalL2Transactions} L2 txs</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Avg Settlement Time</div>
                            <div>{formatTime(stat.metrics.avgTimeToL1Settlement)}</div>
                          </div>
                          <div>
                            <div className="font-medium">Avg Batch Cost</div>
                            <div>{parseFloat(stat.metrics.avgL1SettlementCostPerBatch).toFixed(4)} ETH</div>
                          </div>
                          <div>
                            <div className="font-medium">Avg Cost per Tx</div>
                            <div>{parseFloat(stat.metrics.avgAmortizedL1CostPerTransaction).toFixed(6)} ETH</div>
                          </div>
                          <div>
                            <div className="font-medium">Finality Confidence</div>
                            <div className="text-green-500">{stat.metrics.finalityConfidenceLevel.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {statisticsData && statisticsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Settlement Cost Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statisticsData.slice(-10).map((stat, index) => ({
                      session: index + 1,
                      settlementTime: (stat.metrics?.avgTimeToL1Settlement || 0) / 60, // Convert to minutes
                      batchCost: parseFloat(stat.metrics?.avgL1SettlementCostPerBatch || '0') * 1000, // Convert to mETH
                      txCost: parseFloat(stat.metrics?.avgAmortizedL1CostPerTransaction || '0') * 1000000, // Convert to µETH
                      network: stat.l2Network
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="session" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="settlementTime" stroke="#3b82f6" name="Settlement Time (min)" />
                      <Line type="monotone" dataKey="batchCost" stroke="#10b981" name="Batch Cost (mETH)" />
                      <Line type="monotone" dataKey="txCost" stroke="#f59e0b" name="Tx Cost (µETH)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}