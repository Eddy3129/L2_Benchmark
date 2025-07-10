'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Link as LinkIcon, Clock, DollarSign } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BatchData } from './L1FinalityIDE';

interface L1FinalityBatchHistoryTabProps {
  batchHistory: BatchData[];
  formatTime: (seconds: number) => string;
}

export default function L1FinalityBatchHistoryTab({
  batchHistory,
  formatTime
}: L1FinalityBatchHistoryTabProps) {
  if (batchHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Batch Data</h3>
        <p className="text-gray-400 mb-6">
          Start monitoring to see real-time L2 batch settlement data on L1
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = batchHistory.slice(0, 20).reverse().map((batch, index) => ({
    batch: `#${batch.batchNumber}`,
    settlementTime: batch.settlementTime,
    costUSD: batch.l1GasCostUSD,
    transactions: batch.transactionCount
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Settlement Time Trends
          </CardTitle>
          <CardDescription className="text-gray-400">
            L2 batch settlement times on Ethereum L1 over recent batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="batch" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `${value}s`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'settlementTime') return [`${value}s`, 'Settlement Time'];
                    if (name === 'costUSD') return [`$${value.toFixed(4)}`, 'Cost (USD)'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="settlementTime" 
                  stroke="#14B8A6" 
                  fill="#14B8A6" 
                  fillOpacity={0.3}
                  name="Settlement Time (s)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Batch List */}
      <div className="grid gap-4">
        {batchHistory.map((batch) => (
          <Card key={`${batch.batchNumber}-${batch.timestamp}`} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-teal-400 border-teal-400">
                    Batch #{batch.batchNumber}
                  </Badge>
                  <div className="text-sm text-gray-400">
                    {new Date(batch.timestamp).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`https://etherscan.io/tx/${batch.l1TxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <LinkIcon className="w-4 h-4" />
                  View on Etherscan
                </a>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    Settlement Time
                  </div>
                  <div className="text-white font-semibold">
                    {formatTime(batch.settlementTime)}
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-sm mb-1">Transactions</div>
                  <div className="text-white font-semibold">
                    {batch.transactionCount.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    L1 Gas Cost
                  </div>
                  <div className="text-white font-semibold">
                    ${batch.l1GasCostUSD.toFixed(4)}
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400 text-sm mb-1">Cost per Tx</div>
                  <div className="text-white font-semibold">
                    {batch.amortizedCostPerTx}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <div>L2 Blocks: {batch.l2BlockStart.toLocaleString()} - {batch.l2BlockEnd.toLocaleString()}</div>
                <div className="font-mono mt-1">L1 Tx: {batch.l1TxHash}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}