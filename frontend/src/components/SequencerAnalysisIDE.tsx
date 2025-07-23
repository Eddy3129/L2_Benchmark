'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Play, BarChart3, AreaChart, Activity } from 'lucide-react';
import { env } from '@/lib/env';

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
  { value: 'arbitrumSepolia', label: 'Arbitrum Sepolia' },
  { value: 'optimismSepolia', label: 'Optimism Sepolia' },
  { value: 'baseSepolia', label: 'Base Sepolia' },
  { value: 'arbitrum', label: 'Arbitrum One' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' }
];

const TEST_TYPES = [
  { value: 'low_fee_test', label: 'Low Fee Test' },
  { value: 'stuck_transaction_test', label: 'Stuck Transaction Test' },
  { value: 'fee_market_stress', label: 'Fee Market Stress' }
];

// ### Main Component ###

export default function SequencerAnalysisIDE() {
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'history' | 'analytics'>('config');
  const [config, setConfig] = useState<SequencerTestConfig>({
    targetNetwork: 'arbitrumSepolia',
    testType: 'low_fee_test',
    transactionCount: 100,
    minFeePerGas: 1.0,
    maxFeePerGas: 2.0
  });
  const [currentTest, setCurrentTest] = useState<SequencerTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<SequencerTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCounter, setTestCounter] = useState(0);

  useEffect(() => {
    // Mock fetching history on initial load
    // fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    try {
      const response = await fetch(`${env.BACKEND_URL}/api/advanced-analysis/sequencer/history?limit=20`);
      if (response.ok) {
        const historyData = await response.json();
        const formattedHistory: SequencerTestResult[] = historyData.map((test: any) => ({
          testId: test.sessionId,
          network: test.l2Network,
          testType: test.testType,
          status: test.status === 'completed' ? 'completed' : test.status === 'running' ? 'running' : 'failed',
          progress: test.status === 'completed' ? 100 : test.status === 'running' ? 50 : 0,
          metrics: {
            inclusionRate: test.metrics.inclusionRate * 100,
            avgConfirmationTime: test.metrics.avgConfirmationLatency,
            censorshipResistance: test.metrics.censorshipResistanceScore * 100,
            parallelProcessingScore: test.metrics.parallelProcessingCapability * 100,
            totalTransactions: test.realTimeStatus.transactionsSent,
            successfulTransactions: test.realTimeStatus.transactionsConfirmed,
            failedTransactions: test.realTimeStatus.transactionsFailed,
            avgGasUsed: 21000,
            totalCost: test.totalTestCostETH
          },
          startedAt: new Date(test.startedAt).toISOString(),
          completedAt: test.completedAt ? new Date(test.completedAt).toISOString() : undefined,
          transactions: []
        }));
        setTestHistory(formattedHistory);
      } else {
        console.error('Failed to fetch test history');
        // Fallback to empty array if API fails
        setTestHistory([]);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
      // Fallback to empty array if API fails
      setTestHistory([]);
    }
  };

  const startTest = async () => {
    if (!config.targetNetwork) {
      setError('Please select a target network');
      return;
    }
    setError(null);
    setIsRunning(true);
    
    try {
      // Make actual API call to backend
      const response = await fetch(`${env.BACKEND_URL}/api/advanced-analysis/sequencer/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          l2Network: config.targetNetwork,
          testType: config.testType,
          transactionCount: config.transactionCount,
          testDurationSeconds: 300, // 5 minutes default
          minFeePerGas: config.minFeePerGas,
          maxFeePerGas: config.maxFeePerGas,
          saveToDatabase: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const testResult = await response.json();
      
      // Convert backend response to frontend format
      const newTest: SequencerTestResult = {
        testId: testResult.sessionId,
        network: testResult.l2Network,
        testType: testResult.testType,
        status: testResult.status === 'running' ? 'running' : testResult.status === 'completed' ? 'completed' : 'failed',
        progress: testResult.status === 'completed' ? 100 : testResult.status === 'running' ? 50 : 0,
        metrics: {
          inclusionRate: testResult.metrics.inclusionRate * 100, // Convert to percentage
          avgConfirmationTime: testResult.metrics.avgConfirmationLatency,
          censorshipResistance: testResult.metrics.censorshipResistanceScore * 100,
          parallelProcessingScore: testResult.metrics.parallelProcessingCapability * 100,
          totalTransactions: testResult.realTimeStatus.transactionsSent,
          successfulTransactions: testResult.realTimeStatus.transactionsConfirmed,
          failedTransactions: testResult.realTimeStatus.transactionsFailed,
          avgGasUsed: 21000, // Default gas for simple transfers
          totalCost: testResult.totalTestCostETH
        },
        startedAt: new Date(testResult.startedAt).toISOString(),
        completedAt: testResult.completedAt ? new Date(testResult.completedAt).toISOString() : undefined,
        transactions: []
      };
      
      setCurrentTest(newTest);
      setTestHistory(prev => [newTest, ...prev]);
      setActiveTab('results');
      
      // If test is still running, poll for updates
      if (testResult.status === 'running') {
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${env.BACKEND_URL}/api/advanced-analysis/sequencer/test/${testResult.sessionId}`);
            if (statusResponse.ok) {
              const updatedResult = await statusResponse.json();
              const updatedTest: SequencerTestResult = {
                ...newTest,
                status: updatedResult.status === 'completed' ? 'completed' : updatedResult.status === 'failed' ? 'failed' : 'running',
                progress: updatedResult.status === 'completed' ? 100 : updatedResult.status === 'failed' ? 0 : 75,
                metrics: {
                  inclusionRate: updatedResult.metrics.inclusionRate * 100,
                  avgConfirmationTime: updatedResult.metrics.avgConfirmationLatency,
                  censorshipResistance: updatedResult.metrics.censorshipResistanceScore * 100,
                  parallelProcessingScore: updatedResult.metrics.parallelProcessingCapability * 100,
                  totalTransactions: updatedResult.realTimeStatus.transactionsSent,
                  successfulTransactions: updatedResult.realTimeStatus.transactionsConfirmed,
                  failedTransactions: updatedResult.realTimeStatus.transactionsFailed,
                  avgGasUsed: 21000,
                  totalCost: updatedResult.totalTestCostETH
                },
                completedAt: updatedResult.completedAt ? new Date(updatedResult.completedAt).toISOString() : undefined
              };
              
              setCurrentTest(updatedTest);
              setTestHistory(prev => prev.map(test => 
                test.testId === testResult.sessionId ? updatedTest : test
              ));
              
              if (updatedResult.status === 'completed' || updatedResult.status === 'failed') {
                clearInterval(pollInterval);
                setIsRunning(false);
              }
            }
          } catch (pollError) {
            console.error('Error polling test status:', pollError);
          }
        }, 3000); // Poll every 3 seconds
        
        // Stop polling after 10 minutes to prevent infinite polling
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsRunning(false);
        }, 600000);
      } else {
        setIsRunning(false);
      }
      
    } catch (error) {
      console.error('Error starting sequencer test:', error);
      setError(`Failed to start test: ${error.message}`);
      setIsRunning(false);
    }
  };

  const stopTest = async () => {
    if (currentTest && currentTest.status === 'running') {
      try {
        // Note: The backend doesn't have a stop endpoint for sequencer tests
        // Tests run to completion automatically
        // For now, we'll just update the UI state
        const stoppedTest = {
          ...currentTest,
          status: 'completed' as const,
          completedAt: new Date().toISOString()
        };
        setCurrentTest(stoppedTest);
        setTestHistory(prev => prev.map(test => 
          test.testId === currentTest.testId ? stoppedTest : test
        ));
      } catch (error) {
        console.error('Error stopping test:', error);
        setError(`Failed to stop test: ${error.message}`);
      }
    }
    setIsRunning(false);
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