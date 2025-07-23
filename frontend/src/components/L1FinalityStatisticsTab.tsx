'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, TrendingDown, Activity, Clock, DollarSign } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { L1FinalityResult } from './L1FinalityIDE';

interface L1FinalityStatisticsTabProps {
  statisticsData: L1FinalityResult[];
  aggregatedStats: any;
  formatTime: (seconds: number) => string;
}

export default function L1FinalityStatisticsTab({
  statisticsData,
  aggregatedStats,
  formatTime
}: L1FinalityStatisticsTabProps) {
  if (!aggregatedStats && statisticsData.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Statistics Available</h3>
        <p className="text-gray-400 mb-6">
          Complete some monitoring sessions to view aggregated statistics and trends
        </p>
      </div>
    );
  }

  // Prepare chart data for settlement cost trends
  const costTrendData = statisticsData.slice(0, 10).reverse().map((session, index) => ({
    session: `Session ${index + 1}`,
    avgCost: parseFloat(session.metrics.avgL1SettlementCostPerBatch),
    avgTime: session.metrics.avgTimeToL1Settlement,
    batches: session.batchesTracked
  }));

  return (
    <div className="space-y-6">
      {/* Aggregated Statistics */}
      {aggregatedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <div className="text-sm text-gray-400">Total Sessions</div>
              </div>
              <div className="text-2xl font-bold text-white">
                {aggregatedStats.totalSessions || statisticsData.length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <History className="w-5 h-5 text-teal-400" />
                <div className="text-sm text-gray-400">Total Batches Tracked</div>
              </div>
              <div className="text-2xl font-bold text-white">
                {aggregatedStats.totalBatches || 
                 statisticsData.reduce((sum, session) => sum + session.batchesTracked, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-green-400" />
                <div className="text-sm text-gray-400">Avg Settlement Time</div>
              </div>
              <div className="text-2xl font-bold text-white">
                {aggregatedStats.avgSettlementTime ? 
                  formatTime(aggregatedStats.avgSettlementTime) :
                  formatTime(statisticsData.length > 0 ? 
                    statisticsData.reduce((sum, session) => sum + session.metrics.avgTimeToL1Settlement, 0) / statisticsData.length :
                    0
                  )
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settlement Cost Trends Chart */}
      {costTrendData.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Settlement Cost Trends
            </CardTitle>
            <CardDescription className="text-gray-400">
              Average L1 settlement costs across monitoring sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="session" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'avgCost') return [`$${value.toFixed(4)}`, 'Avg Cost'];
                      if (name === 'avgTime') return [`${value.toFixed(1)}s`, 'Avg Time'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgCost" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="Avg Settlement Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Session Statistics */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Historical L1 Finality Statistics
          </CardTitle>
          <CardDescription className="text-gray-400">
            Detailed statistics from completed monitoring sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statisticsData.map((session) => (
              <div key={session.sessionId} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-purple-400 border-purple-400">
                      {session.l2Network}
                    </Badge>
                    <div className="text-sm text-gray-400">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge 
                    variant={session.status === 'completed' ? 'default' : 'secondary'}
                    className={session.status === 'completed' ? 'bg-green-600' : ''}
                  >
                    {session.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Batches Tracked</div>
                    <div className="text-white font-semibold">{session.batchesTracked}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total L2 Transactions</div>
                    <div className="text-white font-semibold">{session.totalL2Transactions.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Avg Settlement Time</div>
                    <div className="text-white font-semibold">
                      {formatTime(session.metrics.avgTimeToL1Settlement)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Avg Cost per Batch</div>
                    <div className="text-white font-semibold">
                      ${parseFloat(session.metrics.avgL1SettlementCostPerBatch).toFixed(4)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Avg Cost per Transaction</div>
                    <div className="text-white font-semibold">
                      ${parseFloat(session.metrics.avgAmortizedL1CostPerTransaction).toFixed(6)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Finality Confidence</div>
                    <div className="text-white font-semibold">
                      {session.metrics.finalityConfidenceLevel.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Session ID: {session.sessionId}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}