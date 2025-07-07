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
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                setTestSteps(prev => prev.map((step, idx) => 
                  idx === 3 ? { ...step, status: 'completed' } : step
                ));
                setProgress(100);
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
                <div className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${
                    isCompleted 
                      ? 'bg-green-500 border-green-400 text-white' 
                      : isFailed 
                      ? 'bg-red-500 border-red-400 text-white'
                      : isRunning
                      ? 'bg-blue-500 border-blue-400 text-white animate-pulse'
                      : isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400'
                  }
                `}>
                  {isCompleted ? '✓' : isFailed ? '✗' : isRunning ? '⟳' : index + 1}
                </div>
                <div className={`
                  text-xs mt-1 text-center max-w-16 leading-tight
                  ${
                    isCompleted 
                      ? 'text-green-400' 
                      : isFailed 
                      ? 'text-red-400'
                      : isActive 
                      ? 'text-blue-400' 
                      : 'text-gray-500'
                  }
                `}>
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Sequencer Performance & Censorship Resistance Analysis
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Evaluate L2 sequencer behavior under non-standard conditions. Test censorship resistance, 
          parallel processing capabilities, and fee market dynamics with empirical data.
        </p>
      </div>

      <Tabs defaultValue="test" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">Run Test</TabsTrigger>
          <TabsTrigger value="live">Live Results</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">Historical Data</TabsTrigger>
        </TabsList>

        {/* Test Configuration Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                Test Configuration
              </CardTitle>
              <CardDescription>
                Configure sequencer performance test parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="network">L2 Network</Label>
                  <Select
                    value={testConfig.l2Network}
                    onValueChange={(value) => setTestConfig(prev => ({ ...prev, l2Network: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select L2 network" />
                    </SelectTrigger>
                    <SelectContent>
                      {NETWORK_OPTIONS.map((network) => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testType">Test Type</Label>
                  <Select
                    value={testConfig.testType}
                    onValueChange={(value: any) => setTestConfig(prev => ({ ...prev, testType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPE_OPTIONS.map((test) => (
                        <SelectItem key={test.value} value={test.value}>
                          <div>
                            <div className="font-medium">{test.label}</div>
                            <div className="text-xs text-gray-500">{test.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionCount">Transaction Count</Label>
                  <Input
                    id="transactionCount"
                    type="number"
                    min="1"
                    max="100"
                    value={testConfig.transactionCount}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, transactionCount: parseInt(e.target.value) || 10 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Monitoring Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="30"
                    max="120"
                    value={60}
                    disabled
                    className="bg-gray-700 text-gray-400"
                  />
                  <p className="text-xs text-gray-500">Fixed at 60 seconds for optimal performance</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minFee">Min Fee Per Gas (wei)</Label>
                  <Input
                    id="minFee"
                    type="number"
                    min="1"
                    value={testConfig.minFeePerGas}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, minFeePerGas: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxFee">Max Fee Per Gas (wei) - Optional</Label>
                  <Input
                    id="maxFee"
                    type="number"
                    min="1"
                    value={testConfig.maxFeePerGas || ''}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, maxFeePerGas: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Leave empty for single fee test"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={runSequencerTest}
                disabled={isRunning || !testConfig.l2Network}
                className="w-full"
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Results Tab */}
        <TabsContent value="live" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isRunning && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Test Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressBar steps={testSteps} currentStep={currentStepIndex} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-6">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{currentTest?.realTimeStatus?.transactionsSent || 0}</div>
                    <div className="text-xs text-gray-500">Transactions Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{currentTest?.realTimeStatus?.transactionsConfirmed || 0}</div>
                    <div className="text-xs text-gray-500">Confirmed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{currentTest?.realTimeStatus?.transactionsPending || 0}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{currentTest?.realTimeStatus?.transactionsFailed || 0}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
                
                {/* Low Fee vs Normal Fee Breakdown */}
                {currentTest?.realTimeStatus && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Low Fee Transactions</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sent:</span>
                          <span className="text-blue-400">{currentTest.realTimeStatus.lowFeeTransactions.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Confirmed:</span>
                          <span className="text-green-400">{currentTest.realTimeStatus.lowFeeTransactions.confirmed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pending:</span>
                          <span className="text-yellow-400">{currentTest.realTimeStatus.lowFeeTransactions.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Failed:</span>
                          <span className="text-red-400">{currentTest.realTimeStatus.lowFeeTransactions.failed}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Normal Fee Transactions</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sent:</span>
                          <span className="text-blue-400">{currentTest.realTimeStatus.normalFeeTransactions.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Confirmed:</span>
                          <span className="text-green-400">{currentTest.realTimeStatus.normalFeeTransactions.confirmed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pending:</span>
                          <span className="text-yellow-400">{currentTest.realTimeStatus.normalFeeTransactions.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Failed:</span>
                          <span className="text-red-400">{currentTest.realTimeStatus.normalFeeTransactions.failed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentTest && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Inclusion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{currentTest.metrics.inclusionRate?.toFixed(1) ?? 'N/A'}%</span>
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
                    <span className="text-2xl font-bold">{currentTest.metrics.avgConfirmationLatency?.toFixed(1) ?? 'N/A'}s</span>
                    <Clock className="w-4 h-4 text-blue-500" />
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
                    <span className="text-2xl font-bold">{currentTest.metrics.parallelProcessingCapability?.toFixed(1) ?? 'N/A'}%</span>
                    {getScoreIcon(currentTest.metrics.parallelProcessingCapability ?? 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Parallel transaction processing capability
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Censorship Resistance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${getScoreColor(currentTest.metrics.censorshipResistanceScore ?? 0)}`}>
                      {currentTest.metrics.censorshipResistanceScore?.toFixed(0) ?? 'N/A'}
                    </span>
                    {getScoreIcon(currentTest.metrics.censorshipResistanceScore ?? 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Overall censorship resistance score
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transaction monitoring chart removed - individual transaction data not available in current API */}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {!currentTest && testHistory.length === 0 ? (
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
              {/* Test Summary */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <CardTitle className="text-sm font-medium">Censorship Resistance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${getScoreColor(currentTest.metrics.censorshipResistanceScore ?? 0)}`}>
                        {currentTest.metrics.censorshipResistanceScore?.toFixed(0) ?? 'N/A'}
                      </span>
                      {getScoreIcon(currentTest.metrics.censorshipResistanceScore ?? 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Overall censorship resistance score
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction analysis chart removed - individual transaction data not available in current API */}
              {/* The realTimeStatus provides aggregate counts which are displayed above */}
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
          )}
        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="history" className="space-y-6">
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
                          <div className="font-medium">Censorship Score</div>
                          <div className={getScoreColor(test.metrics.censorshipResistanceScore ?? 0)}>
                            {test.metrics.censorshipResistanceScore?.toFixed(0) ?? 'N/A'}
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
                      censorshipScore: test.metrics.censorshipResistanceScore ?? 0,
                      network: test.l2Network
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="test" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="inclusionRate" stroke="#10b981" name="Inclusion Rate (%)" />
                      <Line type="monotone" dataKey="censorshipScore" stroke="#3b82f6" name="Censorship Score" />
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