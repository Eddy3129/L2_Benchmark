'use client';

import { PoolInterface } from '@/components/PoolInterface';
import { useState } from 'react';

export default function BenchmarkPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'automated' | 'custom'>('live');

  const tabs = [
    { id: 'live', label: 'Live Testing', icon: '🔴', description: 'Manual transaction testing' },
    { id: 'automated', label: 'Automated Suite', icon: '🤖', description: 'Full benchmark automation' },
    { id: 'custom', label: 'Custom Scenarios', icon: '⚙️', description: 'Build custom test flows' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Live Benchmark Suite
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Execute real-time blockchain benchmarks, measure performance metrics, and validate your DeFi protocols across multiple networks
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-2xl font-bold text-blue-400">Real-time</div>
                <div className="text-gray-400">Live network testing</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="text-3xl mb-2">🌐</div>
                <div className="text-2xl font-bold text-purple-400">Multi-chain</div>
                <div className="text-gray-400">Cross-network analysis</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-pink-400">Analytics</div>
                <div className="text-gray-400">Detailed insights</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group relative flex items-center space-x-3 px-6 py-4 rounded-2xl font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <div className="text-left">
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.description}</div>
              </div>
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-3xl border border-gray-700/50 overflow-hidden">
          {activeTab === 'live' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Live Testing Environment</h2>
                <p className="text-gray-400">Connect your wallet and interact with deployed contracts in real-time</p>
              </div>
              <PoolInterface />
            </div>
          )}
          
          {activeTab === 'automated' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Automated Benchmark Suite</h2>
                <p className="text-gray-400">Run comprehensive automated tests across multiple scenarios</p>
              </div>
              
              {/* Automated Suite Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🔄 Standard Test Suite</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Token Minting</span>
                        <span className="text-green-400">✓ Ready</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Liquidity Operations</span>
                        <span className="text-green-400">✓ Ready</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Swap Transactions</span>
                        <span className="text-green-400">✓ Ready</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300">
                      Run Standard Suite
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">⚡ Performance Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Average Gas Usage</span>
                        <span className="text-blue-400 font-mono">--</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Transaction Time</span>
                        <span className="text-purple-400 font-mono">--</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Success Rate</span>
                        <span className="text-green-400 font-mono">--</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'custom' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Custom Test Scenarios</h2>
                <p className="text-gray-400">Build and execute custom benchmark scenarios</p>
              </div>
              
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
                <p className="text-gray-400">Custom scenario builder is under development</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}