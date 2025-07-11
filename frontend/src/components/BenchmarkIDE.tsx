'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/apiService';
import { Activity, BarChart3 } from 'lucide-react';
import { NETWORK_CONFIGS } from '@/utils/networkConfig';
import BenchmarkConfigTab from './BenchmarkConfigTab';
import BenchmarkResultsTab from './BenchmarkResultsTab';

interface BenchmarkContract {
  id: string;
  networkId: string;
  address: string;
  name?: string;
  abi?: any;
}

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

interface BenchmarkProgress {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  totalSteps: number;
}

const PROGRESS_STAGES = {
  idle: { message: 'Ready to benchmark', progress: 0 },
  configuring: { message: 'Configuring contracts...', progress: 25 },
  executing: { message: 'Executing transactions...', progress: 50 },
  analyzing: { message: 'Analyzing results...', progress: 75 },
  complete: { message: 'Benchmark complete', progress: 100 }
};

// Get only testnet networks
const getTestnetNetworks = () => {
  const testnets = ['arbitrumSepolia', 'optimismSepolia', 'baseSepolia', 'polygonAmoy', 'polygonZkEvm', 'zkSyncSepolia'];
  return testnets.map(id => NETWORK_CONFIGS[id]).filter(Boolean);
};

export function BenchmarkIDE() {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  const [contracts, setContracts] = useState<BenchmarkContract[]>([]);
  const [benchmarkProgress, setBenchmarkProgress] = useState<BenchmarkProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to benchmark'
  });
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const updateProgress = (stage: BenchmarkProgress['stage'], currentNetwork?: string, currentFunction?: string) => {
    const stageInfo = PROGRESS_STAGES[stage];
    setBenchmarkProgress({ 
      stage, 
      ...stageInfo,
      currentNetwork,
      currentFunction
    });
  };

  const handleAddContract = (contract: BenchmarkContract) => {
    setContracts(prev => {
      const existing = prev.find(c => c.networkId === contract.networkId);
      if (existing) {
        return prev.map(c => c.networkId === contract.networkId ? contract : c);
      }
      return [...prev, contract];
    });
  };

  const handleRemoveContract = (networkId: string) => {
    setContracts(prev => prev.filter(c => c.networkId !== networkId));
  };

  const handleStartBenchmark = async () => {
    if (contracts.length === 0) {
      setError('Please add at least one contract to benchmark.');
      return;
    }

    setError(null);
    setBenchmarkResult(null);
    setIsBenchmarking(true);
    updateProgress('configuring');

    try {
      // Prepare benchmark data
      const benchmarkData = {
        contractName: contracts[0].name || 'Multi-Contract Benchmark',
        networks: contracts.map(c => c.networkId),
        contracts: contracts.map(contract => ({
          networkId: contract.networkId,
          address: contract.address,
          name: contract.name || 'Unknown Contract',
          abi: contract.abi
        })),
        functions: ['transfer', 'approve', 'balanceOf'], // Default functions to test
        timestamp: new Date().toISOString()
      };

      updateProgress('executing');
      
      // Create benchmark session with real blockchain execution
      const savedSession = await apiService.createBenchmarkSession(benchmarkData);
      
      updateProgress('analyzing');
      
      // Process the real execution results
      const result: BenchmarkResult = {
        id: savedSession.id,
        contractName: savedSession.results?.contractName || benchmarkData.contractName,
        networks: savedSession.results?.networks || contracts.map(c => c.networkId),
        results: savedSession.results || {
          contracts: [],
          executionSummary: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            successRate: 0
          }
        },
        timestamp: savedSession.results?.timestamp || new Date().toISOString(),
        totalOperations: savedSession.totalOperations || 0,
        avgGasUsed: savedSession.avgGasUsed || 0,
        avgExecutionTime: savedSession.avgExecutionTime || 0,
        createdAt: savedSession.createdAt || new Date().toISOString()
      };
      
      setBenchmarkResult(result);
      updateProgress('complete');
      setActiveTab('results');
      
      setTimeout(() => {
        updateProgress('idle');
        setIsBenchmarking(false);
      }, 2000);
      
    } catch (err: any) {
      console.error('Benchmark error:', err);
      setError(err.message || 'Benchmark failed. Please try again.');
      updateProgress('idle');
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Benchmark Configuration</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              disabled={!benchmarkResult}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Benchmark Results</span>
                {benchmarkResult && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {contracts.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'config' ? (
          <BenchmarkConfigTab
            contracts={contracts}
            onAddContract={handleAddContract}
            onRemoveContract={handleRemoveContract}
            onStartBenchmark={handleStartBenchmark}
            benchmarkProgress={benchmarkProgress}
            error={error}
            isBenchmarking={isBenchmarking}
            testnetNetworks={getTestnetNetworks()}
          />
        ) : (
          <BenchmarkResultsTab benchmarkResult={benchmarkResult} />
        )}
      </div>
    </div>
  );
}

export default BenchmarkIDE;