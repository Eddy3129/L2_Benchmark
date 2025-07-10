'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  TrendingUp, 
  Shield, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Activity,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

interface SequencerTestHistoryTabProps {
  testHistory: TestHistoryItem[];
  isLoading: boolean;
}

export default function SequencerTestHistoryTab({
  testHistory,
  isLoading
}: SequencerTestHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Loading Test History</h3>
        <p className="text-gray-400">Fetching historical test data...</p>
      </div>
    );
  }

  if (!testHistory || testHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Test History</h3>
        <p className="text-gray-400 mb-6">Run some tests to see historical data and trends</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Prepare chart data
  const chartData = testHistory.slice(-10).map((test, index) => ({
    testNumber: index + 1,
    inclusionRate: test.metrics.inclusionRate,
    avgConfirmationTime: test.metrics.avgConfirmationTime,
    censorshipResistance: test.metrics.censorshipResistance,
    parallelProcessingScore: test.metrics.parallelProcessingScore,
    date: new Date(test.completedAt).toLocaleDateString()
  }));

  const networkStats = testHistory.reduce((acc, test) => {
    if (!acc[test.network]) {
      acc[test.network] = { total: 0, completed: 0, failed: 0 };
    }
    acc[test.network].total++;
    if (test.status === 'completed') acc[test.network].completed++;
    if (test.status === 'failed') acc[test.network].failed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number; failed: number }>);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{testHistory.length}</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">All time test runs</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-400">
                {((testHistory.filter(t => t.status === 'completed').length / testHistory.length) * 100).toFixed(1)}%
              </span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Completed successfully</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Inclusion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {(testHistory.reduce((sum, test) => sum + test.metrics.inclusionRate, 0) / testHistory.length).toFixed(1)}%
              </span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Average across all tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Performance Trends (Last 10 Tests)</CardTitle>
          <CardDescription className="text-gray-400">
            Track sequencer performance metrics over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="inclusionRate" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Inclusion Rate (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="censorshipResistance" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Censorship Resistance (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="parallelProcessingScore" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Parallel Processing Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Network Distribution */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Network Distribution</CardTitle>
          <CardDescription className="text-gray-400">
            Test distribution across different networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(networkStats).map(([network, stats]) => (
              <div key={network} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-white border-gray-600">{network}</Badge>
                  <span className="text-gray-300">{stats.total} tests</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-400 text-sm">{stats.completed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-400 text-sm">{stats.failed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test History List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Tests</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed history of recent sequencer analysis tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testHistory.slice(0, 10).map((test) => (
              <div key={test.testId} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-white border-gray-600">{test.network}</Badge>
                    <Badge variant="secondary">{test.testType}</Badge>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(test.status)}
                      <span className={`text-sm ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {new Date(test.completedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(test.completedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Inclusion Rate</span>
                    <p className="text-white font-semibold">{test.metrics.inclusionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Avg Confirmation</span>
                    <p className="text-white font-semibold">{test.metrics.avgConfirmationTime.toFixed(2)}s</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Censorship Resistance</span>
                    <p className="text-white font-semibold">{test.metrics.censorshipResistance.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Transactions</span>
                    <p className="text-white font-semibold">{test.metrics.totalTransactions}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Test ID: {test.testId.slice(0, 8)}...</span>
                    <span>Cost: {parseFloat(test.metrics.totalCost).toFixed(4)} ETH</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}