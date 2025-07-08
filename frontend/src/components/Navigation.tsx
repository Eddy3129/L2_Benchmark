'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletConnect } from './WalletConnect';
import { useState } from 'react';

export function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { 
      href: '/', 
      label: 'Dashboard', 
      icon: '🏠', 
      description: 'Overview & Analytics',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      href: '/estimator', 
      label: 'Gas Estimator', 
      icon: '⛽', 
      description: 'Multi-chain cost analysis',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      href: '/benchmark', 
      label: 'Live Benchmark', 
      icon: '🚀', 
      description: 'Real-time testing suite',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      href: '/sequencer-analysis', 
      label: 'Sequencer Analysis', 
      icon: '🔍', 
      description: 'Censorship resistance testing',
      gradient: 'from-indigo-500 to-purple-500'
    },
    { 
      href: '/l1-finality', 
      label: 'L1 Finality', 
      icon: '⛓️', 
      description: 'Settlement tracking',
      gradient: 'from-teal-500 to-blue-500'
    },

    { 
      href: '/analysis', 
      label: 'Reports', 
      icon: '📊', 
      description: 'Historical insights',
      gradient: 'from-rose-500 to-red-500'
    },
  ];

  return (
    <>
      {/* Main Navigation */}
      <nav className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-1 rounded-xl">
                  <span className="text-white text-xl font-bold">⚡</span>
                </div>
              </div>
              <div className='ml-4'>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  L2 Benchmarker
                </span>
                <div className="text-xs text-gray-400">Research Platform</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                    title={item.description}
                  >
                    {/* Active background */}
                    {isActive && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl opacity-20`}></div>
                    )}
                    
                    {/* Hover effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                    
                    {/* Content */}
                    <span className="relative text-lg">{item.icon}</span>
                    <span className="relative">{item.label}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r ${item.gradient} rounded-full`}></div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Wallet Connection */}
            <div className="hidden md:flex items-center">
              <WalletConnect />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-900/98 backdrop-blur-xl border-t border-gray-800/50">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} bg-opacity-20 text-white border border-white/10`
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div>{item.label}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-gray-800/50">
                <WalletConnect />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Navigation Enhancement - Floating Action Button for Quick Access */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <Link
            href="/benchmark"
            className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
            title="Quick Benchmark"
          >
            <span className="text-xl">🚀</span>
          </Link>
        </div>
      </div>
    </>
  );
}