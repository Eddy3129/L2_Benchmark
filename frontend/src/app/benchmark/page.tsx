'use client';

import { useState } from 'react';
import { PoolInterface } from '@/components/PoolInterface';
import { TestnetBenchmark } from '@/components/TestnetBenchmark';

export default function BenchmarkPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'testnet'>('testnet');

  const tabs = [
    {
      id: 'testnet' as const,
      label: 'Testnet Contracts',
      icon: '🌐',
      description: 'Benchmark any deployed contract on testnets'
    },
    {
      id: 'local' as const,
      label: 'Local Pool',
      icon: '🏠',
      description: 'Local Hardhat pool benchmarking'
    }
  ];

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
          
          {/* Tab Navigation */}
          <div className="mt-6">
            <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                    ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{tab.label}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="container mx-auto">
        {activeTab === 'testnet' ? <TestnetBenchmark /> : <PoolInterface />}
      </div>
    </div>
  );
}