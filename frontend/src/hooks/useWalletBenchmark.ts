import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { apiService, WalletBenchmarkData } from '../lib/apiService';

interface BenchmarkContract {
  networkId: string;
  address: string;
  name: string;
  abi: any[];
}

interface BenchmarkProgress {
  stage: 'idle' | 'connecting' | 'switching' | 'executing' | 'analyzing' | 'complete';
  progress: number;
  message: string;
  currentNetwork?: string;
  currentFunction?: string;
}

interface WalletBenchmarkResult {
  id: string;
  contractName: string;
  networks: string[];
  results: any;
  timestamp: string;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  walletAddress: string;
  signedTransactions: number;
}

const PROGRESS_STAGES = {
  idle: { message: 'Ready to benchmark', progress: 0 },
  connecting: { message: 'Connecting wallet...', progress: 10 },
  switching: { message: 'Switching networks...', progress: 25 },
  executing: { message: 'Executing transactions...', progress: 50 },
  analyzing: { message: 'Analyzing results...', progress: 75 },
  complete: { message: 'Benchmark complete', progress: 100 }
};

export function useWalletBenchmark() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  
  const [progress, setProgress] = useState<BenchmarkProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to benchmark'
  });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WalletBenchmarkResult | null>(null);

  const updateProgress = useCallback((stage: BenchmarkProgress['stage'], currentNetwork?: string, currentFunction?: string) => {
    const stageInfo = PROGRESS_STAGES[stage];
    setProgress({ 
      stage, 
      ...stageInfo,
      currentNetwork,
      currentFunction
    });
  }, []);

  const executeBenchmark = useCallback(async (
    contracts: BenchmarkContract[],
    functions: string[] = ['transfer', 'approve', 'balanceOf']
  ) => {
    if (!isConnected || !address || !walletClient) {
      throw new Error('Please connect your wallet first');
    }

    if (contracts.length === 0) {
      throw new Error('Please add at least one contract to benchmark');
    }

    setError(null);
    setResult(null);
    setIsRunning(true);
    updateProgress('connecting');

    try {
      // Prepare benchmark data with wallet integration
      const benchmarkData = {
        contractName: contracts[0].name || 'Multi-Contract Benchmark',
        networks: contracts.map(c => c.networkId),
        contracts: contracts.map(contract => ({
          networkId: contract.networkId,
          address: contract.address,
          name: contract.name,
          abi: contract.abi
        })),
        functions,
        walletAddress: address,
        useWalletSigning: true,
        timestamp: new Date().toISOString()
      };

      updateProgress('executing');
      
      // Execute benchmark with wallet signing
      const savedSession = await apiService.createWalletBenchmarkSession(benchmarkData);
      
      updateProgress('analyzing');
      
      // Process results
      const benchmarkResult: WalletBenchmarkResult = {
        id: savedSession.id,
        contractName: savedSession.results?.contractName || benchmarkData.contractName,
        networks: savedSession.results?.networks || contracts.map(c => c.networkId),
        results: savedSession.results || {
          contracts: [],
          executionSummary: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            successRate: 0
          }
        },
        timestamp: savedSession.results?.timestamp || new Date().toISOString(),
        totalOperations: savedSession.totalOperations || 0,
        avgGasUsed: savedSession.avgGasUsed || 0,
        avgExecutionTime: savedSession.avgExecutionTime || 0,
        walletAddress: address,
        signedTransactions: savedSession.signedTransactions || 0
      };
      
      setResult(benchmarkResult);
      updateProgress('complete');
      
      setTimeout(() => {
        updateProgress('idle');
        setIsRunning(false);
      }, 2000);
      
      return benchmarkResult;
      
    } catch (err: any) {
      console.error('Wallet benchmark error:', err);
      setError(err.message || 'Benchmark failed. Please try again.');
      updateProgress('idle');
      setIsRunning(false);
      throw err;
    }
  }, [isConnected, address, walletClient, updateProgress]);

  const switchToNetwork = useCallback(async (chainId: number) => {
    if (!switchChain) {
      throw new Error('Network switching not supported');
    }
    
    updateProgress('switching');
    await switchChain({ chainId });
  }, [switchChain, updateProgress]);

  const reset = useCallback(() => {
    setProgress({
      stage: 'idle',
      progress: 0,
      message: 'Ready to benchmark'
    });
    setIsRunning(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    // State
    isConnected,
    address,
    progress,
    isRunning,
    error,
    result,
    
    // Actions
    executeBenchmark,
    switchToNetwork,
    reset
  };
}