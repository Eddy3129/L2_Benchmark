import { GasDashboard } from '@/components/GasDashboard';
import Link from 'next/link';

export default function Home() {
  const quickActions = [
    {
      title: 'Gas Estimator',
      description: 'Analyze costs across L2 networks',
      icon: '⛽',
      href: '/estimator',
      gradient: 'from-purple-500 to-pink-500',
      stats: 'Multi-chain analysis'
    },
    {
      title: 'Live Benchmark',
      description: 'Real-time testing suite',
      icon: '🚀',
      href: '/benchmark',
      gradient: 'from-green-500 to-emerald-500',
      stats: 'Live testing'
    },
    {
      title: 'Reports & Analytics',
      description: 'Historical insights & trends',
      icon: '📊',
      href: '/analysis',
      gradient: 'from-orange-500 to-red-500',
      stats: 'Data insights'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section 
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                CYBER GAS ORACLE
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
              Professional-grade multi-chain gas analytics with real-time monitoring, comprehensive benchmarking, and advanced visualization tools
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/estimator"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <span className="relative z-10">Start Analysis</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              <Link
                href="/benchmark"
                className="group relative px-8 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:border-gray-600/50"
              >
                <span className="relative z-10">Live Benchmark</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Gas Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <GasDashboard />
        </div>

        {/* Quick Actions */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Quick Actions
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group relative bg-gray-800/30 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity`}></div>
                <div className="relative">
                  <div className="text-4xl mb-4">{action.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 mb-4">{action.description}</p>
                  <div className="text-sm text-gray-500">{action.stats}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}