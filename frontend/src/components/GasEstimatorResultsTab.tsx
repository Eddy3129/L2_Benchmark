'use client';

import React from 'react';
import { UnifiedGasResults } from './UnifiedGasResults';
import { ExportButton } from './ExportButton';

interface AnalysisResult {
  contractName: string;
  compilation: any;
  results: any[];
  timestamp: string;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  id?: number;
  createdAt?: string;
}

interface GasEstimatorResultsTabProps {
  analysisResult: AnalysisResult | null;
}

export function GasEstimatorResultsTab({ analysisResult }: GasEstimatorResultsTabProps) {
  if (!analysisResult) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 h-96 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
          <p className="text-sm">Run a gas analysis to see detailed results here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gas Analysis Results</h1>
          <p className="text-gray-400 mt-1">
            Contract: <span className="text-blue-400 font-medium">{analysisResult.contractName}</span> • 
            Analyzed: <span className="text-green-400 font-medium">{new Date(analysisResult.timestamp).toLocaleString()}</span>
          </p>
        </div>
        <ExportButton 
          sessions={[]}
          analysisResult={analysisResult}
        />
      </div>
      <UnifiedGasResults result={analysisResult} />
    </div>
  );
}

export default GasEstimatorResultsTab;