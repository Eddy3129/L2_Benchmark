'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  History,
  Settings,
  Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Component definitions
const TestConfigurationTab = ({ 
  targetNetwork, 
  setTargetNetwork, 
  testType, 
  setTestType, 
  transactionCount, 
  setTransactionCount, 
  minFeePerGas, 
  setMinFeePerGas, 
  maxFeePerGas, 
  setMaxFeePerGas, 
  error, 
  startTest, 
  testHistory 
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="card card-elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <CardTitle className="font-lekton">Network Confidence Selector</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={targetNetwork} onValueChange={setTargetNetwork}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arbitrum">Arbitrum One</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="base">Base</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="card card-elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-500" />
              <CardTitle className="font-lekton">Configuration Panel</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 font-lekton">Test Type</label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inclusion_rate">Inclusion Rate Test</SelectItem>
                    <SelectItem value="censorship_resistance">Censorship Resistance</SelectItem>
                    <SelectItem value="parallel_processing">Parallel Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 font-lekton">Transaction Count</label>
                <Input
                  type="number"
                  value={transactionCount}
                  onChange={(e) => setTransactionCount(Number(e.target.value))}
                  min="1"
                  max="1000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 font-lekton">Min Fee Per Gas (Gwei)</label>
                <Input
                  type="number"
                  value={minFeePerGas}
                  onChange={(e) => setMinFeePerGas(Number(e.target.value))}
                  min="1"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 font-lekton">Max Fee Per Gas (Gwei)</label>
                <Input
                  type="number"
                  value={maxFeePerGas}
                  onChange={(e) => setMaxFeePerGas(Number(e.target.value))}
                  min="1"
                  step="0.1"
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={startTest} 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-lekton"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Sequencer Test
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="card card-elevated">
          <CardHeader>
            <CardTitle className="font-lekton">Test Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 font-lekton">
              This test will analyze the selected L2 sequencer's behavior by sending transactions with varying fee structures and monitoring inclusion patterns.
            </p>
          </CardContent>
        </Card>

        <Card className="card card-elevated">
          <CardHeader>
            <CardTitle className="font-lekton">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-lekton">Tests Run</span>
                <span className="text-sm font-bold font-lekton">{testHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-lekton">Current Target</span>
                <span className="text-sm font-bold font-lekton capitalize">{targetNetwork || 'None'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const LiveResultsTab = ({ currentTest }) => (
  <div className="space-y-6">
    {!currentTest ? (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2 font-lekton">No Active Test</h3>
        <p className="text-gray-400 mb-6 font-lekton">Start a test to see live results and analysis</p>
        <Button variant="outline" className="font-lekton">
          <Settings className="w-4 h-4 mr-2" />
          Configure Test
        </Button>
      </div>
    ) : (
      <>
        <Card className="card card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <CardTitle className="font-lekton">Test Progress</CardTitle>
              </div>
              <Badge variant="outline" className="font-lekton">
                {currentTest.status === 'running' ? 'In Progress' : currentTest.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-lekton">Current Stage</span>
                <span className="font-lekton capitalize">{currentTest.currentStage || 'setup'}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${currentTest.currentStage === 'setup' ? 'text-blue-400' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentTest.currentStage === 'setup' ? 'bg-blue-400' : 'bg-gray-600'}`}></div>
                  <span className="text-xs font-lekton">Setup</span>
                </div>
                <div className={`flex items-center gap-2 ${currentTest.currentStage === 'execution' ? 'text-blue-400' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentTest.currentStage === 'execution' ? 'bg-blue-400' : 'bg-gray-600'}`}></div>
                  <span className="text-xs font-lekton">Execution</span>
                </div>
                <div className={`flex items-center gap-2 ${currentTest.currentStage === 'analyze' ? 'text-blue-400' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentTest.currentStage === 'analyze' ? 'bg-blue-400' : 'bg-gray-600'}`}></div>
                  <span className="text-xs font-lekton">Analyze</span>
                </div>
              </div>
              <Progress value={currentTest.progress || 0} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="card card-elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <CardTitle className="font-lekton">Transaction Status Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-2xl font-bold text-blue-400 mb-1 font-lekton">
                  {currentTest.realTimeStatus?.totalTransactions || 0}
                </div>
                <div className="text-xs text-gray-400 font-lekton">Sent</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-2xl font-bold text-green-400 mb-1 font-lekton">
                  {currentTest.realTimeStatus?.confirmedTransactions || 0}
                </div>
                <div className="text-xs text-gray-400 font-lekton">Confirmed</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-2xl font-bold text-yellow-400 mb-1 font-lekton">
                  {currentTest.realTimeStatus?.pendingTransactions || 0}
                </div>
                <div className="text-xs text-gray-400 font-lekton">Pending</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-2xl font-bold text-red-400 mb-1 font-lekton">
                  {currentTest.realTimeStatus?.failedTransactions || 0}
                </div>
                <div className="text-xs text-gray-400 font-lekton">Failed</div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-lekton">Success Rate</span>
                  <span className="text-sm font-lekton">
                    {currentTest.realTimeStatus?.totalTransactions > 0 ? 
                      `${((currentTest.realTimeStatus?.confirmedTransactions || 0) / currentTest.realTimeStatus.totalTransactions * 100).toFixed(1)}%` : 
                      '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={currentTest.realTimeStatus?.totalTransactions > 0 ? 
                    (currentTest.realTimeStatus?.confirmedTransactions || 0) / currentTest.realTimeStatus.totalTransactions * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-lekton">Failure Rate</span>
                  <span className="text-sm font-lekton">
                    {currentTest.realTimeStatus?.totalTransactions > 0 ? 
                      `${((currentTest.realTimeStatus?.failedTransactions || 0) / currentTest.realTimeStatus.totalTransactions * 100).toFixed(1)}%` : 
                      '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={currentTest.realTimeStatus?.totalTransactions > 0 ? 
                    (currentTest.realTimeStatus?.failedTransactions || 0) / currentTest.realTimeStatus.totalTransactions * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    )}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, description }) => (
  <Card className="card card-elevated">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 font-lekton">{title}</p>
          <p className={`text-2xl font-bold ${color} font-lekton`}>{value}</p>
          {description && <p className="text-xs text-gray-500 mt-1 font-lekton">{description}</p>}
        </div>
        <Icon className={`w-8 h-8 ${color.replace('text-', 'text-').replace('-400', '-500')}`} />
      </div>
    </CardContent>
  </Card>
);

const TestHistoryCard = ({ testHistory, getScoreColor }) => (
  <Card className="card card-elevated">
    <CardHeader>
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-blue-500" />
        <CardTitle className="font-lekton">Test History</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      {testHistory.length === 0 ? (
        <p className="text-gray-400 text-center py-8 font-lekton">No test history available</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {testHistory.slice(-5).reverse().map((test, index) => (
            <div key={test.id} className="border border-gray-600 rounded-lg p-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-lekton">{test.l2Network}</Badge>
                    <Badge variant="secondary" className="font-lekton">{test.testType.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 font-lekton">
                    {new Date(test.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium font-lekton">${typeof test.totalTestCostUSD === 'number' ? test.totalTestCostUSD.toFixed(4) : parseFloat(test.totalTestCostUSD || '0').toFixed(4)}</div>
                  <div className="text-xs text-gray-500 font-lekton">{test.totalTestCostETH} ETH</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium font-lekton">Inclusion Rate</div>
                  <div className={`${getScoreColor(test.metrics.inclusionRate ?? 0)} font-lekton`}>
                    {test.metrics.inclusionRate?.toFixed(1) ?? 'N/A'}%
                  </div>
                </div>
                <div>
                  <div className="font-medium font-lekton">Avg Latency</div>
                  <div className="font-lekton">{test.metrics.avgConfirmationLatency?.toFixed(1) ?? 'N/A'}s</div>
                </div>
                <div>
                  <div className="font-medium font-lekton">Parallel Processing</div>
                  <div className={`${getScoreColor(test.metrics.parallelProcessingCapability ?? 0)} font-lekton`}>
                    {test.metrics.parallelProcessingCapability?.toFixed(1) ?? 'N/A'}%
                  </div>
                </div>
                <div>
                  <div className="font-medium font-lekton">Low-Fee Inclusion</div>
                  <div className="text-blue-400 font-lekton">
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
);

const PerformanceTrendsCard = ({ testHistory }) => (
  <Card className="card card-elevated">
    <CardHeader>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-500" />
        <CardTitle className="font-lekton">Performance Trends</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={testHistory.slice(-10).map((test, index) => ({
            test: index + 1,
            inclusionRate: test.metrics.inclusionRate ?? 0,
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
);

const ResultsTab = ({ currentTest, testHistory, getScoreIcon }) => (
  <div className="space-y-6">
    {currentTest && currentTest.status === 'completed' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Inclusion Rate"
          value={`${currentTest.metrics?.inclusionRate?.toFixed(1) ?? 'N/A'}%`}
          icon={CheckCircle}
          color="text-green-400"
          description="Percentage of transactions included in blocks"
        />
        <MetricCard
          title="Avg Confirmation Latency"
          value={`${currentTest.metrics?.avgConfirmationLatency?.toFixed(1) ?? 'N/A'}s`}
          icon={Clock}
          color="text-blue-400"
          description="Average time for transaction confirmation"
        />
        <MetricCard
          title="Parallel Processing"
          value={`${currentTest.metrics?.parallelProcessingCapability?.toFixed(1) ?? 'N/A'}%`}
          icon={Zap}
          color="text-purple-400"
          description="Sequencer's parallel processing efficiency"
        />
        <MetricCard
          title="Low-Fee Inclusion"
          value={currentTest.realTimeStatus?.lowFeeTransactions ?
            `${currentTest.realTimeStatus.lowFeeTransactions.confirmed}/${currentTest.realTimeStatus.lowFeeTransactions.sent}` : 'N/A'}
          icon={TrendingUp}
          color="text-orange-400"
          description="Low-fee transactions successfully included"
        />
        <MetricCard
          title="Fee Comparison"
          value={currentTest.metrics?.feeEfficiencyScore ? `${currentTest.metrics.feeEfficiencyScore.toFixed(1)}` : 'N/A'}
          icon={BarChart3}
          color="text-cyan-400"
          description="Fee efficiency compared to other L2s"
        />
      </div>
    ) : (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2 font-lekton">No Current Test Results</h3>
        <p className="text-gray-400 font-lekton">Complete a test to view detailed analysis and metrics</p>
      </div>
    )}
  </div>
);

const HistoryTab = ({ testHistory, getScoreColor }) => (
  <div className="space-y-6">
    <TestHistoryCard testHistory={testHistory} getScoreColor={getScoreColor} />
    {testHistory.length > 0 && (
      <PerformanceTrendsCard testHistory={testHistory} />
    )}
  </div>
);

// Main component
export default function SequencerAnalysisPage() {
  const [activeTab, setActiveTab] = useState('test');
  const [targetNetwork, setTargetNetwork] = useState('arbitrum');
  const [testType, setTestType] = useState('inclusion_rate');
  const [transactionCount, setTransactionCount] = useState(100);
  const [minFeePerGas, setMinFeePerGas] = useState(1.0);
  const [maxFeePerGas, setMaxFeePerGas] = useState(10.0);
  const [currentTest, setCurrentTest] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [error, setError] = useState('');

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return XCircle;
  };

  const startTest = async () => {
    if (!targetNetwork) {
      setError('Please select a target network');
      return;
    }
    
    setError('');
    const newTest = {
      id: Date.now().toString(),
      l2Network: targetNetwork,
      testType,
      transactionCount,
      minFeePerGas,
      maxFeePerGas,
      status: 'running',
      currentStage: 'setup',
      progress: 0,
      startedAt: new Date().toISOString(),
      realTimeStatus: {
        totalTransactions: 0,
        confirmedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        lowFeeTransactions: { sent: 0, confirmed: 0 },
        normalFeeTransactions: { sent: 0, confirmed: 0 }
      },
      metrics: {}
    };
    
    setCurrentTest(newTest);
    setActiveTab('live');
    
    // Simulate test progression
    setTimeout(() => {
      setCurrentTest(prev => ({ ...prev, currentStage: 'execution', progress: 30 }));
    }, 2000);
    
    setTimeout(() => {
      setCurrentTest(prev => ({ ...prev, currentStage: 'analyze', progress: 70 }));
    }, 5000);
    
    setTimeout(() => {
      const completedTest = {
        ...newTest,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        totalTestCostETH: '0.0234',
        totalTestCostUSD: 52.34,
        metrics: {
          inclusionRate: 87.5,
          avgConfirmationLatency: 2.3,
          parallelProcessingCapability: 92.1,
          censorshipResistanceScore: 8.7,
          feeEfficiencyScore: 7.8
        },
        realTimeStatus: {
          totalTransactions: transactionCount,
          confirmedTransactions: Math.floor(transactionCount * 0.875),
          pendingTransactions: 0,
          failedTransactions: Math.floor(transactionCount * 0.125),
          lowFeeTransactions: { sent: Math.floor(transactionCount * 0.4), confirmed: Math.floor(transactionCount * 0.3) },
          normalFeeTransactions: { sent: Math.floor(transactionCount * 0.6), confirmed: Math.floor(transactionCount * 0.575) }
        }
      };
      
      setCurrentTest(completedTest);
      setTestHistory(prev => [...prev, completedTest]);
    }, 8000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 font-lekton">
            Sequencer Analysis Dashboard
          </h1>
          <p className="text-gray-400 font-lekton">Comprehensive testing and analysis of L2 sequencer behavior</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="test" className="font-lekton">
              <Settings className="w-4 h-4 mr-2" />
              Test Configuration
            </TabsTrigger>
            <TabsTrigger value="live" className="font-lekton">
              <Eye className="w-4 h-4 mr-2" />
              Live Results
            </TabsTrigger>
            <TabsTrigger value="results" className="font-lekton">
              <BarChart3 className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="font-lekton">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <TestConfigurationTab 
              targetNetwork={targetNetwork}
              setTargetNetwork={setTargetNetwork}
              testType={testType}
              setTestType={setTestType}
              transactionCount={transactionCount}
              setTransactionCount={setTransactionCount}
              minFeePerGas={minFeePerGas}
              setMinFeePerGas={setMinFeePerGas}
              maxFeePerGas={maxFeePerGas}
              setMaxFeePerGas={setMaxFeePerGas}
              error={error}
              startTest={startTest}
              testHistory={testHistory}
            />
          </TabsContent>

          <TabsContent value="live">
            <LiveResultsTab currentTest={currentTest} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsTab 
              currentTest={currentTest}
              testHistory={testHistory}
              getScoreIcon={getScoreIcon}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab 
              testHistory={testHistory}
              getScoreColor={getScoreColor}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}