"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseGwei, Address, Abi, isAddress } from 'viem';
import { apiService } from '@/lib/api';
import { NETWORK_CONFIGS } from '@/utils/networkConfig';
import { AbiService, ContractInfo } from '@/lib/abiService';

// --- Types ---
interface ContractConfig {
  address: Address;
  abi: Abi;
  chainId: number;
  name: string;
}

interface BenchmarkFunction {
  name: string;
  inputs: any[];
  stateMutability: string;
  type: string;
}

interface TransactionLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'pending' | 'confirmed' | 'failed';
  hash?: `0x${string}`;
  message: string;
  gasUsed?: bigint;
  fee?: bigint;
  confirmationTime?: number;
}

interface SessionStat {
  action: string;
  gasUsed: bigint;
  fee: bigint;
  confirmationTime: number;
}

interface BenchmarkStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  functionName: string;
  args: any[];
}

// --- Main Component ---
export function TestnetBenchmark() {
  // --- Client-side mounting state to prevent hydration issues ---
  const [isMounted, setIsMounted] = useState(false);
  
  // --- Wagmi Hooks & Core State ---
  const { isConnected, address, chain } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  
  // --- Handle client-side mounting ---
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // --- Contract Configuration State ---
  const [contractAddress, setContractAddress] = useState<string>('');
  const [selectedChainId, setSelectedChainId] = useState<number>(421614); // Default to Arbitrum Sepolia
  const [contractAbi, setContractAbi] = useState<Abi | null>(null);
  const [contractName, setContractName] = useState<string>('');
  const [isLoadingAbi, setIsLoadingAbi] = useState(false);
  const [abiError, setAbiError] = useState<string>('');
  
  // --- Benchmark State ---
  const [availableFunctions, setAvailableFunctions] = useState<BenchmarkFunction[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [functionArgs, setFunctionArgs] = useState<Record<string, any[]>>({});
  const [benchmarkSteps, setBenchmarkSteps] = useState<BenchmarkStep[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  
  // --- Transaction State ---
  const [transactionLog, setTransactionLog] = useState<TransactionLog[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
  const [latestTx, setLatestTx] = useState<{ hash?: `0x${string}`; startTime: number; action: string } | null>(null);
  
  // --- Transaction Receipt Handling ---
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash: latestTx?.hash });
  const isMining = isConfirming || isPending;

  // --- ABI Fetching Logic ---
  const fetchContractAbi = async (address: string, chainId: number) => {
    console.log('Fetching ABI for:', { address, chainId });
    
    if (!AbiService.isValidAddress(address)) {
      setAbiError('Invalid contract address');
      console.error('Invalid address format:', address);
      return;
    }

    if (!AbiService.isChainSupported(chainId)) {
      setAbiError(`Block explorer not supported for chain ID: ${chainId}. Supported chains: ${AbiService.getSupportedChains().join(', ')}`);
      console.error('Unsupported chain:', chainId);
      return;
    }

    setIsLoadingAbi(true);
    setAbiError('');
    
    try {
      console.log('Calling AbiService.fetchContractAbi...');
      const contractInfo: ContractInfo = await AbiService.fetchContractAbi(address, chainId);
      console.log('Contract info received:', contractInfo);
      
      setContractAbi(contractInfo.abi);
      setAvailableFunctions(contractInfo.writableFunctions);
      setContractName(contractInfo.name);
      
      // Initialize default arguments for all functions
      const defaultArgs: Record<string, any[]> = {};
      contractInfo.writableFunctions.forEach(func => {
        defaultArgs[func.name] = AbiService.generateDefaultArgs(func.inputs);
      });
      setFunctionArgs(defaultArgs);
      
      console.log('ABI loaded successfully:', {
        name: contractInfo.name,
        writableFunctions: contractInfo.writableFunctions.length,
        readableFunctions: contractInfo.readableFunctions.length
      });
      
    } catch (error: any) {
      console.error('Error fetching ABI:', error);
      setAbiError(error.message || 'Failed to fetch contract ABI');
      setContractAbi(null);
      setAvailableFunctions([]);
      setContractName('');
    } finally {
      setIsLoadingAbi(false);
    }
  };

  // --- Transaction Execution Logic ---
  const handleTransaction = useCallback((action: string, functionName: string, args: any[]) => {
    if (!address || !contractAbi || !contractAddress) {
      alert('Please connect wallet and configure contract first.');
      return;
    }
    
    if (chain?.id !== selectedChainId) {
      alert(`Please switch to the correct network (Chain ID: ${selectedChainId})`);
      return;
    }
    
    setLatestTx(null);
    
    const logId = `${action}-${Date.now()}`;
    setLatestTx({ action, startTime: Date.now() });
    setTransactionLog(prev => [{ 
      id: logId, 
      timestamp: new Date().toISOString(), 
      action, 
      status: 'pending', 
      message: `⏳ ${action}: Waiting for wallet confirmation...` 
    }, ...prev]);
    
    const config = {
      address: contractAddress as Address,
      abi: contractAbi,
      functionName,
      args,
      gas: 500000n,
      maxFeePerGas: parseGwei('50'),
      maxPriorityFeePerGas: parseGwei('2'),
    };
    
    try {
      writeContract(config);
    } catch (e: any) {
      const errorMessage = e.shortMessage || e.message;
      setTransactionLog(prev => prev.map(log => 
        log.id === logId ? { ...log, status: 'failed', message: `❌ ${action} failed: ${errorMessage}` } : log
      ));
      setLatestTx(null);
      setIsRunningBenchmark(false);
    }
  }, [writeContract, address, contractAbi, contractAddress, chain, selectedChainId]);

  // --- Transaction Receipt Effects ---
  useEffect(() => {
    if (hash && latestTx) {
      setLatestTx(prev => ({ ...prev!, hash }));
      setTransactionLog(prev => prev.map(log => 
        log.action === latestTx.action && log.status === 'pending' 
          ? { ...log, hash, message: `⏳ ${latestTx.action}: Transaction submitted. Confirming...` } 
          : log
      ));
      
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'running' } : step
        ));
      }
    }
  }, [hash, latestTx, isRunningBenchmark, currentStepIndex]);

  useEffect(() => {
    if (!latestTx) return;

    if (isConfirmed && receipt) {
      const confirmationTime = Date.now() - latestTx.startTime;
      const fee = receipt.gasUsed * receipt.effectiveGasPrice;
      
      setTransactionLog(prev => prev.map(log => 
        log.hash === latestTx.hash ? { 
          ...log, 
          status: 'confirmed', 
          message: `✅ ${latestTx.action} confirmed in ${confirmationTime}ms. Fee: ${formatEther(fee)} ETH`,
          gasUsed: receipt.gasUsed,
          fee,
          confirmationTime
        } : log
      ));
      
      setSessionStats(prev => [...prev, { 
        action: latestTx.action, 
        gasUsed: receipt.gasUsed, 
        fee, 
        confirmationTime 
      }]);
      
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'completed' } : step
        ));
      }
      
      setLatestTx(null);
    } else if (isTxError && txError) {
      const errorMessage = txError.message || 'Transaction failed';
      setTransactionLog(prev => prev.map(log => 
        log.hash === latestTx.hash ? { 
          ...log, 
          status: 'failed', 
          message: `❌ ${latestTx.action} failed: ${errorMessage}` 
        } : log
      ));
      setLatestTx(null);
      setIsRunningBenchmark(false);
    }
  }, [isConfirmed, isTxError, receipt, txError, latestTx, isRunningBenchmark, currentStepIndex]);

  // --- Benchmark Configuration ---
  const generateBenchmarkSteps = () => {
    const steps: BenchmarkStep[] = selectedFunctions.map((functionSignature, index) => {
      // Extract function name from signature (e.g., "safeTransferFrom(address,address,uint256)" -> "safeTransferFrom")
      const funcName = functionSignature.split('(')[0];
      const func = availableFunctions.find(f => {
        const signature = `${f.name}(${f.inputs.map(input => input.type).join(', ')})`;
        return signature === functionSignature;
      });
      const args = functionArgs[functionSignature] || [];
      
      return {
        id: `${functionSignature}-${index}`,
        name: funcName,
        description: `Execute ${functionSignature}`,
        status: 'pending' as const,
        functionName: funcName,
        args
      };
    });
    
    setBenchmarkSteps(steps);
  };

  // --- Benchmark Execution ---
  const runBenchmark = async () => {
    if (selectedFunctions.length === 0) {
      alert('Please select at least one function to benchmark');
      return;
    }
    
    generateBenchmarkSteps();
    setIsRunningBenchmark(true);
    setSessionStats([]);
    setCurrentStepIndex(0);
    
    for (let i = 0; i < selectedFunctions.length; i++) {
      setCurrentStepIndex(i);
      const functionSignature = selectedFunctions[i];
      // Extract function name from signature
      const functionName = functionSignature.split('(')[0];
      const func = availableFunctions.find(f => {
        const signature = `${f.name}(${f.inputs.map(input => input.type).join(', ')})`;
        return signature === functionSignature;
      });
      
      if (!func) continue;
      
      // Use user-provided arguments or generate defaults
      const userArgs = functionArgs[functionSignature];
      const args = userArgs && userArgs.length > 0 
        ? userArgs.map((arg: string, index: number) => {
            const inputType = func.inputs[index]?.type;
            if (!inputType) return arg;
            
            // Convert string inputs to appropriate types
            if (inputType.includes('uint') || inputType.includes('int')) {
              return arg === '' ? '0' : arg;
            } else if (inputType === 'bool') {
              return arg.toLowerCase() === 'true';
            } else if (inputType === 'address') {
              return arg || '0x0000000000000000000000000000000000000000';
            }
            return arg;
          })
        : AbiService.generateDefaultArgs(func.inputs);
      
      try {
        handleTransaction(functionSignature, functionName, args);
        
        // Wait for transaction to complete
        await new Promise(resolve => {
          const interval = setInterval(() => {
            if (!isMining) { 
              clearInterval(interval); 
              resolve(true); 
            }
          }, 500);
        });
        
        // Small delay between steps
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Error during step ${functionSignature}:`, e);
        setIsRunningBenchmark(false);
        return;
      }
    }
    
    setIsRunningBenchmark(false);
    setCurrentStepIndex(-1);
  };

  // --- Save Results ---
  const saveBenchmarkResults = async () => {
    if (sessionStats.length === 0) {
      alert('No benchmark data to save. Run a benchmark first.');
      return;
    }
    
    try {
      const totalGas = sessionStats.reduce((sum, stat) => sum + stat.gasUsed, 0n);
      const totalTime = sessionStats.reduce((sum, stat) => sum + stat.confirmationTime, 0);
      
      const benchmarkData = {
        results: {
          contract: {
            address: contractAddress,
            name: contractName,
            chainId: selectedChainId
          },
          transactions: {
            totalTransactions: sessionStats.length,
            successfulTransactions: sessionStats.length,
            failedTransactions: 0,
            totalGasUsed: totalGas.toString(),
            totalFees: sessionStats.reduce((sum, stat) => sum + stat.fee, 0n).toString()
          }
        },
        totalOperations: sessionStats.length,
        avgGasUsed: Number(totalGas) / sessionStats.length,
        avgExecutionTime: totalTime / sessionStats.length / 1000
      };
  
      await apiService.createBenchmarkSession(benchmarkData);
      alert('Benchmark results saved successfully!');
    } catch (error) {
      console.error('Failed to save benchmark results:', error);
      alert('Failed to save benchmark results. Check console for details.');
    }
  };

  // --- UI Components ---
  const CompactCard = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  );

  const EnhancedButton = ({ 
    onClick, 
    disabled, 
    children, 
    variant = 'primary', 
    loading = false,
    className = ''
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    loading?: boolean;
    className?: string;
  }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-500',
      secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-gray-500',
      success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500',
      warning: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 border-yellow-500',
      danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-red-500'
    };
    
    return (
      <button 
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          ${variants[variant]} px-4 py-2.5 text-sm
          disabled:opacity-50 disabled:cursor-not-allowed 
          text-white font-medium rounded-lg border 
          transition-all duration-200 transform 
          hover:scale-105 active:scale-95 
          shadow-lg hover:shadow-xl 
          flex items-center justify-center space-x-2 
          w-full
          ${className}
        `}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span>{loading ? 'Processing...' : children}</span>
      </button>
    );
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-4">
        {isConnected && address ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Testnet Contract Benchmarker
              </h1>
              <p className="text-gray-400">Benchmark any deployed contract on supported testnets</p>
            </div>

            {/* Contract Configuration */}
            <CompactCard title="Contract Configuration">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 text-xs text-gray-400">
                    <p>💡 <strong>Tip:</strong> Use a verified contract address for testing:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>Sepolia:</strong> 0x779877A7B0D9E8603169DdbD7836e478b4624789 (LINK Token)</li>
                      <li><strong>Arbitrum Sepolia:</strong> 0x10025Ae0c53473E68Ff7DaeD5236436CaE604e56 (Your MyNFT)</li>
                      <li><strong>Base Sepolia:</strong> 0x036CbD53842c5426634e7929541eC2318f3dCF7e (USDC)</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                  <select
                    value={selectedChainId}
                    onChange={(e) => setSelectedChainId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.values(NETWORK_CONFIGS).map((network) => (
                      <option key={network.chainId} value={network.chainId}>
                        {network.name} (Chain ID: {network.chainId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <EnhancedButton
                  onClick={() => fetchContractAbi(contractAddress, selectedChainId)}
                  disabled={!contractAddress || !isAddress(contractAddress) || isLoadingAbi}
                  loading={isLoadingAbi}
                >
                  Load Contract ABI
                </EnhancedButton>
              </div>
              
              {abiError && (
                <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{abiError}</p>
                </div>
              )}
            </CompactCard>

            {/* Function Selection */}
            {availableFunctions.length > 0 && (
              <CompactCard title="Function Selection & Arguments">
                <div className="space-y-4">
                  {availableFunctions.map((func, index) => {
                    // Create unique key combining function name and signature to handle overloaded functions
                    const uniqueKey = `${func.name}_${func.inputs.map(input => input.type).join('_')}_${index}`;
                    const functionSignature = `${func.name}(${func.inputs.map(input => input.type).join(', ')})`;
                    
                    return (
                    <div key={uniqueKey} className="border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          id={uniqueKey}
                          checked={selectedFunctions.includes(functionSignature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFunctions(prev => [...prev, functionSignature]);
                            } else {
                              setSelectedFunctions(prev => prev.filter(f => f !== functionSignature));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={uniqueKey} className="text-sm text-gray-300">
                          <span className="font-medium">{func.name}</span>
                          <span className="text-gray-500 ml-2">({func.inputs.map(input => `${input.type} ${input.name}`).join(', ')})</span>
                        </label>
                      </div>
                      
                      {/* Function Arguments */}
                      {selectedFunctions.includes(functionSignature) && func.inputs.length > 0 && (
                        <div className="ml-7 space-y-2">
                          <div className="text-xs text-gray-400 mb-2">Function Arguments:</div>
                          {func.inputs.map((input: any, inputIndex: number) => (
                            <div key={inputIndex} className="flex items-center space-x-2">
                              <label className="text-xs text-gray-400 w-20 truncate" title={input.name}>
                                {input.name}:
                              </label>
                              <input
                                type="text"
                                placeholder={`${input.type} value`}
                                value={functionArgs[functionSignature]?.[inputIndex] || ''}
                                onChange={(e) => {
                                  setFunctionArgs(prev => {
                                    const newArgs = { ...prev };
                                    if (!newArgs[functionSignature]) {
                                      newArgs[functionSignature] = AbiService.generateDefaultArgs(func.inputs);
                                    }
                                    newArgs[functionSignature][inputIndex] = e.target.value;
                                    return newArgs;
                                  });
                                }}
                                className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-500 w-16 truncate" title={input.type}>
                                {input.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </CompactCard>
            )}

            {/* Benchmark Controls */}
            {selectedFunctions.length > 0 && (
              <CompactCard title="Benchmark Controls">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EnhancedButton
                    onClick={runBenchmark}
                    disabled={isRunningBenchmark || selectedFunctions.length === 0}
                    loading={isRunningBenchmark}
                    variant="success"
                  >
                    Run Benchmark
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={saveBenchmarkResults}
                    disabled={sessionStats.length === 0}
                    variant="primary"
                  >
                    Save Results
                  </EnhancedButton>
                </div>
              </CompactCard>
            )}

            {/* Transaction Log */}
            {transactionLog.length > 0 && (
              <CompactCard title="Transaction Log">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactionLog.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-2 bg-gray-700/50 rounded text-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300">{log.message}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.hash && (
                        <div className="text-xs text-blue-400 mt-1 font-mono">
                          {log.hash}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CompactCard>
            )}

            {/* Session Stats */}
            {sessionStats.length > 0 && (
              <CompactCard title="Session Statistics">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{sessionStats.length}</div>
                    <div className="text-xs text-gray-400">Transactions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {sessionStats.reduce((sum, stat) => sum + Number(stat.gasUsed), 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Total Gas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {formatEther(sessionStats.reduce((sum, stat) => sum + stat.fee, 0n))}
                    </div>
                    <div className="text-xs text-gray-400">Total Fees (ETH)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {(sessionStats.reduce((sum, stat) => sum + stat.confirmationTime, 0) / sessionStats.length / 1000).toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-400">Avg Time</div>
                  </div>
                </div>
              </CompactCard>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-400 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-500">Please connect your wallet to start benchmarking contracts</p>
          </div>
        )}
      </div>
    </div>
  );
}