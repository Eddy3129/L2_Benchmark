import { AnalysisDashboard } from '@/components/AnalysisDashboard';

export default function AnalysisPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Benchmark Analysis</h1>
        <p className="text-gray-600">Analyze and visualize your benchmark results</p>
      </div>
      <AnalysisDashboard />
    </div>
  );
}