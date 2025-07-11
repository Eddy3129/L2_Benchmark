'use client';

import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Wallet, Check } from 'lucide-react';
import { NetworkConfig } from '@/types/shared';
import { abiService } from '@/lib/abiService';
import { WalletConnect } from './WalletConnect';

interface BenchmarkContract {
  networkId: string;
  address: string;
  name?: string;
  abi?: any[];
}

interface BenchmarkProgress {
  stage: 'idle' | 'configuring' | 'executing' | 'analyzing' | 'complete';
  progress: number;
  message: string;
  currentNetwork?: string;
  currentFunction?: string;
}

interface BenchmarkConfigTabProps {
  contracts: BenchmarkContract[];
  onAddContract: (contract: BenchmarkContract) => void;
  onRemoveContract: (networkId: string) => void;
  onStartBenchmark: () => void;
  benchmarkProgress: BenchmarkProgress;
  error: string | null;
  isBenchmarking: boolean;
  testnetNetworks: NetworkConfig[];
  useWalletSigning: boolean;
  onToggleWalletSigning: (enabled: boolean) => void;
  isWalletConnected: boolean;
  walletAddress?: string;
}

export function BenchmarkConfigTab({
  contracts,
  onAddContract,
  onRemoveContract,
  onStartBenchmark,
  benchmarkProgress,
  error,
  isBenchmarking,
  testnetNetworks,
  useWalletSigning,
  onToggleWalletSigning,
  isWalletConnected,
  walletAddress
}: BenchmarkConfigTabProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [isLoadingAbi, setIsLoadingAbi] = useState(false);
  const [abiError, setAbiError] = useState<string | null>(null);

  const handleAddContract = async () => {
    if (!selectedNetwork || !contractAddress) {
      setAbiError('Please select a network and enter a contract address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      setAbiError('Please enter a valid contract address.');
      return;
    }
    if (contracts.find(c => c.networkId === selectedNetwork)) {
      setAbiError('Contract already added for this network.');
      return;
    }
    setIsLoadingAbi(true);
    setAbiError(null);
    try {
      const networkConfig = testnetNetworks.find(n => n.id === selectedNetwork);
      if (!networkConfig) {
        throw new Error('Network configuration not found');
      }
      const abiData = await abiService.fetchContractAbi(contractAddress, networkConfig.chainId);
      const contract: BenchmarkContract = {
        networkId: selectedNetwork,
        address: contractAddress,
        name: abiData.contractName || `Contract on ${testnetNetworks.find(n => n.id === selectedNetwork)?.name}`,
        abi: abiData.abi
      };
      onAddContract(contract);
      setContractAddress('');
      setSelectedNetwork('');
    } catch (error: any) {
      console.error('Failed to fetch ABI:', error);
      setAbiError(error.message || 'Failed to fetch contract ABI.');
    } finally {
      setIsLoadingAbi(false);
    }
  };

  const getNetworkConfig = (networkId: string) => {
    return testnetNetworks.find(n => n.id === networkId);
  };

  return (
    <div className="space-y-4">
      {/* Contract Configuration */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-bold text-white mb-4">Contract Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
          {/* Network Dropdown */}
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-gray-300 mb-1">Network</label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingAbi}
            >
              <option value="">Select Network</option>
              {testnetNetworks.map(network => (
                <option key={network.id} value={network.id}>{network.name}</option>
              ))}
            </select>
          </div>

          {/* Contract Address */}
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-gray-300 mb-1">Contract Address</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingAbi}
            />
          </div>
          
          {/* Add Button */}
          <div className="md:col-span-2">
             <button
                onClick={handleAddContract}
                disabled={isLoadingAbi || !selectedNetwork || !contractAddress}
                className="flex w-full justify-center items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
             >
                <Plus className="w-3.5 h-3.5" />
                <span>{isLoadingAbi ? '...' : 'Add'}</span>
             </button>
          </div>
        </div>

        {abiError && (
          <div className="flex items-center space-x-2 p-2 bg-red-900/50 border border-red-700 rounded-md text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">{abiError}</span>
          </div>
        )}

        {contracts.length > 0 && (
          <div className="mt-4">
            <h3 className="text-base font-semibold text-white mb-2">Added Contracts ({contracts.length})</h3>
            <div className="space-y-1.5">
              {contracts.map((contract) => {
                const networkConfig = getNetworkConfig(contract.networkId);
                return (
                  <div key={contract.networkId} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: networkConfig?.color || '#6b7280' }}></div>
                        <div>
                          <div className="text-sm text-white font-medium">{networkConfig?.name}</div>
                          <div className="text-gray-400 text-xs font-mono">{contract.address}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveContract(contract.networkId)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-md transition-colors"
                      disabled={isBenchmarking}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-bold text-white mb-4">Wallet Connection</h2>
        
        <div className="space-y-4">
          {/* Wallet Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
            <div className="flex items-center space-x-3">
              <Wallet className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-sm font-medium text-white">
                  {isWalletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
                </div>
                {isWalletConnected && walletAddress && (
                  <div className="text-xs text-gray-400 font-mono">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isWalletConnected && <Check className="w-4 h-4 text-green-400" />}
              <WalletConnect />
            </div>
          </div>

          {/* Wallet Signing Option */}
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
            <div>
              <div className="text-sm font-medium text-white">Use Wallet Signing</div>
              <div className="text-xs text-gray-400">
                Sign transactions with your connected wallet instead of using backend keys
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useWalletSigning}
                onChange={(e) => onToggleWalletSigning(e.target.checked)}
                disabled={!isWalletConnected}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {useWalletSigning && !isWalletConnected && (
            <div className="flex items-center space-x-2 p-2 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Please connect your wallet to use wallet signing</span>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Execution */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-bold text-white mb-3">Benchmark Execution</h2>
        
        {isBenchmarking && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>{benchmarkProgress.message}</span>
              <span>{benchmarkProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${benchmarkProgress.progress}%` }}></div>
            </div>
            {benchmarkProgress.currentNetwork && (
              <div className="text-xs text-gray-400">
                Processing: {benchmarkProgress.currentNetwork}
                {benchmarkProgress.currentFunction && ` - ${benchmarkProgress.currentFunction}`}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        <button
          onClick={onStartBenchmark}
          disabled={isBenchmarking || contracts.length === 0}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          {isBenchmarking ? 'Running Benchmark...' : 'Start Benchmark'}
        </button>

        {contracts.length === 0 && (
          <p className="text-gray-400 text-xs mt-2 text-center">
            Add at least one contract to start
          </p>
        )}
      </div>
    </div>
  );
}

export default BenchmarkConfigTab;