'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Square, Network, Zap, DollarSign, Clock, Database, Code, Settings } from 'lucide-react';
import NetworkSelector from '@/components/NetworkSelector';
import LiveBenchmarkResults from '@/components/LiveBenchmarkResults';
import { liveBenchmarkerApi } from '@/lib/api';

interface LiveBenchmarkSession {
  benchmarkId: string;
  network: string;
  chainId: number;
  forkPort: number;
  blockNumber?: number;
  isActive: boolean;
}

interface LiveBenchmarkResult {
  contractAddress?: string;
  deploymentCost: {
    gasUsed: number;
    gasPrice: string;
    totalCostWei: string;
    totalCostEth: string;
    totalCostUsd: number;
  };
  functionCosts: {
    functionName: string;
    gasUsed: number;
    gasPrice: string;
    totalCostWei: string;
    totalCostEth: string;
    totalCostUsd: number;
    l1DataCost?: number;
    l2ExecutionCost?: number;
  }[];
  feeComposition: {
    baseFee: string;
    priorityFee: string;
    maxFeePerGas: string;
    gasPrice: string;
    l1DataFee?: string;
  };
  networkMetrics: {
    blockNumber: number;
    blockTimestamp: number;
    gasLimit: string;
    gasUsed: string;
    baseFeePerGas: string;
  };
  executionTime: number;
}

interface FunctionCall {
  functionName: string;
  parameters: any[];
}

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LiveBenchmarkExample {
    uint256 public value;
    mapping(address => uint256) public balances;
    
    event ValueUpdated(uint256 newValue);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    constructor(uint256 _initialValue) {
        value = _initialValue;
    }
    
    function setValue(uint256 _value) public {
        value = _value;
        emit ValueUpdated(_value);
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
    }
    
    function complexOperation(uint256 iterations) public {
        for (uint256 i = 0; i < iterations; i++) {
            balances[msg.sender] = balances[msg.sender] + 1;
        }
    }
}`;

const SUPPORTED_NETWORKS = [
  { name: 'mainnet', displayName: 'Ethereum Mainnet', chainId: 1, category: 'ethereum' },
  { name: 'arbitrum', displayName: 'Arbitrum One', chainId: 42161, category: 'arbitrum', isLayer2: true },
  { name: 'optimism', displayName: 'Optimism', chainId: 10, category: 'optimism', isLayer2: true },
  { name: 'base', displayName: 'Base', chainId: 8453, category: 'base', isLayer2: true },
  { name: 'polygon', displayName: 'Polygon PoS', chainId: 137, category: 'polygon', isLayer2: true },
  { name: 'scroll', displayName: 'Scroll Mainnet', chainId: 534352, category: 'scroll', isLayer2: true },
  { name: 'linea', displayName: 'Linea Mainnet', chainId: 59144, category: 'linea', isLayer2: true },
  { name: 'ink', displayName: 'Ink Mainnet', chainId: 57073, category: 'ink', isLayer2: true }
];

export default function LiveBenchmarkerIDE() {
  const [contractCode, setContractCode] = useState(DEFAULT_CONTRACT);
  const [selectedNetwork, setSelectedNetwork] = useState('arbitrum');
  const [constructorArgs, setConstructorArgs] = useState('[100]');
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([
    { functionName: 'setValue', parameters: [200] },
    { functionName: 'deposit', parameters: [] },
    { functionName: 'complexOperation', parameters: [10] }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<LiveBenchmarkSession[]>([]);
  const [benchmarkResult, setBenchmarkResult] = useState<LiveBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionResults, setInteractionResults] = useState<any[]>([]);

  // Load active sessions on component mount
  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    try {
      const response = await liveBenchmarkerApi.getActiveBenchmarks();
      if (response.success) {
        setActiveSessions(response.data.activeBenchmarks);
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    }
  };

  const runLiveBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    setBenchmarkResult(null);

    try {
      let parsedConstructorArgs: any[] = [];
      if (constructorArgs.trim()) {
        try {
          parsedConstructorArgs = JSON.parse(constructorArgs);
        } catch (e) {
          throw new Error('Invalid constructor arguments format. Please use valid JSON array.');
        }
      }

      const response = await liveBenchmarkerApi.runLiveBenchmark({
        networkName: selectedNetwork,
        contractCode: contractCode,
        constructorArgs: parsedConstructorArgs,
        functionCalls: functionCalls.map(fc => ({
          functionName: fc.functionName,
          parameters: fc.parameters
        })),
        solidityVersion: '0.8.19'
      });

      console.log('Live benchmark response:', response);

      if (response.success) {
        setBenchmarkResult(response.data);
        // Extract deployed contract address from response
        if (response.data.deploymentCost && response.data.contractAddress) {
          setDeployedContractAddress(response.data.contractAddress);
        }
        setActiveTab('results');
        await loadActiveSessions(); // Refresh active sessions
      } else {
        throw new Error(response.message || 'Live benchmark failed');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const cleanupSession = async (benchmarkId: string) => {
    try {
      await liveBenchmarkerApi.cleanupBenchmark(benchmarkId);
      await loadActiveSessions();
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  };

  const cleanupAllSessions = async () => {
    try {
      await liveBenchmarkerApi.cleanupAllBenchmarks();
      await loadActiveSessions();
      setDeployedContractAddress(null);
      setInteractionResults([]);
    } catch (error) {
      console.error('Failed to cleanup all sessions:', error);
    }
  };

  const interactWithContract = async (functionName: string, parameters: any[]) => {
    if (!deployedContractAddress) {
      setError('No contract deployed. Please run a benchmark first.');
      return;
    }

    setIsInteracting(true);
    setError(null);

    try {
      // Call the live benchmarker API to interact with the deployed contract
      const response = await liveBenchmarkerApi.runLiveBenchmark({
        networkName: selectedNetwork,
        contractCode: contractCode,
        constructorArgs: [],
        functionCalls: [{ functionName, parameters }],
        solidityVersion: '0.8.19',
        contractAddress: deployedContractAddress // Use existing deployed contract
      });

      if (response.success && response.data.functionCosts) {
        const newResult = {
          functionName,
          parameters,
          gasUsed: response.data.functionCosts[0]?.gasUsed || 0,
          totalCostEth: response.data.functionCosts[0]?.totalCostEth || '0',
          totalCostUsd: response.data.functionCosts[0]?.totalCostUsd || 0,
          timestamp: new Date().toISOString()
        };
        setInteractionResults(prev => [newResult, ...prev]);
      } else {
        throw new Error(response.message || 'Contract interaction failed');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to interact with contract');
    } finally {
      setIsInteracting(false);
    }
  };

  const selectedNetworkInfo = SUPPORTED_NETWORKS.find(n => n.name === selectedNetwork);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'editor'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Code className="h-4 w-4" />
              <span>Live Benchmarker</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Results</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'editor' && (
           <div className="space-y-6">
             {/* Network Selection and Controls */}
             <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
               {/* Network Selector */}
               <div className="xl:col-span-1">
                 <NetworkSelector
                   selectedNetwork={selectedNetwork}
                   onNetworkChange={setSelectedNetwork}
                 />
               </div>
               
               {/* Run Controls */}
               <div className="xl:col-span-3">
                 <Card className="bg-gray-800 border-gray-700">
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-white">
                       <Zap className="h-5 w-5" />
                       Live Benchmark Controls
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     {error && (
                       <Alert className="border-red-600 bg-red-900/20">
                         <AlertDescription className="text-red-400">{error}</AlertDescription>
                       </Alert>
                     )}
                     
                     <div className="flex items-center gap-4">
                       <Button
                         onClick={runLiveBenchmark}
                         disabled={isRunning || !contractCode.trim()}
                         className="bg-blue-600 hover:bg-blue-700 text-white"
                       >
                         {isRunning ? (
                           <>
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                             Running Benchmark...
                           </>
                         ) : (
                           <>
                             <Play className="h-4 w-4 mr-2" />
                             Run Live Benchmark
                           </>
                         )}
                       </Button>
                       
                       {activeSessions.length > 0 && (
                         <Button
                           variant="outline"
                           onClick={cleanupAllSessions}
                           className="border-gray-600 text-gray-300 hover:bg-gray-700"
                         >
                           <Square className="h-4 w-4 mr-2" />
                           Cleanup Sessions ({activeSessions.length})
                         </Button>
                       )}
                     </div>
                     
                     {selectedNetworkInfo && (
                       <div className="text-sm text-gray-400">
                         <span>Network: </span>
                         <Badge variant="secondary" className="ml-1">
                           {selectedNetworkInfo.displayName} (Chain {selectedNetworkInfo.chainId})
                         </Badge>
                       </div>
                     )}
                     
                     {deployedContractAddress && (
                       <div className="text-sm text-gray-400">
                         <span>Deployed Contract: </span>
                         <Badge variant="outline" className="ml-1 text-green-400 border-green-400">
                           {deployedContractAddress.slice(0, 10)}...{deployedContractAddress.slice(-8)}
                         </Badge>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               </div>
             </div>
             
             {/* Contract Editor */}
             <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
               <div className="xl:col-span-2">
                 <Card className="bg-gray-800 border-gray-700">
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-white">
                       <Code className="h-5 w-5" />
                       Smart Contract Code
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="p-3">
                     <div className="border border-gray-600 rounded-lg overflow-hidden">
                       <Editor
                         height="400px"
                         defaultLanguage="solidity"
                         value={contractCode}
                         onChange={(value) => setContractCode(value || '')}
                         theme="vs-dark"
                         options={{
                           minimap: { enabled: false },
                           fontSize: 13,
                           lineNumbers: 'on',
                           roundedSelection: false,
                           scrollBeyondLastLine: false,
                           automaticLayout: true,
                           padding: { top: 12, bottom: 12 },
                           wordWrap: 'on',
                         }}
                       />
                     </div>
                   </CardContent>
                 </Card>
               </div>
               
               {/* Function Calls and Constructor Args */}
               <div className="xl:col-span-1 space-y-6">
                 {/* Constructor Arguments */}
                 <Card className="bg-gray-800 border-gray-700">
                   <CardHeader>
                     <CardTitle className="text-white text-sm">Constructor Arguments</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <textarea
                       value={constructorArgs}
                       onChange={(e) => setConstructorArgs(e.target.value)}
                       placeholder='[100] // JSON array format'
                       className="w-full h-20 p-3 bg-gray-900 text-gray-100 font-mono text-sm border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                       spellCheck={false}
                     />
                   </CardContent>
                 </Card>
                 
                 {/* Function Calls Summary */}
                 <Card className="bg-gray-800 border-gray-700">
                   <CardHeader>
                     <CardTitle className="text-white text-sm">Function Calls ({functionCalls.length})</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="space-y-2 max-h-40 overflow-y-auto">
                       {functionCalls.map((fc, index) => (
                         <div key={index} className="text-xs bg-gray-900 p-2 rounded border border-gray-600">
                           <div className="flex justify-between items-start mb-2">
                             <div className="flex-1">
                               <div className="font-mono text-blue-400">{fc.functionName}</div>
                               <div className="text-gray-500 truncate">{JSON.stringify(fc.parameters)}</div>
                             </div>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => {
                                 const newCalls = functionCalls.filter((_, i) => i !== index);
                                 setFunctionCalls(newCalls);
                               }}
                               className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto ml-2"
                             >
                               ×
                             </Button>
                           </div>
                           {deployedContractAddress && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => interactWithContract(fc.functionName, fc.parameters)}
                               disabled={isInteracting}
                               className="w-full text-xs border-green-600 text-green-400 hover:bg-green-900/20"
                             >
                               {isInteracting ? (
                                 <>
                                   <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                   Executing...
                                 </>
                               ) : (
                                 <>
                                   <Zap className="h-3 w-3 mr-1" />
                                   Execute & Get Gas Cost
                                 </>
                               )}
                             </Button>
                           )}
                         </div>
                       ))}
                       {functionCalls.length === 0 && (
                         <div className="text-gray-500 text-xs text-center py-4">
                           No function calls configured
                         </div>
                       )}
                     </div>
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const functionName = prompt('Enter function name:');
                          if (functionName) {
                            const parametersStr = prompt('Enter parameters as JSON array (e.g., [100, "hello"]):') || '[]';
                            try {
                              const parameters = JSON.parse(parametersStr);
                              const newCall = { functionName, parameters };
                              setFunctionCalls([...functionCalls, newCall]);
                            } catch (e) {
                              alert('Invalid JSON format for parameters');
                            }
                          }
                        }}
                        className="w-full mt-3 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                      >
                        Add Function Call
                      </Button>
                   </CardContent>
                 </Card>
               </div>
             </div>
             
             {/* Interaction Results */}
             {interactionResults.length > 0 && (
               <Card className="bg-gray-800 border-gray-700">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-white">
                     <Zap className="h-5 w-5" />
                     Live Interaction Results
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3 max-h-60 overflow-y-auto">
                     {interactionResults.map((result, index) => (
                       <div key={index} className="bg-gray-900 p-3 rounded border border-gray-600">
                         <div className="flex justify-between items-start mb-2">
                           <div className="flex-1">
                             <div className="font-mono text-blue-400 text-sm">{result.functionName}</div>
                             <div className="text-gray-500 text-xs">{JSON.stringify(result.parameters)}</div>
                           </div>
                           <div className="text-xs text-gray-400">
                             {new Date(result.timestamp).toLocaleTimeString()}
                           </div>
                         </div>
                         <div className="grid grid-cols-3 gap-4 text-xs">
                           <div>
                             <span className="text-gray-400">Gas Used:</span>
                             <div className="text-white font-mono">{result.gasUsed.toLocaleString()}</div>
                           </div>
                           <div>
                             <span className="text-gray-400">Cost (ETH):</span>
                             <div className="text-white font-mono">{result.totalCostEth}</div>
                           </div>
                           <div>
                             <span className="text-gray-400">Cost (USD):</span>
                             <div className="text-white font-mono">${result.totalCostUsd.toFixed(4)}</div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setInteractionResults([])}
                     className="w-full mt-3 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                   >
                     Clear Results
                   </Button>
                 </CardContent>
               </Card>
             )}
           </div>
         )}

         {activeTab === 'results' && (
           <div className="space-y-6">
             {benchmarkResult ? (
               <LiveBenchmarkResults result={benchmarkResult} network={selectedNetworkInfo} />
             ) : (
               <Card className="bg-gray-800 border-gray-700">
                 <CardContent className="flex items-center justify-center h-64">
                   <div className="text-center text-gray-400">
                     <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                     <p className="text-lg font-medium mb-2">No benchmark results yet</p>
                     <p className="text-sm">Run a live benchmark to see detailed gas cost analysis</p>
                   </div>
                 </CardContent>
               </Card>
             )}
           </div>
         )}
      </div>
    </div>
  );
}