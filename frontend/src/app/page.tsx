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
   
      {/* Gas Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* <div className="mb-6">
            <h2 className="text-2xl font-bold text-center mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Quick Actions
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="group relative bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}></div>
                  <div className="relative">
                    <div className="text-3xl mb-3">{action.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-1">{action.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{action.description}</p>
                    <div className="text-xs text-gray-500">{action.stats}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div> */}
        <div className="mb-12">
          <GasDashboard />
        </div>
      </div>
    </div>
  );
}