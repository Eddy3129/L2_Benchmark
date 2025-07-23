'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Shield, 
  Clock, 
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Cell,
  Area,
  AreaChart,
  Pie
} from 'recharts';

interface TestHistoryItem {
  testId: string;
  network: string;
  testType: string;
  status: 'completed' | 'failed';
  startedAt: string;
  completedAt: string;
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
}

interface SequencerAnalyticsTabProps {
  testHistory: TestHistoryItem[];
  isLoading: boolean;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function SequencerAnalyticsTab({
  testHistory,
  isLoading
}: SequencerAnalyticsTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Loading Analytics</h3>
        <p className="text-gray-400">Analyzing test data and generating insights...</p>
      </div>
    );
  }

  if (!testHistory || testHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Analytics Data</h3>
        <p className="text-gray-400 mb-6">Run some tests to generate analytics and insights</p>
      </div>
    );
  }

  const completedTests = testHistory.filter(test => test.status === 'completed');
  
  // Calculate analytics
  const avgInclusionRate = completedTests.reduce((sum, test) => sum + test.metrics.inclusionRate, 0) / completedTests.length;
  const avgConfirmationTime = completedTests.reduce((sum, test) => sum + test.metrics.avgConfirmationTime, 0) / completedTests.length;
  const avgCensorshipResistance = completedTests.reduce((sum, test) => sum + test.metrics.censorshipResistance, 0) / completedTests.length;
  const avgParallelProcessing = completedTests.reduce((sum, test) => sum + test.metrics.parallelProcessingScore, 0) / completedTests.length;
  
  // Network performance comparison
  const networkPerformance = completedTests.reduce((acc, test) => {
    if (!acc[test.network]) {
      acc[test.network] = {
        network: test.network,
        tests: 0,
        avgInclusionRate: 0,
        avgConfirmationTime: 0,
        avgCensorshipResistance: 0,
        avgParallelProcessing: 0,
        totalCost: 0
      };
    }
    
    const current = acc[test.network];
    current.tests++;
    current.avgInclusionRate = (current.avgInclusionRate * (current.tests - 1) + test.metrics.inclusionRate) / current.tests;
    current.avgConfirmationTime = (current.avgConfirmationTime * (current.tests - 1) + test.metrics.avgConfirmationTime) / current.tests;
    current.avgCensorshipResistance = (current.avgCensorshipResistance * (current.tests - 1) + test.metrics.censorshipResistance) / current.tests;
    current.avgParallelProcessing = (current.avgParallelProcessing * (current.tests - 1) + test.metrics.parallelProcessingScore) / current.tests;
    current.totalCost += parseFloat(test.metrics.totalCost);
    
    return acc;
  }, {} as Record<string, any>);

  const networkData = Object.values(networkPerformance);
  
  // Test type distribution
  const testTypeDistribution = testHistory.reduce((acc, test) => {
    acc[test.testType] = (acc[test.testType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const pieData = Object.entries(testTypeDistribution).map(([type, count]) => ({
    name: type,
    value: count,
    percentage: ((count / testHistory.length) * 100).toFixed(1)
  }));
  
  // Performance trends over time
  const trendData = completedTests.slice(-20).map((test, index) => ({
    testNumber: index + 1,
    inclusionRate: test.metrics.inclusionRate,
    confirmationTime: test.metrics.avgConfirmationTime,
    censorshipResistance: test.metrics.censorshipResistance,
    parallelProcessing: test.metrics.parallelProcessingScore,
    date: new Date(test.completedAt).toLocaleDateString()
  }));
  
  // Performance score calculation
  const calculatePerformanceScore = (metrics: any) => {
    const inclusionWeight = 0.3;
    const confirmationWeight = 0.25;
    const censorshipWeight = 0.25;
    const parallelWeight = 0.2;
    
    const inclusionScore = metrics.inclusionRate;
    const confirmationScore = Math.max(0, 100 - (metrics.avgConfirmationTime * 10)); // Lower time = higher score
    const censorshipScore = metrics.censorshipResistance;
    const parallelScore = metrics.parallelProcessingScore * 10;
    
    return (
      inclusionScore * inclusionWeight +
      confirmationScore * confirmationWeight +
      censorshipScore * censorshipWeight +
      parallelScore * parallelWeight
    );
  };
  
  const overallScore = calculatePerformanceScore({
    inclusionRate: avgInclusionRate,
    avgConfirmationTime: avgConfirmationTime,
    censorshipResistance: avgCensorshipResistance,
    parallelProcessingScore: avgParallelProcessing
  });
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (score >= 60) return <Activity className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Performance Score */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Overall Performance Score
          </CardTitle>
          <CardDescription className="text-gray-400">
            Composite score based on all performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore.toFixed(1)}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {getScoreIcon(overallScore)}
                  <span className={`text-sm ${getScoreColor(overallScore)}`}>
                    {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Based on {completedTests.length} tests</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Performance Grade</p>
              <p className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : 'D'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Avg Inclusion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {avgInclusionRate.toFixed(1)}%
              </span>
              {avgInclusionRate >= 95 ? 
                <TrendingUp className="w-4 h-4 text-green-500" /> : 
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgInclusionRate >= 95 ? 'Excellent' : avgInclusionRate >= 90 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Confirmation Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {avgConfirmationTime.toFixed(2)}s
              </span>
              {avgConfirmationTime <= 5 ? 
                <TrendingUp className="w-4 h-4 text-green-500" /> : 
                <TrendingDown className="w-4 h-4 text-red-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgConfirmationTime <= 5 ? 'Fast' : avgConfirmationTime <= 10 ? 'Moderate' : 'Slow'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Censorship Resistance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {avgCensorshipResistance.toFixed(1)}%
              </span>
              {avgCensorshipResistance >= 90 ? 
                <Shield className="w-4 h-4 text-green-500" /> : 
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgCensorshipResistance >= 90 ? 'Strong' : avgCensorshipResistance >= 75 ? 'Moderate' : 'Weak'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Parallel Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {avgParallelProcessing.toFixed(1)}/10
              </span>
              {avgParallelProcessing >= 8 ? 
                <TrendingUp className="w-4 h-4 text-green-500" /> : 
                <Activity className="w-4 h-4 text-yellow-500" />
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgParallelProcessing >= 8 ? 'Excellent' : avgParallelProcessing >= 6 ? 'Good' : 'Limited'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Network Performance Comparison */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Network Performance Comparison</CardTitle>
          <CardDescription className="text-gray-400">
            Compare sequencer performance across different networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="network" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="avgInclusionRate" fill="#3B82F6" name="Inclusion Rate (%)" />
                <Bar dataKey="avgCensorshipResistance" fill="#8B5CF6" name="Censorship Resistance (%)" />
                <Bar dataKey="avgParallelProcessing" fill="#10B981" name="Parallel Processing (0-10)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Type Distribution */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Test Type Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Distribution of different test types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Trends */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Performance Trends</CardTitle>
            <CardDescription className="text-gray-400">
              Track performance metrics over recent tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="testNumber" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="inclusionRate" 
                    stackId="1" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                    name="Inclusion Rate (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {avgInclusionRate < 95 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-yellow-400 font-medium">Low Inclusion Rate Detected</p>
                <p className="text-gray-300 text-sm mt-1">
                  Your average inclusion rate is {avgInclusionRate.toFixed(1)}%. Consider investigating network congestion or gas pricing strategies.
                </p>
              </div>
            )}
            
            {avgConfirmationTime > 10 && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-400 font-medium">High Confirmation Times</p>
                <p className="text-gray-300 text-sm mt-1">
                  Average confirmation time is {avgConfirmationTime.toFixed(2)}s. This may indicate sequencer performance issues or network congestion.
                </p>
              </div>
            )}
            
            {avgCensorshipResistance < 80 && (
              <div className="p-3 bg-purple-900/20 border border-purple-800 rounded-lg">
                <p className="text-purple-400 font-medium">Censorship Resistance Concerns</p>
                <p className="text-gray-300 text-sm mt-1">
                  Censorship resistance is at {avgCensorshipResistance.toFixed(1)}%. Monitor for potential transaction filtering or delays.
                </p>
              </div>
            )}
            
            {overallScore >= 80 && (
              <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-green-400 font-medium">Excellent Performance</p>
                <p className="text-gray-300 text-sm mt-1">
                  Your sequencer is performing excellently with a score of {overallScore.toFixed(1)}. Keep monitoring to maintain this level.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}