"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Fuel,
  Zap,
  Search,
  Link as LinkIcon,
  FileText,
  Menu,
  X,
  Activity,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview & Analytics",
    },
    {
      href: "/estimator",
      label: "Gas Estimator",
      icon: Fuel,
      description: "Multi-chain cost analysis",
    },
    {
      href: "/benchmark",
      label: "Live Benchmark",
      icon: Zap,
      description: "Real-time testing suite",
    },
    {
      href: "/sequencer-analysis",
      label: "Sequencer Analysis",
      icon: Search,
      description: "Censorship resistance testing",
    },
    {
      href: "/l1-finality",
      label: "L1 Finality",
      icon: LinkIcon,
      description: "Settlement tracking",
    },
    {
      href: "/analysis",
      label: "Reports",
      icon: FileText,
      description: "Historical insights",
    },
  ];

  return (
    <>
      {/* Main Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-2">
          <div className="flex justify-between items-center h-12">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              {/* <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-500 transition-colors">
                <Activity className="w-4 h-4 text-white" />
              </div> */}
              <div>
                <span className="text-xl font-lekton font-semibold text-white group-hover:text-blue-400 transition-colors">
                  LayerTool.
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center space-x-1.5 px-5 py-1.5 rounded-lg text-sm font-lekton transition-all duration-200 ${
                      isActive
                        ? "text-white bg-blue-600/20 border border-blue-600/30 shadow-lg"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50 hover:border hover:border-gray-700"
                    }`}
                    title={item.description}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur border-b border-gray-800">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-lekton text-sm transition-all duration-200 ${
                      isActive
                        ? "text-white bg-blue-600/20 border border-blue-600/30"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-400">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-lg transition-all duration-200 hover:scale-105">
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
