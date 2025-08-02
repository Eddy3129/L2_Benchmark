import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, Network, Zap, Code, Settings, FileText, Save, Trash2, CheckCircle, ArrowRight, AlertCircle, NetworkIcon, Globe, Layers, Box } from 'lucide-react';
import { liveNetworkForkerApi } from '@/lib/api';
import { CONTRACT_TEMPLATES } from '@/config/contracts';
import { loadContractTemplate } from '@/lib/contractTemplate';
import FunctionCallsEditor from './FunctionCallsEditor';
import LiveNetworkForkResults from './LiveNetworkForkResults';

// Types for better TypeScript support
interface NetworkSetupData {
  benchmarkId: string;
  network: string;
  chainId: number;
  forkPort: number;
  rpcUrl: string;
  isActive: boolean;
}

interface DeploymentCost {
  gasUsed: number;
  gasPrice: string;
  totalCostWei: string;
  totalCostEth: string;
  totalCostUsd: number;
  transactionHash?: string;
}

interface FunctionCost {
  functionName: string;
  gasUsed: number;
  gasPrice: string;
  totalCostWei: string;
  totalCostEth: string;
  totalCostUsd: number;
  transactionHash?: string;
}

interface BenchmarkResult {
  contractAddress: string;
  deploymentCost: DeploymentCost;
  functionCosts: FunctionCost[];
  feeComposition: {
    baseFee: string;
    priorityFee: string;
    maxFeePerGas: string;
    gasPrice: string;
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

interface AvailableFunction {
  name: string;
  inputs: any[];
}

interface ContractBenchmarkSession {
  id: string;
  contractAddress: string;
  contractName?: string;
  deploymentResult: BenchmarkResult;
  executionResult?: BenchmarkResult;
  network: {
    name: string;
    displayName: string;
    chainId: number;
    category: string;
    isLayer2?: boolean;
  };
  timestamp: number;
}

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LiveNetworkForkExample {
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
    chainId: 1,
    color: 'bg-blue-500',
    description: 'Ethereum Mainnet',
    icon: NetworkIcon
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    color: 'bg-cyan-500',
    description: 'Arbitrum One',
    icon: Layers
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    color: 'bg-red-500',
    description: 'Optimism Mainnet',
    icon: Globe
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    color: 'bg-blue-600',
    description: 'Base Mainnet',
    icon: Box
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    color: 'bg-purple-500',
    description: 'Polygon Mainnet',
    icon: Layers
  },
  {
    id: 'zksync-era',
    name: 'zkSync Era',
    chainId: 324,
    color: 'bg-gray-500',
    description: 'zkSync Era Mainnet',
    icon: Box
  },
  {
    id: 'scroll',
    name: 'Scroll',
    chainId: 534352,
    color: 'bg-orange-500',
    description: 'Scroll Mainnet',
    icon: Globe
  },
  {
    id: 'linea',
    name: 'Linea',
    chainId: 59144,
    color: 'bg-green-500',
    description: 'Linea Mainnet',
    icon: NetworkIcon
  },
  {
    id: 'ink',
    name: 'Ink',
    chainId: 57073,
    color: 'bg-indigo-500',
    description: 'Ink Mainnet',
    icon: Layers
  }
];

export default function ImprovedLiveNetworkForkerIDE() {
  // Simplified state management
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('arbitrum');
  const [contractCode, setContractCode] = useState<string>(DEFAULT_CONTRACT);
  const [constructorArgs, setConstructorArgs] = useState<string>('[100]');
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([
    { functionName: 'setValue', parameters: [200] }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState<boolean>(false);
  
  // Status states
  const [networkSetup, setNetworkSetup] = useState<NetworkSetupData | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<BenchmarkResult | null>(null);
  const [executionResults, setExecutionResults] = useState<BenchmarkResult | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<AvailableFunction[]>([]);
  
  // Session management
  const [benchmarkSessions, setBenchmarkSessions] = useState<ContractBenchmarkSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Loading states
  const [isSettingUpNetwork, setIsSettingUpNetwork] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const extractContractName = (code: string): string => {
    const match = code.match(/contract\s+(\w+)/);
    return match ? match[1] : 'Unknown Contract';
  };

  const getNetworkCategory = (networkId: string): string => {
    switch (networkId) {
      case 'mainnet': return 'Layer 1';
      case 'arbitrum': case 'optimism': case 'base': case 'zksync-era': case 'scroll': case 'linea': case 'ink': return 'Layer 2';
      case 'polygon': return 'Sidechain';
      default: return 'Unknown';
    }
  };

  // Removed auto-advance to next tab to prevent unwanted tab switching

  // Function to validate and filter executable functions
  const validateAndFilterFunctions = async (allFunctions: AvailableFunction[], contractAddress: string, parsedConstructorArgs: any[]) => {
    try {
      // Generate default function calls for validation
      const defaultFunctionCalls = getDefaultFunctionCalls(allFunctions, contractCode);
      
      // Call validation API
      const validationResult = await liveNetworkForkerApi.validateFunctions({
        benchmarkId: networkSetup.benchmarkId,
        contractCode,
        constructorArgs: parsedConstructorArgs,
        functionCalls: defaultFunctionCalls,
        solidityVersion: '0.8.19',
        contractAddress
      });
      
      if (validationResult.success) {
        const executableFunctionNames = validationResult.data.executableFunctions.map((f: any) => f.functionName);
        
        // Filter available functions to only include executable ones
        const executableFunctions = allFunctions.filter(func => 
          executableFunctionNames.includes(func.name)
        );
        
        setAvailableFunctions(executableFunctions);
        
        // Set function calls to only executable ones
        const executableFunctionCalls = defaultFunctionCalls.filter(fc => 
          executableFunctionNames.includes(fc.functionName)
        );
        setFunctionCalls(executableFunctionCalls);
        
        // Log validation results
        console.log(`✅ Function validation: ${executableFunctions.length}/${allFunctions.length} functions are executable`);
        if (executableFunctions.length < allFunctions.length) {
          const nonExecutable = allFunctions.filter(func => !executableFunctionNames.includes(func.name));
          console.log(`❌ Non-executable functions: ${nonExecutable.map(f => f.name).join(', ')}`);
        }
      } else {
        // Fallback: use all functions if validation fails
        console.warn('Function validation failed, using all functions');
        setAvailableFunctions(allFunctions);
        setFunctionCalls(getDefaultFunctionCalls(allFunctions, contractCode));
      }
    } catch (error) {
      console.error('Function validation error:', error);
      // Fallback: use all functions if validation fails
      setAvailableFunctions(allFunctions);
      setFunctionCalls(getDefaultFunctionCalls(allFunctions, contractCode));
    }
  };

  // Helper function to get default function calls based on contract type
  const getDefaultFunctionCalls = (availableFunctions: AvailableFunction[], contractCode: string): FunctionCall[] => {
    const functionNames = availableFunctions.map(f => f.name);
    
    // Detect contract type based on available functions and code
    const isERC20 = functionNames.includes('transfer') && functionNames.includes('approve');
    const isERC721 = functionNames.includes('mint') && (contractCode.includes('ERC721') || contractCode.includes('NFT'));
    const isMultiSig = functionNames.includes('submitTransaction') && functionNames.includes('confirmTransaction');
    const isStaking = functionNames.includes('stake') && functionNames.includes('unstake');
    
    const defaults: FunctionCall[] = [];
    
    if (isERC721) {
      // NFT contract defaults
      if (functionNames.includes('mint')) {
        const mintFunc = availableFunctions.find(f => f.name === 'mint');
        if (mintFunc) {
          if (mintFunc.inputs.length === 1 && mintFunc.inputs[0].type === 'uint256') {
            // mint(quantity)
            defaults.push({ functionName: 'mint', parameters: [2] });
          } else if (mintFunc.inputs.length === 2) {
            // mint(to, quantity) or similar
            defaults.push({ functionName: 'mint', parameters: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1] });
          }
        }
      }
      if (functionNames.includes('setMintPrice')) {
        defaults.push({ functionName: 'setMintPrice', parameters: ['10000000000000000'] }); // 0.01 ETH in wei
      }
    } else if (isERC20) {
      // ERC20 contract defaults
      if (functionNames.includes('transfer')) {
        defaults.push({ functionName: 'transfer', parameters: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1000] });
      }
      if (functionNames.includes('approve')) {
        defaults.push({ functionName: 'approve', parameters: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 5000] });
      }
    } else if (isMultiSig) {
      // MultiSig defaults - use smaller value and ensure proper parameters
      if (functionNames.includes('submitTransaction')) {
        defaults.push({ functionName: 'submitTransaction', parameters: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1000000000000000, '0x'] }); // 0.001 ETH instead of 1 ETH
      }
      if (functionNames.includes('confirmTransaction')) {
        defaults.push({ functionName: 'confirmTransaction', parameters: [0] }); // Confirm first transaction
      }
    } else if (isStaking) {
      // Staking defaults
      if (functionNames.includes('stake')) {
        defaults.push({ functionName: 'stake', parameters: [1000] });
      }
    } else {
      // Generic contract - try common functions
      if (functionNames.includes('setValue')) {
        defaults.push({ functionName: 'setValue', parameters: [200] });
      }
      if (functionNames.includes('deposit')) {
        defaults.push({ functionName: 'deposit', parameters: [] });
      }
      if (functionNames.includes('transfer')) {
        defaults.push({ functionName: 'transfer', parameters: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 100] });
      }
    }
    
    // If no defaults found, add the first available function with empty parameters
    if (defaults.length === 0 && availableFunctions.length > 0) {
      const firstFunc = availableFunctions[0];
      const defaultParams = firstFunc.inputs.map(input => {
        if (input.type.includes('uint')) return 100;
        if (input.type === 'address') return '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        if (input.type === 'string') return 'test';
        if (input.type === 'bool') return true;
        return '';
      });
      defaults.push({ functionName: firstFunc.name, parameters: defaultParams });
    }
    
    return defaults;
  };

  // Prevent mouse wheel from switching tabs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      if (target.closest('[role="tablist"]')) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const handleTemplateChange = async (templateId: string) => {
    if (templateId === selectedTemplate) return;
    
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    setIsLoadingTemplate(true);
    try {
      const contractCode = await loadContractTemplate(template.fileName);
      if (contractCode) {
        setContractCode(contractCode);
        setSelectedTemplate(templateId);
        
        // Set appropriate constructor arguments based on template
        if (templateId === 'multisig-wallet') {
          setConstructorArgs('[["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"], 2]');
        } else if (templateId === 'simple-staking') {
          setConstructorArgs('["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"]');
        } else if (templateId === 'simple-auction') {
          setConstructorArgs('[3600, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"]');
        } else {
          setConstructorArgs('[]'); // Most ERC20/ERC721 don't need constructor args
        }
        
        // Reset function calls and available functions when template changes
        setFunctionCalls([]);
        setAvailableFunctions([]);
        // Clear previous deployment and execution results
        setDeploymentResult(null);
        setExecutionResults(null);
      }
    } catch (err: any) {
      setError(`Failed to load template: ${err.message}`);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleNetworkSetup = async () => {
    setIsSettingUpNetwork(true);
    setError(null);
    
    try {
      console.log('Calling backend for network setup with network:', selectedNetwork);
      const result = await liveNetworkForkerApi.setupNetwork(selectedNetwork);
      console.log('Backend network setup response:', result);
      if (result.success) {
        setNetworkSetup(result.data);
        // Clear previous results when setting up new network
        setDeploymentResult(null);
        setExecutionResults(null);
      } else {
        throw new Error(result.message || 'Network setup failed');
      }
    } catch (err: any) {
      setError(`Network setup failed: ${err.message}`);
    } finally {
      setIsSettingUpNetwork(false);
    }
  };

  const handleContractDeployment = async () => {
    if (!networkSetup) {
      setError('Please setup network first');
      return;
    }

    setIsDeploying(true);
    setError(null);
    
    try {
      // Parse constructor args safely
      let parsedArgs: any[] = [];
      if (constructorArgs.trim()) {
        try {
          // If it's not wrapped in brackets, try to parse as a single value
          const trimmed = constructorArgs.trim();
          if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
            // Try to parse as a single number or string
            const singleValue = isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
            parsedArgs = [singleValue];
          } else {
            parsedArgs = JSON.parse(constructorArgs);
          }
        } catch (e) {
          // Fallback to smart parsing
          parsedArgs = [100]; // Default for this example
        }
      }

      const payload = {
        benchmarkId: networkSetup.benchmarkId,
        contractCode,
        constructorArgs: parsedArgs,
        functionCalls: [], // Deploy only, no function calls yet
        solidityVersion: '0.8.19'
      };

      console.log('Calling backend for deployment with payload:', payload);
      const result = await liveNetworkForkerApi.runLiveNetworkFork(payload);
      console.log('Backend deployment response:', result);
      
      if (result.success) {
        setDeploymentResult(result.data);
        
        // Create a new benchmark session
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const networkInfo = SUPPORTED_NETWORKS.find(n => n.id === selectedNetwork);
        
        const newSession: ContractBenchmarkSession = {
          id: sessionId,
          contractAddress: result.data.contractAddress,
          contractName: extractContractName(contractCode),
          deploymentResult: result.data,
          network: {
            name: selectedNetwork,
            displayName: networkInfo?.name || selectedNetwork,
            chainId: networkInfo?.chainId || 0,
            category: getNetworkCategory(selectedNetwork),
            isLayer2: selectedNetwork !== 'mainnet'
          },
          timestamp: Date.now()
        };
        
        setBenchmarkSessions(prev => [...prev, newSession]);
        setCurrentSessionId(sessionId);
        
        // Extract functions from the deployed contract's ABI
        if (result.data.contract?.abi) {
          const writableFunctions = result.data.contract.abi
            .filter((item: any) => item.type === 'function' && 
                          (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable'))
            .map((func: any) => ({
              name: func.name,
              inputs: func.inputs || []
            }));
          
          // Validate which functions are executable
          await validateAndFilterFunctions(writableFunctions, result.data.contractAddress, parsedArgs);
        }
      } else {
        throw new Error(result.message || 'Deployment failed');
      }
    } catch (err: any) {
      setError(`Deployment failed: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFunctionExecution = async () => {
    if (!deploymentResult) {
      setError('Please deploy contract first');
      return;
    }

    setIsExecuting(true);
    setError(null);
    
    try {
      const payload = {
        benchmarkId: networkSetup.benchmarkId,
        contractCode,
        constructorArgs: JSON.parse(constructorArgs || '[]'),
        functionCalls: functionCalls.filter(fc => fc.functionName && fc.parameters),
        solidityVersion: '0.8.19'
      };

      console.log('Calling backend for function execution with payload:', payload);
      const result = await liveNetworkForkerApi.runLiveNetworkFork(payload);
      console.log('Backend function execution response:', result);
      
      if (result.success) {
        setExecutionResults(result.data);
        
        // Update the current session with execution results
        if (currentSessionId) {
          setBenchmarkSessions(prev => prev.map(session => 
            session.id === currentSessionId 
              ? { ...session, executionResult: result.data }
              : session
          ));
        }
      } else {
        throw new Error(result.message || 'Function execution failed');
      }
    } catch (err: any) {
      setError(`Function execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const clearAllSessions = () => {
    setBenchmarkSessions([]);
    setCurrentSessionId(null);
  };

  const resetSession = async () => {
    try {
      await liveNetworkForkerApi.cleanupAllBenchmarks();
      setNetworkSetup(null);
      setDeploymentResult(null);
      setBenchmarkSessions([]);
      setCurrentSessionId(null);
      setExecutionResults(null);
      setAvailableFunctions([]);
      setError(null);
      setActiveTab('setup');
    } catch (err: any) {
      setError('Failed to cleanup session');
    }
  };

  const addFunctionCall = () => {
    setFunctionCalls([...functionCalls, { functionName: '', parameters: [] }]);
  };

  const updateFunctionCall = (index: number, field: keyof FunctionCall, value: any) => {
    const updated = [...functionCalls];
    updated[index][field] = value;
    setFunctionCalls(updated);
  };

  const removeFunctionCall = (index: number) => {
    setFunctionCalls(functionCalls.filter((_, i) => i !== index));
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'setup': return networkSetup ? 'completed' : 'pending';
      case 'deploy': return deploymentResult ? 'completed' : networkSetup ? 'pending' : 'disabled';
      case 'execute': return executionResults ? 'completed' : deploymentResult ? 'pending' : 'disabled';
      case 'results': return executionResults ? 'completed' : 'disabled';
      default: return 'disabled';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Live Network Forker IDE</h1>
          <p className="text-gray-400">Deploy and benchmark smart contracts on mainnet forks</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border border-gray-700 mb-6 h-14">
            {[
              { id: 'setup', label: 'Setup Network', icon: Network },
              { id: 'deploy', label: 'Deploy Contract', icon: Code },
              { id: 'execute', label: 'Execute Functions', icon: Play },
              { id: 'results', label: 'View Results', icon: Zap }
            ].map(tab => {
              const status = getTabStatus(tab.id);
              const IconComponent = tab.icon;
              
              return (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  disabled={status === 'disabled'}
                  className={`
                    flex items-center gap-2 p-3 h-12 transition-all
                    ${status === 'completed' ? 'text-green-400' : ''}
                    ${status === 'disabled' ? 'opacity-50' : ''}
                    data-[state=active]:bg-blue-600 data-[state=active]:text-white
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                  {status === 'completed' && <CheckCircle className="w-4 h-4" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Global Error Display */}
          {error && (
            <Alert className="mb-6 border-red-500/50 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {/* Setup Network Tab */}
          <TabsContent value="setup" className="space-y-6">

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-400" />
                Network Fork Setup
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 mb-6">
                {SUPPORTED_NETWORKS.map(network => {
                  const IconComponent = network.icon;
                  return (
                    <button
                      key={network.id}
                      onClick={() => setSelectedNetwork(network.id)}
                      disabled={isSettingUpNetwork}
                      className={`
                        p-2 rounded-lg border-2 transition-all text-center hover:scale-105 min-w-0
                        ${selectedNetwork === network.id 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }
                        disabled:opacity-50
                      `}
                    >
                      <div className={`w-6 h-6 rounded mb-1 mx-auto ${network.color} flex items-center justify-center`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <div className="font-semibold text-xs truncate">{network.name}</div>
                      <div className="text-xs text-gray-400 truncate">{network.description}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleNetworkSetup}
                  disabled={isSettingUpNetwork}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                >
                  {isSettingUpNetwork ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Start Network Fork
                    </>
                  )}
                </Button>

                {networkSetup && (
                  <Button onClick={resetSession} variant="outline" className="border-gray-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset Session
                  </Button>
                )}
              </div>

              {networkSetup && (
                <Alert className="mt-4 border-green-500/50 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    Network fork ready! RPC: {networkSetup.rpcUrl}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Deploy Contract Tab */}
          <TabsContent value="deploy" className="space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                Contract Deployment
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Contract Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={isLoadingTemplate || isDeploying}
                    className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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

                <div>
                  <label className="block text-sm font-medium mb-2">Constructor Arguments (JSON)</label>
                  <input
                    type="text"
                    value={constructorArgs}
                    onChange={(e) => setConstructorArgs(e.target.value)}
                    placeholder='[100]'
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    disabled={isDeploying}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contract Code</label>
                  <textarea
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                    disabled={isDeploying}
                  />
                </div>

                <Button
                  onClick={handleContractDeployment}
                  disabled={isDeploying || !networkSetup}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2"
                >
                  {isDeploying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Deploy Contract
                    </>
                  )}
                </Button>

                {deploymentResult && (
                  <Alert className="border-green-500/50 bg-green-900/20">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                      Contract deployed successfully! Address: {deploymentResult.contractAddress}
                      <br />
                      Gas used: {deploymentResult.deploymentCost.gasUsed.toLocaleString()}
                      <br />
                      Cost: ${deploymentResult.deploymentCost.totalCostUsd.toFixed(4)} USD
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Execute Functions Tab */}
          <TabsContent value="execute" className="space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Function Execution
              </h3>

              {availableFunctions.length > 0 && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-300 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Contract deployed! {availableFunctions.length} functions available.</span>
                    {functionCalls.length > 0 && (
                      <span className="text-blue-400">({functionCalls.length} function calls ready)</span>
                    )}
                  </div>
                </div>
              )}
              
              <FunctionCallsEditor
                functionCalls={functionCalls}
                onFunctionCallsChange={setFunctionCalls}
                availableFunctions={availableFunctions}
                className="mb-6"
              />

              <div className="flex gap-4">
                <Button
                  onClick={handleFunctionExecution}
                  disabled={isExecuting || !deploymentResult || functionCalls.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-2"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Functions ({functionCalls.length})
                    </>
                  )}
                </Button>
              </div>

              {executionResults && (
                <Alert className="border-green-500/50 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    Functions executed successfully!
                    <br />
                    Total function calls: {executionResults.functionCosts?.length || 0}
                    <br />
                    Average gas per call: {executionResults.functionCosts?.length > 0 
                      ? Math.round(executionResults.functionCosts.reduce((sum: number, fc: any) => sum + fc.gasUsed, 0) / executionResults.functionCosts.length).toLocaleString()
                      : 'N/A'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {benchmarkSessions.length > 0 ? (
              <LiveNetworkForkResults 
                sessions={benchmarkSessions}
                onClearSessions={clearAllSessions}
              />
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  Network Fork Results
                </h3>
                <Alert className="border-yellow-500/50 bg-yellow-900/20">
                  <AlertDescription className="text-yellow-300">
                    No network fork sessions available. Please deploy and execute contracts first.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}