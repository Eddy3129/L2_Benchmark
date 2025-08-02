'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Database,
  Zap,
} from 'lucide-react';
import GasMonitoringTable from '@/components/GasMonitoringTable';
import GasEstimationTable from '@/components/GasEstimationTable';
import LiveBenchmarkTable from '@/components/LiveBenchmarkTable';

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'estimation' | 'benchmark'>('monitoring');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 bg-gray-900 text-gray-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-400" />
              Gas Analysis Reports
            </h1>
            <p className="text-gray-400 mt-1">
              Historical gas monitoring and estimation data analysis
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader className="pb-3">
          <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
            <Button
              onClick={() => setActiveTab('monitoring')}
              variant={activeTab === 'monitoring' ? 'default' : 'ghost'}
              className={`flex-1 flex items-center gap-2 ${
                activeTab === 'monitoring'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Database className="w-4 h-4" />
              Gas Monitoring
            </Button>
            <Button
              onClick={() => setActiveTab('estimation')}
              variant={activeTab === 'estimation' ? 'default' : 'ghost'}
              className={`flex-1 flex items-center gap-2 ${
                activeTab === 'estimation'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              Gas Estimation
            </Button>
            <Button
              onClick={() => setActiveTab('benchmark')}
              variant={activeTab === 'benchmark' ? 'default' : 'ghost'}
              className={`flex-1 flex items-center gap-2 ${
                activeTab === 'benchmark'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Live Benchmark
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {activeTab === 'monitoring' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <h3 className="text-blue-300 font-medium mb-2">Gas Monitoring Data</h3>
                <p className="text-sm text-gray-400">
                  Real-time gas price data collected from the Gas Dashboard. This includes base fees, priority fees, and transaction costs across different networks.
                </p>
              </div>
              <GasMonitoringTable />
            </div>
          )}
          {activeTab === 'estimation' && (
            <div>
              <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                <h3 className="text-yellow-300 font-medium mb-2">Gas Estimation Data</h3>
                <p className="text-sm text-gray-400">
                  Contract deployment cost estimations from the Gas Estimator. This includes measured gas usage, L2 execution costs, L1 data costs, and network comparisons.
                </p>
              </div>
              <GasEstimationTable />
            </div>
          )}
          {activeTab === 'benchmark' && (
            <div>
              <div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/50 rounded-lg">
                <h3 className="text-purple-300 font-medium mb-2">Live Benchmark Data</h3>
                <p className="text-sm text-gray-400">
                  Real contract execution benchmarks from the Live Benchmarker. This includes actual gas usage statistics, execution counts, L1/L2 cost breakdowns, and performance metrics across networks.
                </p>
              </div>
              <LiveBenchmarkTable />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}