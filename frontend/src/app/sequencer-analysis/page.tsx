'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Loader2, Play, Square, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface SequencerTestConfig {
  l2Network: string;
  testType: 'low_fee_test' | 'stuck_transaction_test' | 'fee_market_stress';
  transactionCount: number;
  testDurationSeconds: number;
  minFeePerGas: number;
  maxFeePerGas?: number;
  saveToDatabase: boolean;
}

interface SequencerTestResult {
  sessionId: string;
  l2Network: string;
  testType: string;
  testConfig: {
    transactionCount: number;
    testDurationSeconds: number;
    minFeePerGas: number;
    maxFeePerGas?: number;
  };
  metrics: {
    inclusionRate?: number;
    avgConfirmationLatency?: number;
    parallelProcessingCapability?: number;
    censorshipResistanceScore?: number;
  };
  totalTestCostETH: string;
  totalTestCostUSD: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  realTimeStatus?: {
    transactionsSent: number;
    transactionsConfirmed: number;
    transactionsPending: number;
    transactionsFailed: number;
    lowFeeTransactions: {
      sent: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
    normalFeeTransactions: {
      sent: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
  };
}

interface TransactionResult {
  hash: string;
  nonce: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmationLatency?: number;
  gasPrice: string;
  timestamp: string;
}

interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

const NETWORK_OPTIONS = [
  { value: 'arbitrumSepolia', label: 'Arbitrum Sepolia' },
  { value: 'optimismSepolia', label: 'Optimism Sepolia' },
  { value: 'baseSepolia', label: 'Base Sepolia' },
  { value: 'polygonAmoy', label: 'Polygon Amoy' },
  { value: 'polygonZkEvm', label: 'Polygon zkEVM Testnet' },
  { value: 'zkSyncSepolia', label: 'zkSync Era Sepolia' }
];

const TEST_TYPE_OPTIONS = [
  { 
    value: 'low_fee_test', 
    label: 'Low Fee Test',
    description: 'Tests inclusion of minimum fee transactions'
  },
  { 
    value: 'stuck_transaction_test', 
    label: 'Stuck Transaction Test',
    description: 'Tests parallel processing with stuck transactions'
  },
  { 
    value: 'fee_market_stress', 
    label: 'Fee Market Stress Test',
    description: 'Comprehensive fee market analysis'
  }
];

export default function SequencerAnalysisPage() {
  const [testConfig, setTestConfig] = useState<SequencerTestConfig>({
    l2Network: '',
    testType: 'low_fee_test',
    transactionCount: 5,
    testDurationSeconds: 60,
    minFeePerGas: 1,
    maxFeePerGas: undefined,
    saveToDatabase: true
  });

  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);


  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<SequencerTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<SequencerTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/sequencer/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setTestHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch test history:', err);
    }
  };

  const generateTestSteps = () => {
    const steps: TestStep[] = [
      {
        id: 'setup',
        name: 'Setup',
        description: 'Initializing test configuration and network connection',
        status: 'pending'
      },
      {
        id: 'submit-low-fee',
        name: 'Low Fee Txs',
        description: `Submitting ${testConfig.transactionCount} low-fee transactions`,
        status: 'pending'
      },
      {
        id: 'submit-normal-fee',
        name: 'Normal Fee Txs',
        description: `Submitting ${testConfig.transactionCount} normal-fee transactions`,
        status: 'pending'
      },
      {
        id: 'monitor',
        name: 'Monitor',
        description: 'Monitoring transaction confirmations for 60 seconds',
        status: 'pending'
      },
      {
        id: 'analyze',
        name: 'Analyze',
        description: 'Calculating performance metrics and results',
        status: 'pending'
      }
    ];
    setTestSteps(steps);
    return steps;
  };

  const runSequencerTest = async () => {
    if (!testConfig.l2Network) {
      setError('Please select an L2 network');
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress(0);
    setActiveTab('live'); // Auto-switch to live tab when test starts

    setCurrentTest(null);
    
    const steps = generateTestSteps();
    setCurrentStepIndex(0);

    try {
      // Step 1: Setup
      setTestSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, status: 'running' } : step
      ));
      setProgress(10);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate setup time
      
      setTestSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, status: 'completed' } : step
      ));
      setCurrentStepIndex(1);
      setProgress(20);

      // Step 2: Submit test with immediate execution
      setTestSteps(prev => prev.map((step, idx) => 
        idx === 1 ? { ...step, status: 'running' } : step
      ));

      const response = await fetch('http://localhost:3001/api/advanced-analysis/sequencer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testConfig,
          testDurationSeconds: 60 // Fixed duration for better UX
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start sequencer test');
      }

      const result = await response.json();
      setCurrentTest(result);
      
      setTestSteps(prev => prev.map((step, idx) => 
        idx === 1 ? { ...step, status: 'completed' } : step
      ));
      setCurrentStepIndex(2);
      setProgress(40);

      // Step 3: Monitor with real-time updates
      setTestSteps(prev => prev.map((step, idx) => 
        idx === 2 ? { ...step, status: 'running' } : step
      ));

      // Poll for results every 1 second for real-time updates
      let pollCount = 0;
      const maxPolls = 120; // 120 seconds max (transaction submission + 60s monitoring)
      
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`http://localhost:3001/api/advanced-analysis/sequencer/test/${result.sessionId}`);
          if (pollResponse.ok) {
            const updatedResult = await pollResponse.json();
            setCurrentTest(updatedResult);
            
            // Calculate progress based on actual transaction confirmations
            const totalExpected = updatedResult.testConfig.transactionCount;
            const confirmed = updatedResult.realTimeStatus?.transactionsConfirmed || 0;
            const sent = updatedResult.realTimeStatus?.transactionsSent || 0;
            
            // Progress: 40% base + 30% for sending + 30% for confirmations
            let currentProgress = 40;
            if (sent > 0) {
              currentProgress += (sent / totalExpected) * 30; // Sending progress
            }
            if (confirmed > 0) {
              currentProgress += (confirmed / totalExpected) * 30; // Confirmation progress
            }
            
            setProgress(Math.min(100, currentProgress));
            
            if (updatedResult.status === 'completed' || updatedResult.status === 'failed') {
              setTestSteps(prev => prev.map((step, idx) => 
                idx === 2 ? { ...step, status: updatedResult.status === 'failed' ? 'failed' : 'completed' } : step
              ));
              setCurrentStepIndex(3);
              
              if (updatedResult.status === 'completed') {
                // Step 4: Final analysis
                setTestSteps(prev => prev.map((step, idx) => 
                  idx === 3 ? { ...step, status: 'running' } : step
                ));
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for analysis
                
                setTestSteps(prev => prev.map((step, idx) => 
                  idx === 3 ? { ...step, status: 'completed' } : step
                ));
                setCurrentStepIndex(4);
                setProgress(100);
                setActiveTab('results'); // Auto-switch to results tab when analysis is complete
              } else {
                setError(updatedResult.errorMessage || 'Test failed');
              }
              
              setIsRunning(false);
              clearInterval(pollInterval);
              fetchTestHistory();
              return;
            }
          }
        } catch (pollError) {
          console.error('Error polling test results:', pollError);
        }
        
        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsRunning(false);
          setError(`Test timeout after ${maxPolls} seconds - results may be incomplete. This can happen with slow networks or high transaction volumes.`);
        }
        
        // Provide progress feedback for long-running tests
        if (pollCount === 60) {
          console.log('Test still running - this is normal for comprehensive sequencer analysis');
        }
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsRunning(false);
      setTestSteps(prev => prev.map((step, idx) => 
        idx === currentStepIndex ? { ...step, status: 'failed' } : step
      ));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const ProgressBar = ({ steps, currentStep }: { steps: TestStep[], currentStep: number }) => {
    const progress = currentStep >= 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Progress</span>
          <span>{currentStep >= 0 ? `${currentStep + 1}/${steps.length}` : `0/${steps.length}`}</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Step indicators */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isRunning = step.status === 'running';
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-400 text-white' 
                      : isFailed 
                      ? 'bg-red-500 border-red-400 text-white'
                      : isRunning
                      ? 'bg-blue-500 border-blue-400 text-white animate-pulse'
                      : isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400'
                  }`}>
                  {isCompleted ? '✓' : isFailed ? '✗' : isRunning ? '⟳' : index + 1}
                </div>
                <div className={`text-xs mt-1 text-center max-w-16 leading-tight ${
                    isCompleted 
                      ? 'text-green-400' 
                      : isFailed 
                      ? 'text-red-400'
                      : isActive 
                      ? 'text-blue-400' 
                      : 'text-gray-500'
                  }`}>
                  {step.name}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current step description */}
        {currentStep >= 0 && currentStep < steps.length && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">{steps[currentStep].name}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{steps[currentStep].description}</p>
          </div>
        )}
      </div>
    );
  };

  const [activeTab, setActiveTab] = useState<'test' | 'live' | 'results' | 'history'>('test');

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Sequencer Performance Analysis
              </h1>
              <p className="text-gray-400 text-sm">
                Advanced L2 sequencer testing with real-time censorship resistance, parallel processing, and fee market analysis.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Powered by</div>
              <div className="text-sm font-semibold text-blue-400">Live Network Analysis</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
              {[
                { id: 'test', icon: '🚀', title: 'Run Test', description: 'Configure and execute tests' },
                { id: 'live', icon: '📊', title: 'Live Results', description: 'Real-time monitoring' },
                { id: 'results', icon: '📈', title: 'Results', description: 'Detailed analysis' },
                { id: 'history', icon: '📋', title: 'History', description: 'Past test results' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{tab.title}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">

        {/* Test Configuration Tab */}
        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="text-2xl">⚙️</span>
                    Configuration Panel
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">Set up your sequencer performance test parameters</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="network" className="text-gray-300 font-medium">L2 Network</Label>
                      <Select
                        value={testConfig.l2Network}
                        onValueChange={(value) => setTestConfig(prev => ({ ...prev, l2Network: value }))}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select L2 network" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {NETWORK_OPTIONS.map((network) => (
                            <SelectItem key={network.value} value={network.value} className="text-white hover:bg-gray-600">
                              {network.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="testType" className="text-gray-300 font-medium">Test Type</Label>
                      <Select
                        value={testConfig.testType}
                        onValueChange={(value: any) => setTestConfig(prev => ({ ...prev, testType: value }))}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {TEST_TYPE_OPTIONS.map((test) => (
                            <SelectItem key={test.value} value={test.value} className="text-white hover:bg-gray-600">
                              <div>
                                <div className="font-medium">{test.label}</div>
                                <div className="text-xs text-gray-400">{test.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="transactionCount" className="text-gray-300 font-medium">Transaction Count</Label>
                      <Input
                        id="transactionCount"
                        type="number"
                        min="1"
                        max="100"
                        value={testConfig.transactionCount}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, transactionCount: parseInt(e.target.value) || 10 }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="minFee" className="text-gray-300 font-medium">Min Fee Per Gas (wei)</Label>
                      <Input
                        id="minFee"
                        type="number"
                        min="1"
                        value={testConfig.minFeePerGas}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, minFeePerGas: parseInt(e.target.value) || 1 }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="maxFee" className="text-gray-300 font-medium">Max Fee Per Gas (wei)</Label>
                      <Input
                        id="maxFee"
                        type="number"
                        min="1"
                        value={testConfig.maxFeePerGas || ''}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, maxFeePerGas: e.target.value ? parseInt(e.target.value) : undefined }))}
                        placeholder="Optional"
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert className="bg-red-900/20 border-red-800 text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={runSequencerTest}
                    disabled={isRunning || !testConfig.l2Network}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Sequencer Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">ℹ️</span>
                    Test Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-300">What This Test Does:</h4>
                    <ul className="text-sm text-gray-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Submits low-fee and normal-fee transactions simultaneously</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Monitors inclusion rates and confirmation times</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Analyzes censorship resistance and parallel processing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Provides comprehensive performance metrics</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    Quick Stats
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{testHistory.length}</div>
                      <div className="text-xs text-gray-400">Tests Run</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-emerald-400">60s</div>
                      <div className="text-xs text-gray-400">Test Duration</div>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-purple-400">
                      {testConfig.l2Network ? NETWORK_OPTIONS.find(n => n.value === testConfig.l2Network)?.label || 'Network Selected' : 'Select Network'}
                    </div>
                    <div className="text-xs text-gray-400">Current Target</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Results Tab */}
        {activeTab === 'live' && (
          <div className="space-y-8">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {!isRunning && testSteps.length === 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="text-8xl mb-6 opacity-50">📊</div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Active Test</h3>
                  <p className="text-gray-400 text-center mb-8 max-w-md">
                    Start a sequencer test to see live results and real-time monitoring of transaction performance
                  </p>
                  <Button 
                    onClick={() => setActiveTab('test')} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Configure Test
                  </Button>
                </div>
              </div>
            )}

            {(isRunning || testSteps.length > 0) && (
              <>
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <span>Test Progress</span>
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Real-time sequencer performance monitoring</p>
                  </div>
                  <div className="p-6">
                    {/* Current Stage Indicator */}
                    <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-semibold">Current Stage</h4>
                        <div className="flex items-center gap-2">
                          {currentTest?.status === 'running' && (
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            currentTest?.status === 'running' ? 'bg-green-600 text-green-100' :
                            currentTest?.status === 'completed' ? 'bg-blue-600 text-blue-100' :
                            currentTest?.status === 'failed' ? 'bg-red-600 text-red-100' :
                            'bg-gray-600 text-gray-100'
                          }`}>
                            {currentTest?.status === 'running' ? 'In Progress' :
                             currentTest?.status === 'completed' ? 'Completed' :
                             currentTest?.status === 'failed' ? 'Failed' : 'Idle'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className={`text-center p-3 rounded-lg border ${
                          currentStepIndex >= 0 ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-gray-700 border-gray-600 text-gray-400'
                        }`}>
                          <div className="text-lg mb-1">⚙️</div>
                          <div className="text-xs font-medium">Setup</div>
                          {currentStepIndex === 0 && (
                            <div className="mt-1 w-full bg-gray-600 rounded-full h-1">
                              <div className="bg-blue-400 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
                            </div>
                          )}
                        </div>
                        <div className={`text-center p-3 rounded-lg border ${
                          currentStepIndex >= 1 ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-gray-700 border-gray-600 text-gray-400'
                        }`}>
                          <div className="text-lg mb-1">🚀</div>
                          <div className="text-xs font-medium">Execution</div>
                          {currentStepIndex === 1 && (
                            <div className="mt-1 w-full bg-gray-600 rounded-full h-1">
                              <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
                            </div>
                          )}
                        </div>
                        <div className={`text-center p-3 rounded-lg border ${
                          currentStepIndex >= 2 ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-gray-700 border-gray-600 text-gray-400'
                        }`}>
                          <div className="text-lg mb-1">📊</div>
                          <div className="text-xs font-medium">Analyze</div>
                          {currentStepIndex === 2 && (
                            <div className="mt-1 w-full bg-gray-600 rounded-full h-1">
                              <div className="bg-purple-400 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ProgressBar steps={testSteps} currentStep={currentStepIndex} />
                  </div>
                </div>
                
                {currentTest && (
                  <>
                    {/* Transaction Status Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                          <h3 className="text-sm font-medium text-blue-100">Transactions Sent</h3>
                        </div>
                        <div className="p-4">
                          <div className="text-3xl font-bold text-white mb-1">{currentTest.realTimeStatus?.transactionsSent || 0}</div>
                          <p className="text-xs text-gray-400">
                            Target: {testConfig.transactionCount * 2}
                          </p>
                          <div className="mt-2 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(((currentTest.realTimeStatus?.transactionsSent || 0) / (testConfig.transactionCount * 2)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3">
                          <h3 className="text-sm font-medium text-emerald-100">Confirmed</h3>
                        </div>
                        <div className="p-4">
                          <div className="text-3xl font-bold text-emerald-400 mb-1">{currentTest.realTimeStatus?.transactionsConfirmed || 0}</div>
                          <p className="text-xs text-gray-400">
                            {(currentTest.realTimeStatus?.transactionsSent || 0) > 0 ? 
                              `${(((currentTest.realTimeStatus?.transactionsConfirmed || 0) / (currentTest.realTimeStatus?.transactionsSent || 1)) * 100).toFixed(1)}% success rate` : 
                              '0% success rate'
                            }
                          </p>
                          <div className="mt-2 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(currentTest.realTimeStatus?.transactionsSent || 0) > 0 ? ((currentTest.realTimeStatus?.transactionsConfirmed || 0) / (currentTest.realTimeStatus?.transactionsSent || 1)) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-4 py-3">
                          <h3 className="text-sm font-medium text-yellow-100">Pending</h3>
                        </div>
                        <div className="p-4">
                          <div className="text-3xl font-bold text-yellow-400 mb-1">{currentTest.realTimeStatus?.transactionsPending || 0}</div>
                          <p className="text-xs text-gray-400">
                            Awaiting confirmation
                          </p>
                          {(currentTest.realTimeStatus?.transactionsPending || 0) > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-yellow-400">Processing...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
                          <h3 className="text-sm font-medium text-red-100">Failed</h3>
                        </div>
                        <div className="p-4">
                          <div className="text-3xl font-bold text-red-400 mb-1">{currentTest.realTimeStatus?.transactionsFailed || 0}</div>
                          <p className="text-xs text-gray-400">
                            {(currentTest.realTimeStatus?.transactionsSent || 0) > 0 ? 
                              `${(((currentTest.realTimeStatus?.transactionsFailed || 0) / (currentTest.realTimeStatus?.transactionsSent || 1)) * 100).toFixed(1)}% failure rate` : 
                              '0% failure rate'
                            }
                          </p>
                          <div className="mt-2 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(currentTest.realTimeStatus?.transactionsSent || 0) > 0 ? ((currentTest.realTimeStatus?.transactionsFailed || 0) / (currentTest.realTimeStatus?.transactionsSent || 1)) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl">⚡</span>
                            Transaction Breakdown
                          </h3>
                          <p className="text-purple-100 text-sm mt-1">Low fee vs normal fee transaction analysis</p>
                        </div>
                        <div className="p-6 space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-gray-300 font-medium">Low Fee Transactions</span>
                              <span className="text-gray-400 text-sm">
                                {currentTest.realTimeStatus?.lowFeeTransactions.confirmed || 0}/{currentTest.realTimeStatus?.lowFeeTransactions.sent || 0}
                              </span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500" 
                                style={{ width: `${(currentTest.realTimeStatus?.lowFeeTransactions.sent || 0) > 0 ? ((currentTest.realTimeStatus?.lowFeeTransactions.confirmed || 0) / (currentTest.realTimeStatus?.lowFeeTransactions.sent || 1)) * 100 : 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {(currentTest.realTimeStatus?.lowFeeTransactions.sent || 0) > 0 ? 
                                `${(((currentTest.realTimeStatus?.lowFeeTransactions.confirmed || 0) / (currentTest.realTimeStatus?.lowFeeTransactions.sent || 1)) * 100).toFixed(1)}% confirmation rate` : 
                                'No transactions sent'
                              }
                            </p>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-gray-300 font-medium">Normal Fee Transactions</span>
                              <span className="text-gray-400 text-sm">
                                {currentTest.realTimeStatus?.normalFeeTransactions.confirmed || 0}/{currentTest.realTimeStatus?.normalFeeTransactions.sent || 0}
                              </span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-500" 
                                style={{ width: `${(currentTest.realTimeStatus?.normalFeeTransactions.sent || 0) > 0 ? ((currentTest.realTimeStatus?.normalFeeTransactions.confirmed || 0) / (currentTest.realTimeStatus?.normalFeeTransactions.sent || 1)) * 100 : 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {(currentTest.realTimeStatus?.normalFeeTransactions.sent || 0) > 0 ? 
                                `${(((currentTest.realTimeStatus?.normalFeeTransactions.confirmed || 0) / (currentTest.realTimeStatus?.normalFeeTransactions.sent || 1)) * 100).toFixed(1)}% confirmation rate` : 
                                'No transactions sent'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl">📈</span>
                            Live Performance Metrics
                          </h3>
                          <p className="text-cyan-100 text-sm mt-1">Real-time sequencer performance analysis</p>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                              <div className="text-2xl font-bold text-blue-400 mb-1">
                                {currentTest.metrics?.inclusionRate ? `${currentTest.metrics.inclusionRate.toFixed(1)}%` : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-400">Inclusion Rate</div>
                              <div className="mt-2 bg-gray-600 rounded-full h-1">
                                <div 
                                  className="bg-blue-400 h-1 rounded-full transition-all duration-300" 
                                  style={{ width: `${currentTest.metrics?.inclusionRate || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                              <div className="text-2xl font-bold text-emerald-400 mb-1">
                                {currentTest.metrics?.avgConfirmationLatency ? `${currentTest.metrics.avgConfirmationLatency.toFixed(1)}s` : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-400">Avg Latency</div>
                              <div className="mt-2 flex items-center justify-center">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                              <div className="text-2xl font-bold text-purple-400 mb-1">
                                {currentTest.metrics?.parallelProcessingCapability ? `${currentTest.metrics.parallelProcessingCapability.toFixed(1)}%` : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-400">Parallel Processing</div>
                              <div className="mt-2 bg-gray-600 rounded-full h-1">
                                <div 
                                  className="bg-purple-400 h-1 rounded-full transition-all duration-300" 
                                  style={{ width: `${currentTest.metrics?.parallelProcessingCapability || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                              <div className="text-2xl font-bold text-orange-400 mb-1">
                                {currentTest.metrics?.censorshipResistanceScore ? `${currentTest.metrics.censorshipResistanceScore.toFixed(1)}` : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-400">Censorship Score</div>
                              <div className="mt-2 flex items-center justify-center">
                                <div className={`w-2 h-2 rounded-full ${currentTest.metrics?.censorshipResistanceScore ? (currentTest.metrics.censorshipResistanceScore > 5 ? 'bg-red-400' : 'bg-orange-400') : 'bg-gray-400'}`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

          {activeTab === 'results' && (
        !currentTest && testHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">No Test Results Yet</h3>
                <p className="text-sm">Run your first sequencer test to see detailed results here.</p>
              </div>
            </CardContent>
          </Card>
        ) : currentTest ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  Test Completed Successfully
                </CardTitle>
                <CardDescription>
                  {new Date(currentTest.startedAt).toLocaleString()} • {currentTest.l2Network} • {currentTest.testType.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{currentTest.realTimeStatus?.transactionsSent || 0}</div>
                    <div className="text-xs text-gray-500">Total Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {currentTest.realTimeStatus?.transactionsConfirmed || 0}
                    </div>
                    <div className="text-xs text-gray-500">Confirmed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${typeof currentTest.totalTestCostUSD === 'number' ? currentTest.totalTestCostUSD.toFixed(4) : parseFloat(currentTest.totalTestCostUSD || '0').toFixed(4)}</div>
                    <div className="text-xs text-gray-500">Total Cost (USD)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentTest.totalTestCostETH}</div>
                    <div className="text-xs text-gray-500">Total Cost (ETH)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Inclusion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{currentTest.metrics.inclusionRate?.toFixed(1) ?? 'N/A'}%</span>
                    {getScoreIcon(currentTest.metrics.inclusionRate ?? 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage of low-fee transactions included
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confirmation Latency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{currentTest.metrics.avgConfirmationLatency?.toFixed(1) ?? 'N/A'}s</span>
                    {/* Assuming Clock is an icon component */}
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Average time to confirmation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Parallel Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{currentTest.metrics.parallelProcessingCapability?.toFixed(1) ?? 'N/A'}%</span>
                    {getScoreIcon(currentTest.metrics.parallelProcessingCapability ?? 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Parallel transaction processing capability
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Low-Fee Inclusion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-400">
                        {currentTest.realTimeStatus?.lowFeeTransactions?.confirmed || 0}/{currentTest.realTimeStatus?.lowFeeTransactions?.sent || 0}
                      </span>
                      <div className="text-xs text-gray-500">Confirmed/Sent</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Pending: {currentTest.realTimeStatus?.lowFeeTransactions?.pending || 0}
                      </span>
                      <span className="text-sm text-red-400">
                        Failed: {currentTest.realTimeStatus?.lowFeeTransactions?.failed || 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Low-fee transaction inclusion metrics
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Fee Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Normal Fee Txs:</span>
                      <span className="text-sm font-bold text-green-400">
                        {currentTest.realTimeStatus?.normalFeeTransactions?.confirmed || 0}/{currentTest.realTimeStatus?.normalFeeTransactions?.sent || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Low Fee Txs:</span>
                      <span className="text-sm font-bold text-blue-400">
                        {currentTest.realTimeStatus?.lowFeeTransactions?.confirmed || 0}/{currentTest.realTimeStatus?.lowFeeTransactions?.sent || 0}
                      </span>
                    </div>
                    <div className="text-center mt-2">
                      <div className="text-lg font-bold">
                        {currentTest.realTimeStatus?.normalFeeTransactions?.sent > 0 && currentTest.realTimeStatus?.lowFeeTransactions?.sent > 0
                          ? ((currentTest.realTimeStatus.lowFeeTransactions.confirmed / currentTest.realTimeStatus.lowFeeTransactions.sent) / 
                             (currentTest.realTimeStatus.normalFeeTransactions.confirmed / currentTest.realTimeStatus.normalFeeTransactions.sent) * 100).toFixed(1)
                          : 'N/A'}%
                      </div>
                      <div className="text-xs text-gray-500">Relative Performance</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Low-fee vs normal-fee inclusion comparison
                  </p>
                </CardContent>
              </Card>
            </div>

          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">🔄</div>
                <h3 className="text-lg font-medium mb-2">No Current Test Results</h3>
                <p className="text-sm">Check the Historical Data tab for previous test results.</p>
              </div>
            </CardContent>
          </Card>
        )
      )}
      {activeTab === 'history' && (
        <div className="space-y-6"> {/* Added a wrapper for consistent spacing */}
            <Card>
            <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>
                Historical sequencer performance test results
                </CardDescription>
            </CardHeader>
            <CardContent>
                {testHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No test history available. Run your first test to see results here.
                </div>
                ) : (
                <div className="space-y-4">
                    {testHistory.map((test) => (
                    <div key={test.sessionId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                            <Badge variant="outline">{test.l2Network}</Badge>
                            <Badge variant="secondary">{test.testType.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                            {new Date(test.startedAt).toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium">${typeof test.totalTestCostUSD === 'number' ? test.totalTestCostUSD.toFixed(4) : parseFloat(test.totalTestCostUSD || '0').toFixed(4)}</div>
                            <div className="text-xs text-gray-500">{test.totalTestCostETH} ETH</div>
                        </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="font-medium">Inclusion Rate</div>
                            <div className={getScoreColor(test.metrics.inclusionRate ?? 0)}>
                            {test.metrics.inclusionRate?.toFixed(1) ?? 'N/A'}%
                            </div>
                        </div>
                        <div>
                            <div className="font-medium">Avg Latency</div>
                            <div>{test.metrics.avgConfirmationLatency?.toFixed(1) ?? 'N/A'}s</div>
                        </div>
                        <div>
                            <div className="font-medium">Parallel Processing</div>
                            <div className={getScoreColor(test.metrics.parallelProcessingCapability ?? 0)}>
                            {test.metrics.parallelProcessingCapability?.toFixed(1) ?? 'N/A'}%
                            </div>
                        </div>
                        <div>
                            <div className="font-medium">Low-Fee Inclusion</div>
                            <div className="text-blue-400">
                            {test.realTimeStatus?.lowFeeTransactions ? 
                              `${test.realTimeStatus.lowFeeTransactions.confirmed}/${test.realTimeStatus.lowFeeTransactions.sent}` : 'N/A'}
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </CardContent>
            </Card>

            {testHistory.length > 0 && (
            <Card>
                <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={testHistory.slice(-10).map((test, index) => ({
                        test: index + 1,
                        inclusionRate: test.metrics.inclusionRate ?? 0,
                        latency: test.metrics.avgConfirmationLatency ?? 0,
                        lowFeeSuccess: test.realTimeStatus?.lowFeeTransactions ? 
                          (test.realTimeStatus.lowFeeTransactions.confirmed / Math.max(test.realTimeStatus.lowFeeTransactions.sent, 1)) * 100 : 0,
                        network: test.l2Network
                    }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="test" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="inclusionRate" stroke="#10b981" name="Inclusion Rate (%)" />
                        <Line type="monotone" dataKey="lowFeeSuccess" stroke="#3b82f6" name="Low-Fee Success Rate (%)" />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
                </CardContent>
            </Card>
            )}
        </div>
      )}
    </div>
    </div>
 )
}
