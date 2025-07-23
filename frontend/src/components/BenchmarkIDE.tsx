'use client';

import React, { useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import BenchmarkConfigTab from './BenchmarkConfigTab';
import BenchmarkResultsTab from './BenchmarkResultsTab';

export default function BenchmarkIDE() {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Benchmark Configuration</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              disabled={!benchmarkResult}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Benchmark Results</span>
                {benchmarkResult && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    1
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'config' ? (
          <BenchmarkConfigTab 
            onBenchmarkComplete={setBenchmarkResult}
            onSwitchToResults={() => setActiveTab('results')}
          />
        ) : (
          <BenchmarkResultsTab benchmarkResult={benchmarkResult} />
        )}
      </div>
    </div>
  );
}