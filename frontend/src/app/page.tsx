import { PoolInterface } from '@/components/PoolInterface';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Benchmark Runner</h1>
        <p className="text-gray-600">Execute live benchmarks and monitor real-time performance metrics</p>
      </div>
      <PoolInterface />
    </div>
  );
}