'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Zap, 
  Shield, 
  Globe, 
  Layers, 
  Info,
  Settings
} from 'lucide-react';

export interface NetworkConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  description: string;
}

export interface NetworkConfidenceSelectorProps {
  selectedNetwork: string;
  onNetworkChange: (networkId: string) => void;
  confidenceLevel: number;
  onConfidenceChange: (level: number) => void;
  networks?: NetworkConfig[];
  className?: string;
  showAdvanced?: boolean;
}

const defaultNetworks: NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    icon: Layers,
    color: 'bg-blue-500',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    description: 'Ethereum Mainnet - The original smart contract platform'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: Shield,
    color: 'bg-cyan-500',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    description: 'Arbitrum One - Optimistic rollup with fraud proofs'
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: Zap,
    color: 'bg-red-500',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    description: 'Optimism - Fast, stable, and scalable L2 blockchain'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    icon: Globe,
    color: 'bg-purple-500',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    description: 'Polygon PoS - Multi-chain scaling solution'
  }
];

const confidenceLevels = [
  { value: 50, label: 'Low', description: 'Faster execution, lower confidence' },
  { value: 75, label: 'Medium', description: 'Balanced speed and confidence' },
  { value: 95, label: 'High', description: 'Maximum confidence, slower execution' },
  { value: 99, label: 'Ultra', description: 'Highest confidence for critical operations' }
];

export function NetworkConfidenceSelector({
  selectedNetwork,
  onNetworkChange,
  confidenceLevel,
  onConfidenceChange,
  networks = defaultNetworks,
  className = '',
  showAdvanced = false
}: NetworkConfidenceSelectorProps) {
  const [showTooltips, setShowTooltips] = useState(false);

  const selectedNetworkConfig = networks.find(n => n.id === selectedNetwork);
  const selectedConfidenceConfig = confidenceLevels.find(c => c.value === confidenceLevel) || confidenceLevels[1];

  return (
    <TooltipProvider>
      <Card className={`bg-gray-900/50 border-gray-800 ${className}`}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Network Selection */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300 font-lekton">Network</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-gray-500 hover:text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Select the blockchain network for analysis</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {networks.map((network) => {
                  const Icon = network.icon;
                  const isSelected = network.id === selectedNetwork;
                  
                  return (
                    <Tooltip key={network.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onNetworkChange(network.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 font-lekton text-sm ${
                            isSelected
                              ? `${network.color} text-white border-transparent shadow-lg`
                              : 'bg-gray-800/50 text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{network.name}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-medium">{network.name}</p>
                          <p className="text-gray-400">{network.description}</p>
                          <p className="text-gray-500 mt-1">Chain ID: {network.chainId}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Confidence Level Selection */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300 font-lekton">Confidence</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {selectedConfidenceConfig.label}
                </Badge>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-gray-500 hover:text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Higher confidence requires more confirmations</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="space-y-3">
                {/* Confidence Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="50"
                    max="99"
                    step="1"
                    value={confidenceLevel}
                    onChange={(e) => onConfidenceChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50%</span>
                    <span className="text-gray-300 font-medium">{confidenceLevel}%</span>
                    <span>99%</span>
                  </div>
                </div>
                
                {/* Quick Select Buttons */}
                <div className="flex gap-1">
                  {confidenceLevels.map((level) => (
                    <Tooltip key={level.value}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onConfidenceChange(level.value)}
                          className={`px-2 py-1 text-xs rounded border transition-all duration-200 font-lekton ${
                            confidenceLevel === level.value
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          {level.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{level.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            {showAdvanced && (
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowTooltips(!showTooltips)}
                      className="p-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Advanced settings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Network Info Display */}
          {selectedNetworkConfig && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>Chain ID: {selectedNetworkConfig.chainId}</span>
                  <span>Confidence: {confidenceLevel}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedNetworkConfig.color}`}></div>
                  <span>Connected</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </TooltipProvider>
  );
}