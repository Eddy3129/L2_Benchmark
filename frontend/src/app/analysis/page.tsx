'use client';

import { AnalysisDashboard } from '@/components/AnalysisDashboard';

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Reports & Analytics
              </h1>
              <p className="text-gray-400 text-sm">
                Comprehensive benchmark analysis with historical insights, performance trends, and detailed session reports.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Powered by</div>
              <div className="text-sm font-semibold text-purple-400">Advanced Analytics</div>
            </div>
          </div>
        </div>
      </div>
      
      <AnalysisDashboard />
    </div>
  );
}