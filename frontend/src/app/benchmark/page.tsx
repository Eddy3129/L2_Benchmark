'use client';

import BenchmarkIDE from '@/components/BenchmarkIDE';

export default function BenchmarkPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Live Benchmarker
              </h1>
              <p className="text-gray-400 text-sm">
                Deployed Smart Contract Analysis across Layer 2 networks
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Powered by</div>
              <div className="text-sm font-semibold text-blue-400">Hardhat & Ethers.js</div>
            </div>
          </div>
        </div>
      </div>
    
    <BenchmarkIDE />
     </div>
  );
}