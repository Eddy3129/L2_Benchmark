import { GasDashboard } from '@/components/GasDashboard';
import { PoolInterface } from '@/components/PoolInterface';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold neon-cyan mb-4 glitch" data-text="CYBER GAS ORACLE">
          CYBER GAS ORACLE
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Professional-grade multi-chain gas analytics with real-time monitoring, 
          predictive algorithms, and cyberpunk-enhanced visualization
        </p>
      </div>
      
      {/* Multi-Chain Gas Dashboard */}
      <div className="mb-12">
        <GasDashboard />
      </div>
      
      {/* Benchmark Runner */}
      <div className="mb-8">
        <div className="cyber-bg rounded-2xl cyber-glow p-8">
          <h2 className="text-3xl font-bold neon-pink mb-4 glitch" data-text="⚡ BENCHMARK RUNNER">
            ⚡ BENCHMARK RUNNER
          </h2>
          <p className="text-gray-300 mb-6">
            Execute live benchmarks and monitor real-time performance metrics across multiple chains
          </p>
          <PoolInterface />
        </div>
      </div>
    </div>
  );
}