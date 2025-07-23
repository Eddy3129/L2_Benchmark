import { PrivateKeyBenchmark } from '@/components/PrivateKeyBenchmark';

export default function PrivateBenchmarkPage() {
  return (
    <div className="min-h-screen">
      <PrivateKeyBenchmark />
    </div>
  );
}

export const metadata = {
  title: 'Private Key Benchmark | Smart Contract Analysis',
  description: 'Execute smart contract functions using backend private keys and track detailed metrics',
};