'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Eye, History, BarChart3 } from 'lucide-react';
import L1FinalityMonitorTab from './L1FinalityMonitorTab';
import L1FinalityActiveSessionsTab from './L1FinalityActiveSessionsTab';
import L1FinalityBatchHistoryTab from './L1FinalityBatchHistoryTab';
import L1FinalityStatisticsTab from './L1FinalityStatisticsTab';

// Types
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
    '0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6',
    '0x4c6f947Ae67F572afa4ae0730947DE7C874F95Ef'
  ],
  'optimism': [
    '0x6887246668a3b87F54DeB3b94Ba47a6f63F32985',
    '0x473300df21D047806A082244b417f96b32f13A33'
  ],
  'base': [
    '0x5050F69a9786F081509234F1a7F4684b5E5b76C9',
    '0x99199a22125034c808ff20f377d856DE6329D675'
  ],
  'polygon-zkevm': [
    '0x148Ee7dAF16574cD020aFa34CC658f8F3fbd2800',
    '0x5132A183E9F3CB7C848b0AAC5Ae0c4f0491B7aB2'
  ],
  'zksync-era': [
    '0x3527439923a63F8C13CF72b8Fe80a77f6e508A06',
    '0xa0425d71cB1D6fb80E65a5361a04096E0672De03'
  ]
};

export default function L1FinalityIDE() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'active' | 'batches' | 'statistics'>('monitor');
  const [trackingConfig, setTrackingConfig] = useState<L1FinalityConfig>({
    l2Network: '',
    l1Network: 'mainnet',
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

  const tabs = [
    { id: 'monitor' as const, label: 'Start Monitoring', icon: Settings },
    { id: 'active' as const, label: 'Active Sessions', icon: Eye },
    { id: 'batches' as const, label: 'Batch History', icon: History },
    { id: 'statistics' as const, label: 'Statistics', icon: BarChart3 }
  ];

  // Shared functions and effects (no changes to logic)
  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(() => {
      if (activeSessions.length > 0) {
        checkActiveSessions();
      }
    }, 10000);

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
      const statsResponse = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/statistics?limit=20');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAggregatedStats(statsData);
      }
      
      const historyResponse = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/history?limit=20');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const transformedData = transformTrackingDataToResults(historyData);
        setStatisticsData(transformedData);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const transformTrackingDataToResults = (trackingData: any[]): L1FinalityResult[] => {
    const sessionGroups = trackingData.reduce((groups, record) => {
        const sessionId = record.sessionId;
        if (!groups[sessionId]) {
            groups[sessionId] = [];
        }
        groups[sessionId].push(record);
        return groups;
    }, {});

    return Object.entries(sessionGroups).map(([sessionId, records]: [string, any[]]) => {
        const firstRecord = records[0];
        const batchesTracked = records.length;
        const totalL2Transactions = records.reduce((sum, record) => sum + (record.transactionCount || 0), 0);
        
        const avgTimeToL1Settlement = records.reduce((sum, record) => sum + (record.finalityMetrics?.timeToL1SettlementMs || 0), 0) / records.length / 1000;
        const avgL1SettlementCostPerBatch = records.reduce((sum, record) => sum + (record.finalityMetrics?.l1SettlementCostPerBatch || 0), 0) / records.length;
        const avgAmortizedL1CostPerTransaction = records.reduce((sum, record) => sum + (record.finalityMetrics?.amortizedL1CostPerTransaction || 0), 0) / records.length;
        const finalityConfidenceLevel = records.reduce((sum, record) => sum + (record.finalityMetrics?.finalityConfidenceLevel || 95), 0) / records.length;
        
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trackingConfig),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to start L1 finality tracking');
        }

        const result = await response.json();
        setCurrentResults(result);
        setSelectedSessionId(result.sessionId);
        
        setActiveSessions(prev => [...prev, {
            sessionId: result.sessionId,
            l2Network: trackingConfig.l2Network,
            l1Network: trackingConfig.l1Network,
            status: 'monitoring',
            startedAt: new Date().toISOString(),
            progress: 0
        }]);

        const eventSource = new EventSource(`http://localhost:3001/api/advanced-analysis/l1-finality/stream/${result.sessionId}`);
        
        eventSource.onmessage = (event) => {
            try {
                const batchData = JSON.parse(event.data);
                if (batchData.type === 'batchDetected') {
                    setBatchHistory(prev => [batchData, ...prev]);
                }
            } catch (error) {
                console.error('Error parsing batch data:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            eventSource.close();
        };
        
        return () => eventSource.close();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setIsMonitoring(false);
    }
  };

  const stopL1FinalityTracking = async (sessionId: string) => {
    try {
        const response = await fetch('http://localhost:3001/api/advanced-analysis/l1-finality/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to stop tracking');
        }

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
      case 'monitoring': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏱️';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'monitor' && (
          <L1FinalityMonitorTab
            trackingConfig={trackingConfig}
            setTrackingConfig={setTrackingConfig}
            isMonitoring={isMonitoring}
            error={error}
            startL1FinalityTracking={startL1FinalityTracking}
            networkOptions={NETWORK_OPTIONS}
          />
        )}

        {activeTab === 'active' && (
          <L1FinalityActiveSessionsTab
            activeSessions={activeSessions}
            stopL1FinalityTracking={stopL1FinalityTracking}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            formatTime={formatTime}
          />
        )}

        {activeTab === 'batches' && (
          <L1FinalityBatchHistoryTab
            batchHistory={batchHistory}
            formatTime={formatTime}
          />
        )}

        {activeTab === 'statistics' && (
          <L1FinalityStatisticsTab
            statisticsData={statisticsData}
            aggregatedStats={aggregatedStats}
            formatTime={formatTime}
          />
        )}
      </div>
    </>
  );
}

export { NETWORK_OPTIONS, BATCH_POSTER_ADDRESSES };
export type { L1FinalityConfig, L1FinalityResult, BatchData, MonitoringSession };