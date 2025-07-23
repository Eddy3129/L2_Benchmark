'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@heroui/tooltip';
import { NetworkAnalysisStatus } from '@/types/shared';
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
  Loader2,
  AlertTriangle,
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
  selectedNetworks: string[];
  onNetworkChange: (networkIds: string[]) => void;
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
  networkStatuses?: NetworkAnalysisStatus[];
  analysisMethod?: 'SIMULATION' | 'STATIC' | 'HYBRID';
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
    id: 'base',
    name: 'Base',
    icon: Layers,
    color: 'bg-blue-600',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    description: 'Base - Coinbase L2 built on Optimism stack'
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    icon: Globe,
    color: 'bg-purple-500',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    description: 'Polygon PoS - Multi-chain scaling solution'
  },
  {
    id: 'linea',
    name: 'Linea',
    icon: Layers,
    color: 'bg-gray-800',
    chainId: 59144,
    rpcUrl: 'https://rpc.linea.build',
    explorerUrl: 'https://lineascan.build',
    description: 'Linea - ConsenSys zkEVM rollup for Ethereum'
  },
  {
    id: 'scroll',
    name: 'Scroll',
    icon: Shield,
    color: 'bg-orange-500',
    chainId: 534352,
    rpcUrl: 'https://rpc.scroll.io',
    explorerUrl: 'https://scrollscan.com',
    description: 'Scroll - Native zkEVM Layer 2 for Ethereum'
  },
  {
    id: 'ink',
    name: 'Ink',
    icon: Zap,
    color: 'bg-black',
    chainId: 57073,
    rpcUrl: 'https://rpc-gel.inkonchain.com',
    explorerUrl: 'https://explorer.inkonchain.com',
    description: 'Ink - Kraken L2 built on Optimism stack'
  }
];

const confidenceLevels = [
  { value: 50, label: '50%', description: 'Basic confidence level for quick estimates.' },
  { value: 68, label: '68%', description: 'Standard confidence level for most use cases.' },
  { value: 80, label: '80%', description: 'High confidence level for important transactions.' },
  { value: 90, label: '90%', description: 'High confidence level.' },
  { value: 95, label: '95%', description: 'Very high confidence level.' },
  { value: 99, label: '99%', description: 'Maximum confidence for critical operations.' }
];

export function NetworkConfidenceSelector({
  selectedNetworks,
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
  isLoadingTemplate = false,
  networkStatuses,
  analysisMethod
}: NetworkConfidenceSelectorProps) {

  const handleNetworkToggle = (networkId: string) => {
    if (isAnalyzing) return;
    
    const updatedNetworks = selectedNetworks.includes(networkId)
       ? selectedNetworks.filter(id => id !== networkId)
       : [...selectedNetworks, networkId];
    onNetworkChange(updatedNetworks);
  };

  const getNetworkStatus = (networkId: string): NetworkAnalysisStatus | undefined => {
    return networkStatuses?.find(status => status.network === networkId);
  };

  const getNetworkStatusIcon = (networkId: string) => {
    const status = getNetworkStatus(networkId);
    if (!status) return null;
    
    switch (status.status) {
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const selectedConfidenceConfig = confidenceLevels.find(c => c.value === confidenceLevel) || confidenceLevels[1];

  return (
    <Card className={`bg-gray-900/50 border-gray-800 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300 font-lekton">Network</span>
                <Tooltip content="Select the blockchain network for analysis">
                  <Info className="w-3 h-3 text-gray-500 hover:text-gray-400 cursor-help" />
                </Tooltip>
              </div>
                 
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {networks.map((network) => {
                  const Icon = network.icon;
                  const isSelected = selectedNetworks.includes(network.id);
                  
                  return (
                    <button
                      key={network.id}
                      onClick={() => handleNetworkToggle(network.id)}
                      disabled={isAnalyzing}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 font-lekton text-sm relative min-w-0 ${
                        isSelected
                          ? `${network.color} text-white border-transparent shadow-lg`
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                      } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline truncate">{network.name}</span>
                      {getNetworkStatusIcon(network.id) && (
                        <div className="absolute -top-1 -right-1">
                          {getNetworkStatusIcon(network.id)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300 font-lekton">Confidence Level</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {selectedConfidenceConfig.label}
                </Badge>
                <Tooltip content="Higher confidence levels provide more accurate estimates but take longer to compute">
                  <Info className="w-3 h-3 text-gray-500 hover:text-gray-400 cursor-help" />
                </Tooltip>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {confidenceLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => onConfidenceChange(level.value)}
                    disabled={isAnalyzing}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      confidenceLevel === level.value
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                    } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-80">
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
                  {error}
                </div>
              )}
              
              {analysisProgress && (
                <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">{analysisProgress.stage}</span>
                  </div>
                  <p className="text-xs text-blue-200 mb-2">{analysisProgress.message}</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${analysisProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {onAnalyze && (
                <button
                  onClick={onAnalyze}
                  disabled={selectedNetworks.length === 0 || isAnalyzing || isLoadingTemplate}
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
  );
}