'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Play, BarChart3, AreaChart, Activity } from 'lucide-react';

// Assuming these child components are defined elsewhere in your project
import SequencerTestConfigTab from './SequencerTestConfigTab';
import SequencerLiveResultsTab from './SequencerLiveResultsTab';
import SequencerTestHistoryTab from './SequencerTestHistoryTab';
import SequencerAnalyticsTab from './SequencerAnalyticsTab';

// ### Type Definitions ###

interface SequencerTestConfig {
  targetNetwork: string;
  testType: string;
  transactionCount: number;
  minFeePerGas: number;
  maxFeePerGas: number;
}

interface SequencerTestResult {
  testId: string;
  network: string;
  testType: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  metrics: {
    inclusionRate: number;
    avgConfirmationTime: number;
    censorshipResistance: number;
    parallelProcessingScore: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    avgGasUsed: number;
    totalCost: string;
  };
  startedAt: string;
  completedAt?: string;
  transactions: any[];
}

// ### Constants ###

const NETWORK_OPTIONS = [
  { value: 'arbitrum', label: 'Arbitrum One' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'base', label: 'Base' }
];

const TEST_TYPES = [
  { value: 'inclusion_rate', label: 'Inclusion Rate Test' },
  { value: 'censorship_resistance', label: 'Censorship Resistance' },
  { value: 'parallel_processing', label: 'Parallel Processing' }
];

// ### Main Component ###

export default function SequencerAnalysisIDE() {
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'history' | 'analytics'>('config');
  const [config, setConfig] = useState<SequencerTestConfig>({
    targetNetwork: 'arbitrum',
    testType: 'inclusion_rate',
    transactionCount: 100,
    minFeePerGas: 1.0,
    maxFeePerGas: 2.0
  });
  const [currentTest, setCurrentTest] = useState<SequencerTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<SequencerTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock fetching history on initial load
    // fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    // This is a placeholder for your actual API call
    console.log("Fetching test history...");
    // MOCK DATA: Replace with your actual API call
    const mockHistory: SequencerTestResult[] = [
        // ... some mock test results
    ];
    setTestHistory(mockHistory);
  };

  const startTest = async () => {
    if (!config.targetNetwork) {
      setError('Please select a target network');
      return;
    }
    setError(null);
    setIsRunning(true);
    
    // MOCK SIMULATION: Replace with your actual API call to start a test
    const newTest: SequencerTestResult = {
        testId: `test-${Date.now()}`,
        network: config.targetNetwork,
        testType: config.testType,
        status: 'running',
        progress: 0,
        metrics: { inclusionRate: 0, avgConfirmationTime: 0, censorshipResistance: 0, parallelProcessingScore: 0, totalTransactions: config.transactionCount, successfulTransactions: 0, failedTransactions: 0, avgGasUsed: 0, totalCost: '0 ETH' },
        startedAt: new Date().toISOString(),
        transactions: []
    };
    setCurrentTest(newTest);
    setActiveTab('results');

    // Simulate real-time updates
    const interval = setInterval(() => {
      setCurrentTest(prev => {
        if (!prev || prev.progress >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          const finalResult = { ...prev!, status: 'completed' as const, progress: 100, completedAt: new Date().toISOString() };
          setTestHistory(currentHistory => [finalResult, ...currentHistory]);
          return finalResult;
        }
        const newProgress = prev.progress + 10;
        return { ...prev, progress: newProgress };
      });
    }, 500);
  };

  const stopTest = async () => {
      // Placeholder for your stop test logic
      setIsRunning(false);
      setCurrentTest(prev => prev ? { ...prev, status: 'failed', completedAt: new Date().toISOString() } : null);
      console.log('Test stopped');
  };
  
  const tabs = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'results', label: 'Live Results', icon: Activity, disabled: !currentTest },
    { id: 'history', label: 'Test History', icon: BarChart3, disabled: testHistory.length === 0 },
    { id: 'analytics', label: 'Analytics', icon: AreaChart, disabled: testHistory.length === 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white space-y-6">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.id === 'history' && testHistory.length > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{testHistory.length}</span>
                )}
              </button>
            ))}
          </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'config' && (
          <SequencerTestConfigTab
            config={config}
            setConfig={setConfig}
            networkOptions={NETWORK_OPTIONS}
            testTypes={TEST_TYPES}
            error={error}
            startTest={startTest}
            isRunning={isRunning}
            testHistory={testHistory}
          />
        )}
        
        {activeTab === 'results' && (
          <SequencerLiveResultsTab
            currentTest={currentTest}
            stopTest={stopTest}
            isRunning={isRunning}
          />
        )}
        
        {activeTab === 'history' && (
          <SequencerTestHistoryTab
            testHistory={testHistory}
            onRefresh={fetchTestHistory}
          />
        )}
        
        {activeTab === 'analytics' && (
          <SequencerAnalyticsTab
            testHistory={testHistory}
          />
        )}
      </div>
      </div>
    </div>
  );
}