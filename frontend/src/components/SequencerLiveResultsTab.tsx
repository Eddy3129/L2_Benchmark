'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  Zap, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Square,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SequencerLiveResultsTabProps {
  currentTest: {
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
  } | null;
  stopTest: () => void;
  isRunning: boolean;
}

export default function SequencerLiveResultsTab({
  currentTest,
  stopTest,
  isRunning
}: SequencerLiveResultsTabProps) {
  if (!currentTest) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Test</h3>
        <p className="text-gray-400 mb-6">Start a test from the Configuration tab to see live results and analysis</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Status Header */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-white border-gray-600">{currentTest.network}</Badge>
                <Badge variant="secondary">{currentTest.testType}</Badge>
                <div className="flex items-center gap-1">
                  {getStatusIcon(currentTest.status)}
                  <span className={`text-sm ${getStatusColor(currentTest.status)}`}>
                    {currentTest.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Started: {new Date(currentTest.startedAt).toLocaleString()}
              </p>
            </div>
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopTest}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop Test
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{Math.round(currentTest.progress)}%</span>
            </div>
            <Progress value={currentTest.progress} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Inclusion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {currentTest.metrics.inclusionRate.toFixed(1)}%
              </span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Transaction inclusion success rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Confirmation Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {currentTest.metrics.avgConfirmationTime.toFixed(2)}s
              </span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average time to confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Censorship Resistance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {currentTest.metrics.censorshipResistance.toFixed(1)}%
              </span>
              <Shield className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Resistance to transaction censorship
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {parseFloat(currentTest.metrics.totalCost).toFixed(4)}
              </span>
              <DollarSign className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ETH spent on test transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Transaction Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Transactions</span>
                <span className="text-white font-semibold">{currentTest.metrics.totalTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Successful</span>
                <span className="text-green-400 font-semibold">{currentTest.metrics.successfulTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Failed</span>
                <span className="text-red-400 font-semibold">{currentTest.metrics.failedTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Avg Gas Used</span>
                <span className="text-white font-semibold">{currentTest.metrics.avgGasUsed.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Parallel Processing Score</span>
                <span className="text-white font-semibold">{currentTest.metrics.parallelProcessingScore.toFixed(1)}/10</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Processing Efficiency</span>
                  <span className="text-white">{(currentTest.metrics.parallelProcessingScore * 10).toFixed(0)}%</span>
                </div>
                <Progress value={currentTest.metrics.parallelProcessingScore * 10} className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chart */}
      {currentTest.transactions && currentTest.transactions.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Transaction Confirmation Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentTest.transactions.slice(-20).map((tx, index) => ({
                  index: index + 1,
                  confirmationTime: tx.confirmationTime || 0,
                  gasUsed: tx.gasUsed || 0
                }))}>>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="index" stroke="#9CA3AF" />
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
                    dataKey="confirmationTime" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Confirmation Time (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}