'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
// Card components replaced with div elements using card classes
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Square, Network, Zap, Code, Settings, FileText, Save, Trash2 } from 'lucide-react';
import { NetworkConfidenceSelector } from './NetworkConfidenceSelector';
import LiveBenchmarkResults from '@/components/LiveBenchmarkResults';
import FunctionCallsEditor from '@/components/FunctionCallsEditor';
import { liveBenchmarkerApi } from '@/lib/api';
import { CONTRACT_TEMPLATES, loadContractTemplate } from '@/lib/contractTemplate';
import { extractWritableFunctions, BenchmarkFunction } from '@/config/contracts';
import { compileContract } from '@/lib/abiService';

// --- Shared Types ---
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

// --- Constants ---
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
  {
    id: 'mainnet',
    name: 'Ethereum',
    icon: Zap,
    color: 'bg-blue-500',
    chainId: 1,
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://etherscan.io',
    description: 'Ethereum Mainnet - The original smart contract platform'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: Network,
    color: 'bg-cyan-500',
    chainId: 42161,
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://arbiscan.io',
    description: 'Arbitrum One - Optimistic rollup with fraud proofs'
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: Zap,
    color: 'bg-red-500',
    chainId: 10,
    rpcUrl: `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://optimistic.etherscan.io',
    description: 'Optimism - Fast, stable, and scalable L2 blockchain'
  },
  {
    id: 'base',
    name: 'Base',
    icon: Network,
    color: 'bg-blue-600',
    chainId: 8453,
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://basescan.org',
    description: 'Base - Coinbase L2 built on Optimism stack'
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    icon: Settings,
    color: 'bg-purple-500',
    chainId: 137,
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://polygonscan.com',
    description: 'Polygon PoS - Multi-chain scaling solution'
  },
  {
    id: 'linea',
    name: 'Linea',
    icon: Network,
    color: 'bg-gray-800',
    chainId: 59144,
    rpcUrl: `https://linea-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://lineascan.build',
    description: 'Linea - ConsenSys zkEVM rollup for Ethereum'
  },
  {
    id: 'scroll',
    name: 'Scroll',
    icon: Settings,
    color: 'bg-orange-500',
    chainId: 534352,
    rpcUrl: `https://scroll-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://scrollscan.com',
    description: 'Scroll - Native zkEVM Layer 2 for Ethereum'
  },
  {
    id: 'zksync-era',
    name: 'ZkSync Era',
    icon: Zap,
    color: 'bg-black',
    chainId: 324,
    rpcUrl: `https://zksync-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://explorer.zksync.io',
    description: 'ZkSync Era - Scalable zkRollup for Ethereum'
  },
  {
    id: 'ink',
    name: 'Ink',
    icon: Zap,
    color: 'bg-black',
    chainId: 57073,
    rpcUrl: `https://ink-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: 'https://explorer.inkonchain.com',
    description: 'Ink - Kraken L2 built on Optimism stack'
  }
];

// --- Main Component ---
export default function LiveBenchmarkerIDE() {
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(CONTRACT_TEMPLATES[0].id);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['arbitrum']);
  const [confidenceLevel, setConfidenceLevel] = useState(68);
  const [constructorArgs, setConstructorArgs] = useState('[100]');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<LiveBenchmarkSession[]>([]);
  const [benchmarkResult, setBenchmarkResult] = useState<LiveBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'results'>('editor');
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionResults, setInteractionResults] = useState<any[]>([]);
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<BenchmarkFunction[]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  useEffect(() => {
    loadActiveSessions();
    handleTemplateChange(CONTRACT_TEMPLATES[0].id);
  }, []);

  // Extract functions when contract code changes
  useEffect(() => {
    extractFunctionsFromCode();
  }, [contractCode]);

  const handleTemplateChange = async (templateId: string) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setIsLoadingTemplate(true);
      setError(null);
      try {
        const contractCode = await loadContractTemplate(template.fileName);
        setSelectedTemplate(templateId);
        setContractCode(contractCode);
        setContractName(template.contractName);
      } catch (error) {
        console.error('Failed to load contract template:', error);
        setError('Failed to load contract template. Please try again.');
      } finally {
        setIsLoadingTemplate(false);
      }
    }
  };

  const extractFunctionsFromCode = async () => {
    if (!contractCode.trim()) {
      setAvailableFunctions([]);
      return;
    }

    try {
      const compilation = await compileContract(contractCode, contractName || 'Contract');
      if (compilation && compilation.abi) {
        const writableFunctions = extractWritableFunctions(compilation.abi);
        setAvailableFunctions(writableFunctions);
      }
    } catch (error) {
      console.warn('Failed to extract functions:', error);
      setAvailableFunctions([]);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await liveBenchmarkerApi.getActiveBenchmarks();
      if (response.success) {
        setActiveSessions(response.data.activeBenchmarks);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  };

  const runLiveBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    setBenchmarkResult(null);
    setInteractionResults([]);
    setDeployedContractAddress(null);

    try {
      let parsedConstructorArgs: any[] = [];
      if (constructorArgs.trim()) {
        try {
          parsedConstructorArgs = JSON.parse(constructorArgs);
        } catch (e) {
          throw new Error('Invalid constructor arguments format. Please use a valid JSON array.');
        }
      }

      const response = await liveBenchmarkerApi.runLiveBenchmark({
        networkName: selectedNetworks[0] || 'arbitrum',
        contractCode: contractCode,
        constructorArgs: parsedConstructorArgs,
        functionCalls: functionCalls,
        solidityVersion: '0.8.19'
      });

      if (response.success) {
        setBenchmarkResult(response.data);
        if (response.data.contractAddress) {
          setDeployedContractAddress(response.data.contractAddress);
        }
        setActiveTab('results');
        await loadActiveSessions();
      } else {
        throw new Error(response.message || 'Live benchmark failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsRunning(false);
    }
  };
  
  const cleanupAllSessions = async () => {
    try {
      await liveBenchmarkerApi.cleanupAllBenchmarks();
      await loadActiveSessions();
      setDeployedContractAddress(null);
      setInteractionResults([]);
    } catch (err) {
      console.error('Failed to cleanup all sessions:', err);
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
      const response = await liveBenchmarkerApi.runLiveBenchmark({
        networkName: selectedNetworks[0] || 'arbitrum',
        contractCode: contractCode,
        constructorArgs: [],
        functionCalls: [{ functionName, parameters }],
        solidityVersion: '0.8.19',
        contractAddress: deployedContractAddress
      });

      if (response.success && response.data.functionCosts && response.data.functionCosts.length > 0) {
        const newResult = {
          functionName,
          parameters,
          ...response.data.functionCosts[0],
          timestamp: new Date().toISOString()
        };
        setInteractionResults(prev => [newResult, ...prev]);
      } else {
        throw new Error(response.message || 'Contract interaction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to interact with contract');
    } finally {
      setIsInteracting(false);
    }
  };

  const selectedNetworkInfo = SUPPORTED_NETWORKS.find(n => n.id === selectedNetworks[0]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-lekton">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'editor'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Live Benchmarker (Mainnet Fork)</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              disabled={!benchmarkResult}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Benchmark Results</span>
                {benchmarkResult && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    1
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Top Section: Network & Confidence Selector */}
            <NetworkConfidenceSelector
              selectedNetworks={selectedNetworks}
              onNetworkChange={setSelectedNetworks}
              confidenceLevel={confidenceLevel}
              onConfidenceChange={setConfidenceLevel}
              networks={SUPPORTED_NETWORKS}
              className=""
              showAdvanced={true}
              error={error}
              isAnalyzing={isRunning}
              onAnalyze={runLiveBenchmark}
              isLoadingTemplate={isLoadingTemplate}
            />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              {/* Left Panel: Contract Configuration */}
              <div className="xl:col-span-1 space-y-4">
                {/* Contract Settings */}
                <div className="card card-elevated">
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white font-lekton">Configuration</h3>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-3">
                    {/* Contract Template Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 font-lekton">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        disabled={isLoadingTemplate}
                        className="block w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white font-lekton focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
                      >
                        {CONTRACT_TEMPLATES.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      {isLoadingTemplate && (
                        <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                          <span>Loading...</span>
                        </div>
                      )}
                    </div>

                    {/* Contract Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 font-lekton">
                        Contract Name
                      </label>
                      <input
                        type="text"
                        value={contractName}
                        onChange={(e) => setContractName(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-lekton focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="Enter name"
                      />
                    </div>

                    {/* Constructor Arguments */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 font-lekton">
                        Constructor Args
                      </label>
                      <textarea
                        value={constructorArgs}
                        onChange={(e) => setConstructorArgs(e.target.value)}
                        placeholder='[100] // JSON array'
                        className="w-full h-16 px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                        spellCheck={false}
                      />
                    </div>

                    {/* Save Option */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="saveToDatabase"
                        checked={saveToDatabase}
                        onChange={(e) => setSaveToDatabase(e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                      />
                      <label htmlFor="saveToDatabase" className="text-xs font-medium text-gray-300 font-lekton flex items-center">
                        <Save className="w-3 h-3 mr-1" />
                        Save to DB
                      </label>
                    </div>
                  </div>
                </div>

                {/* Enhanced Function Calls Editor */}
                <div className="card card-elevated">
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white font-lekton">Function Calls</h3>
                      <span className="text-xs text-gray-400">({availableFunctions.length} available)</span>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <FunctionCallsEditor
                      functionCalls={functionCalls}
                      onFunctionCallsChange={setFunctionCalls}
                      availableFunctions={availableFunctions}
                    />
                  </div>
                </div>
              </div>
 
              {/* Right Panel: Contract Editor */}
              <div className="xl:col-span-4">
                <div className="card card-elevated h-full">
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Code className="w-4 h-4 text-blue-400" />
                      <h2 className="text-sm font-semibold text-white font-lekton">Solidity Contract (Mainnet Fork Testing)</h2>
                      <div className="text-xs text-gray-400 ml-auto">
                        {CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <Editor
                        height="500px"
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
                  </div>
                </div>
              </div>
            </div>
 
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={runLiveBenchmark}
                disabled={isRunning || !contractCode.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running Live Benchmark...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Live Benchmark (Fork)
                  </>
                )}
              </Button>
              
              <Button
                 onClick={cleanupAllSessions}
                 disabled={isRunning}
                 variant="outline"
                 className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 <Trash2 className="w-4 h-4" />
                  Cleanup Sessions
               </Button>
            </div>
            
            {/* Status Messages */}
            {error && (
              <Alert className="border-red-500/50 bg-red-900/20">
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            
            {deployedContractAddress && (
              <div className="text-center">
                <Badge variant="outline" className="text-green-400 border-green-500/50 bg-green-900/20 text-xs">
                  Deployed: {deployedContractAddress}
                </Badge>
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            {benchmarkResult ? (
                <LiveBenchmarkResults 
                  result={benchmarkResult} 
                  network={selectedNetworkInfo}
                  interactionResults={interactionResults}
                  contractCode={contractCode}
                  onInteract={interactWithContract}
                  isInteracting={isInteracting}
                />
            ) : (
              <div className="card card-elevated">
                <div className="flex items-center justify-center h-64 text-center text-gray-400 p-6">
                    <div>
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2 text-white">No benchmark results yet</p>
                        <p className="text-sm">Run a live benchmark to see detailed gas cost analysis.</p>
                    </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}