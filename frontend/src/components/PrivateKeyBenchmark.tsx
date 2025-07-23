'use client';

import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Download, RefreshCw, CheckCircle, XCircle, Clock, Zap, Activity } from 'lucide-react';

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

interface TransactionMetrics {
  txHash: string;
  functionName: string;
  contractAddress: string;
  networkId: string;
  gasUsed: number;
  effectiveGasPrice: string;
  l1Fee?: string;
  confirmationTime: number;
  blockNumber: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface BenchmarkSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  transactions: TransactionMetrics[];
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasUsed: number;
    avgGasPrice: string;
    avgConfirmationTime: number;
    totalL1Fees: string;
  };
}

interface Network {
  id: string;
  name: string;
  chainId: number;
}

const API_BASE = 'http://localhost:3001';

export function PrivateKeyBenchmark() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<BenchmarkFunction[]>([]);
  const [functionParameters, setFunctionParameters] = useState<FunctionParameters>({});
  const [networks, setNetworks] = useState<Network[]>([]);
  const [currentSession, setCurrentSession] = useState<BenchmarkSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newContract, setNewContract] = useState({ networkId: '', address: '', name: '' });
  const [validatingContract, setValidatingContract] = useState(false);

  // Load supported networks on mount
  useEffect(() => {
    loadSupportedNetworks();
  }, []);

  // Poll session status when running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && currentSession) {
      interval = setInterval(() => {
        pollSessionStatus(currentSession.id);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentSession]);

  const loadSupportedNetworks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/networks`);
      const data = await response.json();
      if (data.success) {
        setNetworks(data.networks);
      }
    } catch (error) {
      console.error('Failed to load networks:', error);
    }
  };

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
        // Start polling for session status
        pollSessionStatus(data.sessionId);
      } else {
        throw new Error(data.message || 'Failed to start benchmark');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start benchmark');
      setIsRunning(false);
    }
  };

  const pollSessionStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentSession(data.session);
        
        if (data.session.status === 'completed' || data.session.status === 'failed') {
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error('Failed to poll session status:', error);
    }
  };

  const exportResults = async () => {
    if (!currentSession) return;

    try {
      const response = await fetch(`${API_BASE}/api/private-benchmark/sessions/${currentSession.id}/export`);
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([data.content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError('Failed to export results');
    }
  };

  const getNetworkName = (networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    return network ? network.name : networkId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Private Key Benchmark</h1>
          <p className="text-gray-400">Execute smart contract functions using backend private keys and track detailed metrics</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Add Contract */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Add Contract</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                  <select
                    value={newContract.networkId}
                    onChange={(e) => setNewContract(prev => ({ ...prev, networkId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Network</option>
                    {networks.map(network => (
                      <option key={network.id} value={network.id}>{network.name}</option>
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name (Optional)</label>
                  <input
                    type="text"
                    value={newContract.name}
                    onChange={(e) => setNewContract(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contract name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={addContract}
                  disabled={validatingContract || !newContract.address || !newContract.networkId}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
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

            {/* Contract List */}
            {contracts.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Contracts ({contracts.length})</h2>
                <div className="space-y-3">
                  {contracts.map((contract, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{contract.name}</p>
                        <p className="text-gray-400 text-sm font-mono">{contract.address}</p>
                        <p className="text-gray-500 text-xs">{getNetworkName(contract.networkId)}</p>
                      </div>
                      <button
                        onClick={() => removeContract(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Function Selection */}
            {availableFunctions.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Select Functions ({selectedFunctions.length})</h2>
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
                        <span className="text-white font-mono text-lg">{func.name}()</span>
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

            {/* Start Benchmark */}
            <button
              onClick={startBenchmark}
              disabled={isRunning || contracts.length === 0 || selectedFunctions.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              {isRunning ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{isRunning ? 'Running Benchmark...' : 'Start Benchmark'}</span>
            </button>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {currentSession && (
              <>
                {/* Session Summary */}
                <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Session Results</h2>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        currentSession.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                        currentSession.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-gray-300 capitalize">{currentSession.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-400 text-sm">Total Transactions</p>
                      <p className="text-white text-xl font-semibold">{currentSession.summary.totalTransactions}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-400 text-sm">Success Rate</p>
                      <p className="text-white text-xl font-semibold">
                        {currentSession.summary.totalTransactions > 0 
                          ? Math.round((currentSession.summary.successfulTransactions / currentSession.summary.totalTransactions) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-400 text-sm">Total Gas Used</p>
                      <p className="text-white text-xl font-semibold">{currentSession.summary.totalGasUsed.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-gray-400 text-sm">Avg Gas Price</p>
                      <p className="text-white text-xl font-semibold">{currentSession.summary.avgGasPrice} Gwei</p>
                    </div>
                  </div>

                  {currentSession.status === 'completed' && (
                    <button
                      onClick={exportResults}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {/* Recent Transactions */}
                {currentSession.transactions.length > 0 && (
                  <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {currentSession.transactions.slice(-10).reverse().map((tx, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {tx.success ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <p className="text-white font-mono text-sm">{tx.functionName}()</p>
                              <p className="text-gray-400 text-xs">{tx.contractAddress.slice(0, 10)}...</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1 text-orange-400">
                                <Zap className="w-3 h-3" />
                                <span>{tx.gasUsed.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-purple-400">
                                <Clock className="w-3 h-3" />
                                <span>{tx.confirmationTime}ms</span>
                              </div>
                            </div>
                            {tx.txHash && (
                              <p className="text-gray-500 text-xs font-mono">{tx.txHash.slice(0, 10)}...</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!currentSession && !isRunning && (
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-12 text-center">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">No Active Benchmark</h3>
                <p className="text-gray-500">Configure contracts and start a benchmark to see results here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}