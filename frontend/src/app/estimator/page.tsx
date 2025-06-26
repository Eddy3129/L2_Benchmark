'use client';

import { useState } from 'react';
import { Monaco } from '@monaco-editor/react';
import { GasEstimatorIDE } from '@/components/GasEstimatorIDE';

export default function EstimatorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gas & Cost Estimator
          </h1>
          <p className="text-gray-600">
            Analyze Solidity contracts and estimate deployment and function call costs across multiple L2 networks.
          </p>
        </div>
        
        <GasEstimatorIDE />
      </div>
    </div>
  );
}