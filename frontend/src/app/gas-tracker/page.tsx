'use client';

import React from 'react';
import { LiveGasTracker } from '@/components/LiveGasTracker';

export default function GasTrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Live Gas Tracker</h1>
            <p className="text-gray-400">Real-time gas consumption tracking using Wagmi hooks</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gray-800/30 backdrop-blur rounded-xl border border-gray-700 p-6">
          <LiveGasTracker />
        </div>
      </div>
    </div>
  );
}