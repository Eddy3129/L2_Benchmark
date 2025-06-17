import { PoolInterface } from '@/components/PoolInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-black mb-8">DeFi App</h1>
        <PoolInterface />
      </div>
    </main>
  );
}