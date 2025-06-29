'use client';

import { PoolInterface } from '@/components/PoolInterface';

export default function BenchmarkPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Live Benchmark Suite
              </h1>
              <p className="text-gray-400 text-sm">
                Real-time blockchain testing with live transaction monitoring, gas analysis, and performance metrics.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Powered by</div>
              <div className="text-sm font-semibold text-green-400">Live Network</div>
            </div>
          </div>
        </div>
      </div>
      
      <PoolInterface />
    </div>
  );
}