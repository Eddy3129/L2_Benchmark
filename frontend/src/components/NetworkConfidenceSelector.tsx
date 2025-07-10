'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Zap, 
  Shield, 
  Globe, 
  Layers, 
  Info,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader,
  Play
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
  selectedNetwork: string[];
  onNetworkChange: (networkId: string) => void;
  confidenceLevel: number;
  onConfidenceChange: (level: number) => void;
  networks?: NetworkConfig[];
  className?: string;
  showAdvanced?: boolean;
  error?: string | null;
  isAnalyzing?: boolean;
  analysisProgress?: { stage: string; message: string; progress: number };
  onAnalyze?: () => void;
  isLoadingTemplate?: boolean;
}

const defaultNetworks: NetworkConfig[] = [
  {
    id: 'mainnet',
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
  { value: 70, label: '70%', description: 'Standard confidence level.' },
  { value: 80, label: '80%', description: 'Increased confidence level.' },
  { value: 90, label: '90%', description: 'High confidence level.' },
  { value: 95, label: '95%', description: 'Very high confidence level.' },
  { value: 99, label: '99%', description: 'Maximum confidence for critical operations.' }
];

export function NetworkConfidenceSelector({
  selectedNetwork,
  onNetworkChange,
  confidenceLevel,
  onConfidenceChange,
  networks = defaultNetworks,
  className = '',
  showAdvanced = false,
  error = null,
  isAnalyzing = false,
  analysisProgress,
  onAnalyze,
  isLoadingTemplate = false
}: NetworkConfidenceSelectorProps) {

  const selectedConfidenceConfig = confidenceLevels.find(c => c.value === confidenceLevel) || confidenceLevels[1];

  return (
    <TooltipProvider>
      <Card className={`bg-gray-900/50 border-gray-800 ${className}`}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Side: Network and Confidence Selection */}
            <div className="flex-1 space-y-6">
              {/* Network Selection */}
              <div>
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
                    const isSelected = selectedNetwork.includes(network.id);

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
              <div>
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
                
                <div className="flex flex-wrap gap-2">
                  {confidenceLevels.map((level) => (
                    <Tooltip key={level.value}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onConfidenceChange(level.value)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 font-lekton ${
                            confidenceLevel === level.value
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                              : 'bg-gray-800/50 text-gray-300 border-gray-700 hover:bg-gray-800'
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

            {/* Right Side: Status Indicator */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300 font-lekton">Status</span>
              </div>
              
              <div className="space-y-3">
                {/* Refactored Combined Status Display */}
                <div className={`p-3 rounded-lg border transition-all duration-300 min-h-[70px] flex flex-col justify-center ${
                  isAnalyzing && analysisProgress ? 'bg-blue-900/20 border-blue-700/30' :
                  error ? 'bg-red-900/20 border-red-700/30' :
                  'bg-gray-800/50 border-gray-700'
                }`}>
                  {isAnalyzing && analysisProgress ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Loader className="w-4 h-4 text-blue-400 animate-spin" />
                        <div className="text-sm text-blue-300 font-lekton">{analysisProgress.message}</div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${analysisProgress.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-blue-400 mt-1 text-right">{analysisProgress.progress}%</div>
                    </div>
                  ) : error ? (
                    <Tooltip>
                      <TooltipTrigger className="w-full text-left cursor-help">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-sm text-red-300 font-lekton">Analysis Failed</span>
                            <p className="text-xs text-red-300/70 mt-1 truncate">{error}</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs whitespace-pre-wrap">{error}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-green-400 font-lekton">Ready to Analyze</span>
                        <p className="text-xs text-gray-400 mt-1">Select networks to begin.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                {onAnalyze && (
                  <button
                    onClick={onAnalyze}
                    disabled={isAnalyzing || isLoadingTemplate || selectedNetwork.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-lekton text-sm transition-all duration-200"
                  >
                    {isAnalyzing ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}