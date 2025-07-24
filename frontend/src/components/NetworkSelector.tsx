'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';

interface NetworkOption {
  id: string;
  name: string;
  displayName: string;
  chainId: number;
  category: string;
  isLayer2?: boolean;
}

interface NetworkSelectorProps {
  selectedNetwork: string;
  onNetworkChange: (networkId: string) => void;
  className?: string;
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'arbitrum',
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    chainId: 42161,
    category: 'Layer 2',
    isLayer2: true
  },
  {
    id: 'optimism',
    name: 'optimism',
    displayName: 'Optimism',
    chainId: 10,
    category: 'Layer 2',
    isLayer2: true
  },
  {
    id: 'base',
    name: 'base',
    displayName: 'Base',
    chainId: 8453,
    category: 'Layer 2',
    isLayer2: true
  },
  {
    id: 'polygon',
    name: 'polygon',
    displayName: 'Polygon',
    chainId: 137,
    category: 'Sidechain'
  },
  {
    id: 'ethereum',
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    chainId: 1,
    category: 'Layer 1'
  }
];

export default function NetworkSelector({
  selectedNetwork,
  onNetworkChange,
  className = ''
}: NetworkSelectorProps) {
  const selectedNetworkData = NETWORKS.find(n => n.id === selectedNetwork);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Network className="h-5 w-5" />
          Network Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                onClick={() => onNetworkChange(network.id)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedNetwork === network.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{network.displayName}</span>
                  <Badge 
                    variant={network.isLayer2 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {network.category}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">
                  Chain ID: {network.chainId}
                </div>
              </button>
            ))}
          </div>
          
          {selectedNetworkData && (
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-400">Selected:</span>
                <span className="ml-2 font-medium">{selectedNetworkData.displayName}</span>
                <Badge 
                  variant={selectedNetworkData.isLayer2 ? 'default' : 'secondary'}
                  className="ml-2 text-xs"
                >
                  {selectedNetworkData.category}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}