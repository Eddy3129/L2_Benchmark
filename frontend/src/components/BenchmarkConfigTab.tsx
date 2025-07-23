'use client';

import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, RefreshCw, Settings, Network, Code2, AlertCircle } from 'lucide-react';
import { getTestnetNetworks, getNetworkDisplayName, getNetworkColor } from '@/config/networks';

interface Contract {
  networkId: string;
  address: string;
  name?: string;
}

interface BenchmarkFunction {
  name: string;
  inputs: {
    name: string;
    type: string;
    internalType?: string;
  }[];
  stateMutability: string;
}

interface FunctionParameters {
  [functionName: string]: {
    [paramName: string]: string;
  };
}

interface BenchmarkConfigTabProps {
  onBenchmarkComplete: (result: any) => void;
  onSwitchToResults: () => void;
}

const API_BASE = 'http://localhost:3001';

export default function BenchmarkConfigTab({ onBenchmarkComplete, onSwitchToResults }: BenchmarkConfigTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<BenchmarkFunction[]>([]);
  const [functionParameters, setFunctionParameters] = useState<FunctionParameters>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newContract, setNewContract] = useState({ networkId: '', address: '', name: '' });
  const [validatingContract, setValidatingContract] = useState(false);
  const [progress, setProgress] = useState({ stage: 'idle', message: 'Ready to benchmark' });

  const testnetNetworks = getTestnetNetworks();

  const validateContract = async (address: string, networkId: string) => {
    setValidatingContract(true);
    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/validate-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, networkId })
      });
      const data = await response.json();
      
      if (data.success && data.valid) {
        // Filter out owner-only functions
        const ownerOnlyPatterns = ['onlyOwner', 'owner', 'admin', 'mint', 'burn', 'pause', 'unpause'];
        const usableFunctions = data.functions.filter((func: BenchmarkFunction) => {
          const isOwnerOnly = ownerOnlyPatterns.some(pattern => 
            func.name.toLowerCase().includes(pattern.toLowerCase())
          );
          return !isOwnerOnly;
        });
        
        if (usableFunctions.length === 0) {
          setError('No usable functions found. All functions appear to be owner-only or restricted.');
          return false;
        }
        
        setAvailableFunctions(usableFunctions);
        setSelectedFunctions(usableFunctions.slice(0, 3).map((f: BenchmarkFunction) => f.name));
        
        // Initialize parameter fields for each function
        const initialParams: FunctionParameters = {};
        usableFunctions.forEach((func: BenchmarkFunction) => {
          initialParams[func.name] = {};
          func.inputs.forEach(input => {
            initialParams[func.name][input.name] = '';
          });
        });
        setFunctionParameters(initialParams);
        
        return true;
      } else {
        setError(data.error || 'Contract validation failed');
        return false;
      }
    } catch (error) {
      setError('Failed to validate contract');
      return false;
    } finally {
      setValidatingContract(false);
    }
  };

  const addContract = async () => {
    if (!newContract.address || !newContract.networkId) {
      setError('Please provide contract address and select a network');
      return;
    }

    const isValid = await validateContract(newContract.address, newContract.networkId);
    if (isValid) {
      setContracts(prev => [...prev, {
        ...newContract,
        name: newContract.name || `Contract_${newContract.address.slice(0, 8)}`
      }]);
      setNewContract({ networkId: '', address: '', name: '' });
      setError(null);
    }
  };

  const removeContract = (index: number) => {
    setContracts(prev => prev.filter((_, i) => i !== index));
  };

  const startBenchmark = async () => {
    if (contracts.length === 0) {
      setError('Please add at least one contract');
      return;
    }

    if (selectedFunctions.length === 0) {
      setError('Please select at least one function');
      return;
    }

    // Validate that all required parameters are provided
    const missingParams: string[] = [];
    selectedFunctions.forEach(funcName => {
      const func = availableFunctions.find(f => f.name === funcName);
      if (func && func.inputs.length > 0) {
        func.inputs.forEach(input => {
          const paramValue = functionParameters[funcName]?.[input.name];
          if (!paramValue || paramValue.trim() === '') {
            missingParams.push(`${funcName}.${input.name} (${input.type})`);
          }
        });
      }
    });

    if (missingParams.length > 0) {
      setError(`Missing required parameters: ${missingParams.join(', ')}`);
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress({ stage: 'configuring', message: 'Configuring benchmark...' });

    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contracts: contracts.map(c => ({ networkId: c.networkId, address: c.address, name: c.name })),
          functions: selectedFunctions,
          parameters: functionParameters
        })
      });

      const data = await response.json();
      if (data.success) {
        setProgress({ stage: 'executing', message: 'Executing transactions...' });
        // Poll for results and switch to results tab when complete
        pollBenchmarkResults(data.sessionId);
      } else {
        throw new Error(data.message || 'Failed to start benchmark');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start benchmark');
      setIsRunning(false);
      setProgress({ stage: 'idle', message: 'Ready to benchmark' });
    }
  };

  const pollBenchmarkResults = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/private-benchmark/sessions/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.session.status === 'completed') {
            clearInterval(pollInterval);
            setIsRunning(false);
            setProgress({ stage: 'complete', message: 'Benchmark completed!' });
            onBenchmarkComplete(data.session);
            setTimeout(() => {
              onSwitchToResults();
              setProgress({ stage: 'idle', message: 'Ready to benchmark' });
            }, 1500);
          } else if (data.session.status === 'failed') {
            clearInterval(pollInterval);
            setIsRunning(false);
            setError('Benchmark failed');
            setProgress({ stage: 'idle', message: 'Ready to benchmark' });
          }
        }
      } catch (error) {
        console.error('Failed to poll benchmark status:', error);
      }
    }, 2000);
  };

  return (
    <div className="space-y-8">

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Progress Display */}
      {isRunning && (
        <div className="p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-300">{progress.message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Add Contract Section */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Code2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Add Contract</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                <select
                  value={newContract.networkId}
                  onChange={(e) => setNewContract(prev => ({ ...prev, networkId: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Network</option>
                  {testnetNetworks.map(network => (
                    <option key={network.id} value={network.id}>
                      {network.displayName} ({network.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
                <input
                  type="text"
                  value={newContract.address}
                  onChange={(e) => setNewContract(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={newContract.name}
                  onChange={(e) => setNewContract(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contract name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={addContract}
                disabled={validatingContract || !newContract.address || !newContract.networkId}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium"
              >
                {validatingContract ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{validatingContract ? 'Validating...' : 'Add Contract'}</span>
              </button>
            </div>
          </div>

          {/* Function Selection */}
          {availableFunctions.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Select Functions ({selectedFunctions.length})</h2>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableFunctions.map((func, index) => (
                  <div key={index} className="border border-gray-600 rounded-lg p-4">
                    <label className="flex items-center space-x-3 mb-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFunctions.includes(func.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFunctions(prev => [...prev, func.name]);
                          } else {
                            setSelectedFunctions(prev => prev.filter(f => f !== func.name));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-white font-mono text-sm">{func.name}()</span>
                      <span className="text-gray-400 text-xs">{func.stateMutability}</span>
                    </label>
                    
                    {/* Parameter inputs for selected functions */}
                    {selectedFunctions.includes(func.name) && func.inputs.length > 0 && (
                      <div className="ml-7 space-y-3 border-l-2 border-blue-500/30 pl-4">
                        <p className="text-gray-300 text-sm font-medium">Parameters:</p>
                        {func.inputs.map((input, inputIndex) => (
                          <div key={inputIndex} className="space-y-1">
                            <label className="block text-sm text-gray-300">
                              <span className="font-mono">{input.name}</span>
                              <span className="text-gray-400 ml-2">({input.type})</span>
                              <span className="text-red-400 ml-1">*</span>
                            </label>
                            <input
                              type="text"
                              value={functionParameters[func.name]?.[input.name] || ''}
                              onChange={(e) => {
                                setFunctionParameters(prev => ({
                                  ...prev,
                                  [func.name]: {
                                    ...prev[func.name],
                                    [input.name]: e.target.value
                                  }
                                }));
                              }}
                              placeholder={`Enter ${input.type} value`}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Show parameter info for unselected functions */}
                    {!selectedFunctions.includes(func.name) && func.inputs.length > 0 && (
                      <div className="ml-7 text-gray-500 text-sm">
                        Parameters: {func.inputs.map(input => `${input.name}: ${input.type}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contracts & Actions Panel */}
        <div className="space-y-6">
          {/* Contract List */}
          {contracts.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Network className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Contracts ({contracts.length})</h2>
              </div>
              <div className="space-y-3">
                {contracts.map((contract, index) => {
                  const networkColor = getNetworkColor(contract.networkId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: networkColor }}
                        />
                        <div>
                          <p className="text-white font-medium text-sm">{contract.name}</p>
                          <p className="text-gray-400 text-xs font-mono">{contract.address.slice(0, 10)}...{contract.address.slice(-8)}</p>
                          <p className="text-gray-500 text-xs">{getNetworkDisplayName(contract.networkId)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeContract(index)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Start Benchmark */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Execute Benchmark</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-400">
                  <p>• {contracts.length} contract(s) configured</p>
                  <p>• {selectedFunctions.length} function(s) selected</p>
                  <p>• Private key execution mode</p>
                </div>
                {(contracts.length === 0 || selectedFunctions.length === 0) && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {contracts.length === 0 ? 'Add at least one contract to proceed' : 'Select at least one function to benchmark'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={startBenchmark}
                disabled={isRunning || contracts.length === 0 || selectedFunctions.length === 0}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md transition-colors font-medium"
              >
                {isRunning ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{isRunning ? 'Running Benchmark...' : 'Start Benchmark'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}