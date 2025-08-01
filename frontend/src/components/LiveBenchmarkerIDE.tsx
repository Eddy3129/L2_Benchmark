'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, Network, Zap, Code, Settings, FileText, Save, Trash2, CheckCircle, ArrowRight } from 'lucide-react';
import LiveBenchmarkResults from '@/components/LiveBenchmarkResults';
import FunctionCallsEditor from '@/components/FunctionCallsEditor';
import { liveBenchmarkerApi } from '@/lib/api';
import { CONTRACT_TEMPLATES, loadContractTemplate, getConstructorArgsByContractName, detectContractName, getConstructorInfoByContractName } from '@/lib/contractTemplate';
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
    type: 'mainnet',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
    type: 'l2',
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
  // Tab management
  const [activeTab, setActiveTab] = useState('setup');
  
  // Network setup state
  const [selectedNetwork, setSelectedNetwork] = useState<string>('arbitrum');
  const [isSettingUpNetwork, setIsSettingUpNetwork] = useState(false);
  const [networkSetupResult, setNetworkSetupResult] = useState<any>(null);
  const [benchmarkId, setBenchmarkId] = useState<string | null>(null);
  
  // Contract deployment state
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(CONTRACT_TEMPLATES[0].id);
  const [constructorArgs, setConstructorArgs] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [compiledContract, setCompiledContract] = useState<any>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  
  // Function execution state
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);

  // Network setup function
  const handleNetworkSetup = async () => {
    setIsSettingUpNetwork(true);
    setError(null);
    // Reset previous states
    setFunctionsExecuted(false);
    setExecutionResults(null);
    setBenchmarkResult(null);
    setDeployedContractAddress(null);
    setDeploymentResult(null);
    try {
      const result = await liveBenchmarkerApi.setupNetwork(selectedNetwork);
      if (!result.success) {
        throw new Error(result.message || 'Network setup failed');
      }
      setNetworkSetupResult(result);
      setBenchmarkId(result.data.benchmarkId);
      setActiveTab('deploy'); // Move to deploy tab after successful setup
    } catch (error) {
      console.error('Network setup failed:', error);
      alert('Failed to setup network fork. Please try again.');
    } finally {
      setIsSettingUpNetwork(false);
    }
  };
  
  // General state
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<LiveBenchmarkSession[]>([]);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<BenchmarkFunction[]>([]);
  
  // Debug: Log when availableFunctions changes
  useEffect(() => {
    console.log('🔧 Available functions updated:', availableFunctions);
    console.log('🔧 Number of available functions:', availableFunctions.length);
    if (availableFunctions.length > 0) {
      console.log('🔧 Function names:', availableFunctions.map(f => f.name));
    }
  }, [availableFunctions]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [functionsExecuted, setFunctionsExecuted] = useState(false);
  
  // Legacy state for compatibility
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['arbitrum']);
  const [confidenceLevel, setConfidenceLevel] = useState(68);
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<LiveBenchmarkResult | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionResults, setInteractionResults] = useState<any[]>([]);

  useEffect(() => {
    console.log('🏁 LiveBenchmarkerIDE component mounted');
    console.log('🏁 Initial contract code length:', contractCode.length);
    console.log('🏁 Initial available functions:', availableFunctions.length);
    
    loadActiveSessions();
    handleTemplateChange(CONTRACT_TEMPLATES[0].id);
  }, []);
  
  // Extract functions when contract code or compiled contract changes
  useEffect(() => {
    if (contractCode && contractCode.trim().length > 0) {
      console.log('🔧 Contract code changed, extracting functions');
      extractFunctionsFromCode();
    }
  }, [contractCode, compiledContract]);
  
  // Remove automatic function extraction - only compile when deploying

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
    try {
      console.log('🔧 extractFunctionsFromCode called');
      console.log('🔧 Contract code length:', contractCode.length);
      console.log('🔧 Compiled contract available:', !!compiledContract);
      console.log('🔧 Deployed contract available:', !!deploymentResult?.contractAddress);
      
      // Use existing compiled contract if available
      if (compiledContract && compiledContract.abi) {
        console.log('🔧 Using existing compiled contract for function extraction');
        console.log('🔧 ABI length:', compiledContract.abi.length);
        const writableFunctions = extractWritableFunctions(compiledContract.abi);
        console.log('🔧 Extracted writable functions:', writableFunctions);
        setAvailableFunctions(writableFunctions);
        return;
      }

      // Don't compile if no contract code
      if (!contractCode || contractCode.trim().length === 0) {
        console.log('🔧 No contract code available, skipping compilation');
        setAvailableFunctions([]);
        return;
      }

      // Otherwise compile the contract
      console.log('🔧 No compiled contract available, compiling...');
      const compilationResult = await liveBenchmarkerApi.compileContract({
        contractCode,
        contractName: contractName || 'Contract'
      });

      if (compilationResult.success && compilationResult.data) {
        console.log('🔧 Compilation successful, extracting functions');
        const writableFunctions = extractWritableFunctions(compilationResult.data.abi);
        setAvailableFunctions(writableFunctions);
        console.log('🔧 Extracted functions after compilation:', writableFunctions);
      } else {
        console.warn('⚠️ Failed to compile contract for function extraction');
        setAvailableFunctions([]);
      }
    } catch (error) {
      console.error('❌ Error extracting functions:', error);
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
    if (!contractCode.trim()) {
      setError('Please enter contract code');
      return;
    }

    if (!benchmarkId) {
      setError('Please setup network fork first');
      return;
    }

    setIsDeploying(true);
    setError(null);
    setDeploymentResult(null);
    setExecutionResults(null);
    setBenchmarkResult(null);
    setInteractionResults([]);
    setDeployedContractAddress(null);
    setCompilationError(null);
    setFunctionsExecuted(false);

    try {
      // Analyze contract code to determine constructor arguments
      let parsedConstructorArgs: any[] = [];
      
      // Enhanced constructor parameter analysis with template support
      const getSmartConstructorArgs = (code: string) => {
        // First, try to detect if this is a known contract template
        const contractName = detectContractName(code);
        if (contractName) {
          const templateArgs = getConstructorArgsByContractName(contractName);
          if (templateArgs.length > 0 || getConstructorInfoByContractName(contractName)) {
            console.log(`🎯 Using template constructor args for ${contractName}:`, templateArgs);
            return templateArgs;
          }
        }
        
        // Fallback to smart analysis for unknown contracts
        const constructorMatch = code.match(/constructor\s*\(([^)]*)\)/);
        if (!constructorMatch || !constructorMatch[1].trim()) {
          return []; // No parameters
        }
        
        const params = constructorMatch[1].split(',').map(p => p.trim()).filter(p => p);
        const defaultValues: any[] = [];
        
        params.forEach(param => {
          const cleanParam = param.replace(/\s+/g, ' ').trim();
          
          if (cleanParam.includes('uint') || cleanParam.includes('int')) {
            // For numeric types, use reasonable defaults
            if (cleanParam.includes('biddingTime') || cleanParam.includes('Time')) {
              defaultValues.push(3600); // 1 hour for time-related params
            } else {
              defaultValues.push(100); // General numeric default
            }
          } else if (cleanParam.includes('address')) {
            // For address types, use a default address
            if (cleanParam.includes('[]')) {
              // Array of addresses (like MultiSigWallet owners)
              defaultValues.push(["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"]);
            } else {
              // Single address
              defaultValues.push("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
            }
          } else if (cleanParam.includes('string')) {
            defaultValues.push("DefaultValue");
          } else if (cleanParam.includes('bool')) {
            defaultValues.push(false);
          } else {
            // Fallback for unknown types
            defaultValues.push(100);
          }
        });
        
        console.log(`🔍 Using smart analysis for unknown contract:`, defaultValues);
        return defaultValues;
      };
      
      if (constructorArgs.trim()) {
          try {
            parsedConstructorArgs = JSON.parse(constructorArgs);
          } catch (e) {
            console.warn('Constructor args parse error, using smart default:', e.message);
            parsedConstructorArgs = getSmartConstructorArgs(contractCode);
          }
        } else {
          // Smart defaults based on template or constructor analysis
          parsedConstructorArgs = getSmartConstructorArgs(contractCode);
        }
      console.log('🚀 Deploying contract with constructor args:', parsedConstructorArgs);

      // Prepare request payload - only include constructorArgs if user explicitly provided them
      const requestPayload: any = {
         benchmarkId,
         contractCode,
         functionCalls: functionCalls.length > 0 ? functionCalls : [],
         contractName: contractName || 'Contract'
      };
      
      // Only include constructorArgs if user explicitly provided them in the input field
      // This allows backend's smart constructor detection to work when field is empty
      if (constructorArgs.trim()) {
        requestPayload.constructorArgs = parsedConstructorArgs;
      }
      
      console.log('🚀 Request payload:', requestPayload);

      // Deploy using live benchmarker (includes compilation)
      const deployResult = await liveBenchmarkerApi.runLiveBenchmark(requestPayload);

      if (!deployResult.success) {
        throw new Error(`Deployment failed: ${deployResult.message}`);
      }
      console.log('🚀 Contract deployed successfully:', deployResult.data);
      console.log('🚀 Full deployment result structure:', JSON.stringify(deployResult.data, null, 2));
      
      // Extract contract address from the deployment result
      let contractAddress = null;
      if (deployResult.data.contractAddress) {
        contractAddress = deployResult.data.contractAddress;
      } else if (deployResult.data.contract?.address) {
        contractAddress = deployResult.data.contract.address;
      } else if (deployResult.data.address) {
        contractAddress = deployResult.data.address;
      }
      
      console.log('🚀 Extracted contract address:', contractAddress);
      
      if (!contractAddress || contractAddress === '') {
        console.error('❌ No contract address found in deployment result');
        throw new Error('Contract deployment failed: No contract address returned');
      }
      
      setDeploymentResult({
        contractAddress: contractAddress,
        deploymentCost: deployResult.data.deploymentCost,
        networkMetrics: deployResult.data.networkMetrics
      });
      setBenchmarkResult(deployResult.data);
      if (contractAddress) {
        setDeployedContractAddress(contractAddress);
      }
      
      // Extract functions from the compiled contract (backend compiles during deployment)
      // We need to compile separately to get the ABI for function extraction
      try {
        const compilationResult = await liveBenchmarkerApi.compileContract({
          contractCode,
          contractName: contractName || 'Contract'
        });
        
        if (compilationResult.success && compilationResult.data?.abi) {
          console.log('🔧 Extracting functions from compiled contract ABI');
          const writableFunctions = extractWritableFunctions(compilationResult.data.abi);
          console.log('🔧 Extracted functions after deployment:', writableFunctions);
          setAvailableFunctions(writableFunctions);
          setCompiledContract(compilationResult.data);
        } else {
          console.warn('⚠️ Could not compile contract for function extraction');
        }
      } catch (compileError) {
        console.warn('⚠️ Function extraction compilation failed:', compileError.message);
      }
      
      setActiveTab('execute');
      await loadActiveSessions();
    } catch (err: any) {
      console.error('Deployment failed:', err);
      if (err.message.includes('compilation')) {
        setCompilationError(err.message);
      } else {
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setIsDeploying(false);
      setIsCompiling(false);
      setIsRunning(false);
    }
  };
  
  const cleanupAllSessions = async () => {
    try {
      await liveBenchmarkerApi.cleanupAllBenchmarks();
      await loadActiveSessions();
      setActiveSessions([]);
      setBenchmarkResult(null);
      setDeploymentResult(null);
      setExecutionResults(null);
      setDeployedContractAddress(null);
      setInteractionResults([]);
      setError(null);
      setActiveTab('deploy'); // Reset to first tab
    } catch (err: any) {
      setError(err.message || 'Failed to cleanup sessions');
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
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border border-gray-700">
            <TabsTrigger 
              value="setup" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all"
            >
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>Setup Network</span>
                {networkSetupResult && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="deploy" 
              disabled={!networkSetupResult}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Deploy Contract</span>
                {deploymentResult && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="execute" 
              disabled={!deploymentResult}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>Execute Functions</span>
                {executionResults && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              disabled={!executionResults}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>View Results</span>
                {executionResults && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Setup Network */}
          <TabsContent value="setup" className="mt-6">
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Network className="w-5 h-5 mr-2 text-blue-400" />
                  Network Fork Setup
                </h3>
                <p className="text-gray-300 mb-6">
                  Select a network and start a local fork for live benchmarking. This creates an isolated environment for testing.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Select Network
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {SUPPORTED_NETWORKS.map((network) => {
                        const IconComponent = network.icon;
                        return (
                          <button
                            key={network.id}
                            onClick={() => setSelectedNetwork(network.id)}
                            disabled={isSettingUpNetwork}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedNetwork === network.id
                                ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`p-2 rounded-lg ${network.color}`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm">{network.name}</div>
                                <div className="text-xs opacity-75">{network.type.toUpperCase()}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 line-clamp-2">
                              {network.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleNetworkSetup}
                    disabled={isSettingUpNetwork}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    {isSettingUpNetwork ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Setting up network fork...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Network className="w-4 h-4 mr-2" />
                        Start Network Fork
                      </div>
                    )}
                  </Button>
                  
                  {networkSetupResult && (
                    <Alert className="bg-green-900/20 border-green-700">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-300">
                        Network fork started successfully! Benchmark ID: {benchmarkId}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Deploy Contract */}
          <TabsContent value="deploy" className="mt-6">
            <div className="space-y-6">
              {!benchmarkId && (
                <Alert className="bg-yellow-900/20 border-yellow-700">
                  <Network className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">
                    Please setup a network fork first in the "Setup Network" tab before deploying contracts.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Deploy Actions */}
              <div className="card card-elevated">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Code className="w-5 h-5 text-blue-400" />
                        <span>Contract Deployment</span>
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Compile and deploy your smart contract</p>
                      {benchmarkId && (
                        <p className="text-xs text-green-400 mt-1">Network fork ready: {benchmarkId}</p>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        onClick={runLiveBenchmark}
                        disabled={isDeploying || !contractCode.trim() || !benchmarkId}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                      >
                        {isDeploying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {isCompiling ? 'Compiling...' : 'Deploying...'}
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Deploy Contract
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={cleanupAllSessions}
                        disabled={isDeploying}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        End Session
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Configuration */}
              <div className="card card-elevated">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Code className="w-5 h-5 text-blue-400" />
                    <span>Contract Configuration</span>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Configure and edit your smart contract</p>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    {/* Contract Template */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        disabled={isLoadingTemplate}
                        className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {CONTRACT_TEMPLATES.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      {isLoadingTemplate && (
                        <div className="text-sm text-gray-500 flex items-center space-x-2 mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span>Loading template...</span>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Contract Editor */}
                  <div className="border border-gray-600 rounded-lg overflow-hidden">
                    <Editor
                      height="400px"
                      defaultLanguage="solidity"
                      value={contractCode}
                      onChange={(value) => setContractCode(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
              </div>



              {/* Status Messages */}
              {error && (
                <Alert className="border-red-500/50 bg-red-900/20">
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}
              
              {deploymentResult && (
                <Alert className="border-green-500/50 bg-green-900/20">
                  <AlertDescription className="text-green-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Contract deployed successfully! Address: {deploymentResult.contractAddress}</span>
                      <Button
                        onClick={() => setActiveTab('execute')}
                        size="sm"
                        className="ml-4 bg-green-600 hover:bg-green-700"
                      >
                        Next: Execute Functions <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Execute Functions */}
          <TabsContent value="execute" className="mt-6">
            <div className="space-y-6">
              <div className="card card-elevated">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Play className="w-5 h-5 text-blue-400" />
                    <span>Function Execution</span>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Configure and execute contract functions for gas analysis</p>
                </div>
                <div className="p-4">
                  <FunctionCallsEditor
                    functionCalls={functionCalls}
                    onFunctionCallsChange={setFunctionCalls}
                    availableFunctions={availableFunctions}
                  />
                  {/* Function availability status */}
                  {availableFunctions.length === 0 && (
                    <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-600 rounded text-sm text-yellow-300">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium">No functions available</span>
                      </div>
                      <p className="mt-1 text-xs text-yellow-400">
                        Please compile your contract first by clicking the "Compile Contract" button above.
                      </p>
                    </div>
                  )}
                  {availableFunctions.length > 0 && (
                    <div className="mt-2 p-2 bg-green-900/20 border border-green-600 rounded text-xs text-green-300">
                      Available Functions: {availableFunctions.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Execute Button */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={async () => {
                    console.log('🚀 Execute button clicked');
                    console.log('🚀 Current function calls:', functionCalls);
                    console.log('🚀 Available functions:', availableFunctions);
                    console.log('🚀 Deployment result:', deploymentResult);
                    
                    if (!deploymentResult?.contractAddress) {
                      console.error('❌ No contract deployed');
                      setError('No contract deployed. Please deploy a contract first.');
                      return;
                    }

                    setIsExecuting(true);
                    setError(null);

                    try {
                      const response = await liveBenchmarkerApi.runLiveBenchmark({
                        networkName: selectedNetwork || 'arbitrum',
                        contractCode: contractCode,
                        constructorArgs: [],
                        functionCalls: functionCalls,
                        solidityVersion: '0.8.19',
                        contractAddress: deploymentResult.contractAddress
                      });

                      if (response.success) {
                        setExecutionResults({
                          functionCosts: response.data.functionCosts,
                          feeComposition: response.data.feeComposition,
                          networkMetrics: response.data.networkMetrics,
                          executionTime: response.data.executionTime
                        });
                        // Update the full benchmark result
                        setBenchmarkResult({
                          ...deploymentResult,
                          ...response.data
                        });
                        setFunctionsExecuted(true);
                        setActiveTab('results');
                      } else {
                        throw new Error(response.message || 'Function execution failed');
                      }
                    } catch (err: any) {
                      setError(err.message || 'Failed to execute functions');
                    } finally {
                      setIsExecuting(false);
                    }
                  }}
                  disabled={isExecuting || functionCalls.length === 0}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Executing Functions...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Execute Functions ({functionCalls.length})
                    </>
                  )}
                </Button>
              </div>

              {functionsExecuted && (
                <Alert className="border-green-500/50 bg-green-900/20">
                  <AlertDescription className="text-green-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Functions executed successfully!</span>
                      <Button
                        onClick={() => setActiveTab('results')}
                        size="sm"
                        className="ml-4 bg-green-600 hover:bg-green-700"
                      >
                        View Results <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: View Results */}
          <TabsContent value="results" className="mt-6">
            <div className="space-y-6">
              {executionResults ? (
                <LiveBenchmarkResults 
                  result={benchmarkResult} 
                  network={SUPPORTED_NETWORKS.find(n => n.id === selectedNetwork)}
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
                      <p className="text-lg font-medium mb-2 text-white">No results yet</p>
                      <p className="text-sm">Execute functions to see detailed gas cost analysis.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}