import { PoolInterface } from '@/components/PoolInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <PoolInterface />
      </div>
    </main>
  );
}