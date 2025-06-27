"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES, BASIC_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { parseEther, formatEther, parseGwei, Address, Abi } from 'viem';
import { apiService } from '@/lib/api';

// --- Helper Types ---
interface TransactionLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'pending' | 'confirmed' | 'failed';
  hash?: `0x${string}`;
  message: string;
}

interface SessionStat {
  action: string;
  gasUsed: bigint;
  fee: bigint;
  confirmationTime: number; // in ms
}

interface BenchmarkStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  func: () => void;
}

// --- Main Component ---
export function PoolInterface() {
  // --- Wagmi Hooks & Core State ---
  const { isConnected, address } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  
  // --- Local UI State ---
  const [isMounted, setIsMounted] = useState(false);
  const [transactionLog, setTransactionLog] = useState<TransactionLog[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
  const [activeTab, setActiveTab] = useState<'setup' | 'liquidity' | 'swap' | 'benchmark'>('setup');
  
  // --- Transaction State Management ---
  const [latestTx, setLatestTx] = useState<{ hash?: `0x${string}`; startTime: number; action: string } | null>(null);
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash: latestTx?.hash });
  const isMining = isConfirming || isPending;

  // --- Form Input State ---
  const [liquidityAmountA, setLiquidityAmountA] = useState('100');
  const [liquidityAmountB, setLiquidityAmountB] = useState('100');
  const [swapAmount, setSwapAmount] = useState('10');
  const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
  
  // --- Enhanced Benchmark State ---
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [benchmarkSteps, setBenchmarkSteps] = useState<BenchmarkStep[]>([]);

  // Initialize benchmark steps
  useEffect(() => {
    const steps: BenchmarkStep[] = [
      {
        id: 'mint-a',
        name: 'Mint Token A',
        description: 'Mint 10,000 Token A to wallet',
        status: 'pending',
        func: () => handleTransaction('Mint 10,000 TokenA', { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'mint', args: [address, parseEther('10000')] })
      },
      {
        id: 'mint-b',
        name: 'Mint Token B',
        description: 'Mint 10,000 Token B to wallet',
        status: 'pending',
        func: () => handleTransaction('Mint 10,000 TokenB', { address: CONTRACT_ADDRESSES.TOKEN_B, abi: ERC20_ABI, functionName: 'mint', args: [address, parseEther('10000')] })
      },
      {
        id: 'approve-a-liquidity',
        name: 'Approve Token A',
        description: 'Approve Token A for liquidity operations',
        status: 'pending',
        func: () => handleTransaction('Approve TokenA for Liquidity', { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('1000')] })
      },
      {
        id: 'approve-b-liquidity',
        name: 'Approve Token B',
        description: 'Approve Token B for liquidity operations',
        status: 'pending',
        func: () => handleTransaction('Approve TokenB for Liquidity', { address: CONTRACT_ADDRESSES.TOKEN_B, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('1000')] })
      },
      {
        id: 'add-liquidity',
        name: 'Add Liquidity',
        description: 'Add 1000 tokens of each to the pool',
        status: 'pending',
        func: () => handleTransaction('Add Liquidity', { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'addLiquidity', args: [parseEther('1000'), parseEther('1000')] })
      },
      {
        id: 'approve-a-swap',
        name: 'Approve for Swap',
        description: 'Approve Token A for swap operations',
        status: 'pending',
        func: () => handleTransaction('Approve TokenA for Swap', { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('100')] })
      },
      {
        id: 'swap',
        name: 'Execute Swap',
        description: 'Swap 100 Token A for Token B',
        status: 'pending',
        func: () => handleTransaction('Swap A->B', { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'swapAForB', args: [parseEther('100'), 0] })
      },
      {
        id: 'remove-liquidity',
        name: 'Remove Liquidity',
        description: 'Remove all liquidity from the pool',
        status: 'pending',
        func: () => handleTransaction('Remove Liquidity', { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'removeLiquidity' })
      }
    ];
    setBenchmarkSteps(steps);
  }, [address]);

  // --- Data Fetching Hooks ---
  const useTokenData = (tokenAddress?: Address, tokenAbi?: Abi) => {
    const commonProps = { address: tokenAddress, abi: tokenAbi, query: { enabled: !!tokenAddress && !!isConnected }};
    return {
      balance: useReadContract({ ...commonProps, functionName: 'balanceOf', args: address ? [address] : undefined }),
      allowance: useReadContract({ ...commonProps, functionName: 'allowance', args: address ? [address, CONTRACT_ADDRESSES.BASIC_POOL] : undefined }),
    };
  };
  const tokenAData = useTokenData(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI);
  const tokenBData = useTokenData(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI);
  
  const { data: reservoirA, refetch: refetchReservoirA } = useReadContract({ address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'reservoirA' });
  const { data: reservoirB, refetch: refetchReservoirB } = useReadContract({ address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'reservoirB' });
  const { data: userLiquidity, refetch: refetchUserLiquidity } = useReadContract({ address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'liquidityProvided', args: address ? [address] : undefined });

  const refetchAllData = useCallback(() => {
    tokenAData.balance.refetch();
    tokenAData.allowance.refetch();
    tokenBData.balance.refetch();
    tokenBData.allowance.refetch();
    refetchReservoirA();
    refetchReservoirB();
    refetchUserLiquidity();
  }, [tokenAData, tokenBData, refetchReservoirA, refetchReservoirB, refetchUserLiquidity]);

  // --- Transaction Execution & Logging Logic ---
  const handleTransaction = useCallback((action: string, config: any) => {
    if (!address) {
        alert("Please connect your wallet first.");
        return;
    }
    
    setLatestTx(null);
    
    const logId = `${action}-${Date.now()}`;
    setLatestTx({ action, startTime: Date.now() });
    setTransactionLog(prev => [{ id: logId, timestamp: new Date().toISOString(), action, status: 'pending', message: `⏳ ${action}: Waiting for wallet confirmation...` }, ...prev]);
    
    const eip1559Config = {
      ...config,
      gas: 300000n,
      maxFeePerGas: parseGwei('30'),
      maxPriorityFeePerGas: parseGwei('2'),
    };
    
    try {
      writeContract(eip1559Config);
    } catch (e: any) {
      const errorMessage = e.shortMessage || e.message;
      setTransactionLog(prev => prev.map(log => log.id === logId ? { ...log, status: 'failed', message: `❌ ${action} failed: ${errorMessage}` } : log));
      setLatestTx(null);
      setIsRunningBenchmark(false);
      // Update benchmark step status on failure
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'failed' } : step
        ));
      }
    }
  }, [writeContract, address, isRunningBenchmark, currentStepIndex]);

  const resetTransactionState = useCallback(() => {
    setLatestTx(null);
    setIsRunningBenchmark(false);
    setCurrentStepIndex(-1);
    setBenchmarkSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
  }, []);

  // Handle transaction hash when it's available
  useEffect(() => {
    if (hash && latestTx) {
      setLatestTx(prev => ({ ...prev!, hash }));
      setTransactionLog(prev => prev.map(log => 
        log.action === latestTx.action && log.status === 'pending' 
          ? { ...log, hash, message: `⏳ ${latestTx.action}: Transaction submitted. Confirming...` } 
          : log
      ));
      // Update benchmark step to running
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'running' } : step
        ));
      }
    }
  }, [hash, latestTx, isRunningBenchmark, currentStepIndex]);

  // Handle transaction errors
  useEffect(() => {
    if (error && latestTx) {
      const errorMessage = error.message;
      setTransactionLog(prev => prev.map(log => 
        log.action === latestTx.action && log.status === 'pending'
          ? { ...log, status: 'failed', message: `❌ ${latestTx.action} failed: ${errorMessage}` } 
          : log
      ));
      setLatestTx(null);
      setIsRunningBenchmark(false);
      // Update benchmark step status on failure
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'failed' } : step
        ));
      }
    }
  }, [error, latestTx, isRunningBenchmark, currentStepIndex]);
  
  useEffect(() => {
    if (!latestTx) return;

    if (isConfirmed && receipt) {
      const confirmationTime = Date.now() - latestTx.startTime;
      const fee = receipt.gasUsed * receipt.effectiveGasPrice;
      
      setTransactionLog(prev => prev.map(log => log.hash === latestTx.hash ? { ...log, status: 'confirmed', message: `✅ ${latestTx.action} confirmed in ${confirmationTime}ms. Fee: ${formatEther(fee)} ETH` } : log));
      setSessionStats(prev => [...prev, { action: latestTx.action, gasUsed: receipt.gasUsed, fee, confirmationTime }]);
      
      // Update benchmark step to completed
      if (isRunningBenchmark && currentStepIndex >= 0) {
        setBenchmarkSteps(prev => prev.map((step, idx) => 
          idx === currentStepIndex ? { ...step, status: 'completed' } : step
        ));
      }
      
      setTimeout(refetchAllData, 1000);
      setLatestTx(null);
    } else if (isTxError && txError) {
        const errorMessage = txError;
        setTransactionLog(prev => prev.map(log => log.hash === latestTx.hash ? { ...log, status: 'failed', message: `❌ ${latestTx.action} failed: ${errorMessage}` } : log));
        setLatestTx(null);
        setIsRunningBenchmark(false);
        // Update benchmark step status on failure
        if (isRunningBenchmark && currentStepIndex >= 0) {
          setBenchmarkSteps(prev => prev.map((step, idx) => 
            idx === currentStepIndex ? { ...step, status: 'failed' } : step
          ));
        }
    }
  }, [isConfirmed, isTxError, receipt, txError, latestTx, refetchAllData, isRunningBenchmark, currentStepIndex]);

  // --- UI State & Computations ---
  const needsApproval = (balance: bigint | undefined, allowance: bigint | undefined, amount: string): boolean => {
    if (!address || !amount) return false;
    try {
      const amountBigInt = parseEther(amount);
      if (amountBigInt === 0n) return false;
      return !!(balance && balance >= amountBigInt && (!allowance || allowance < amountBigInt));
    } catch {
        return false;
    }
  };
  
  const needsApprovalA = needsApproval(tokenAData.balance.data, tokenAData.allowance.data, liquidityAmountA);
  const needsApprovalB = needsApproval(tokenBData.balance.data, tokenBData.allowance.data, liquidityAmountB);
  const swapTokenAddress = swapDirection === 'AtoB' ? CONTRACT_ADDRESSES.TOKEN_A : CONTRACT_ADDRESSES.TOKEN_B;
  const swapTokenAllowance = swapDirection === 'AtoB' ? tokenAData.allowance.data : tokenBData.allowance.data;
  const swapTokenBalance = swapDirection === 'AtoB' ? tokenAData.balance.data : tokenBData.balance.data;
  const needsSwapApproval = needsApproval(swapTokenBalance, swapTokenAllowance, swapAmount);
  
  const canAddLiquidity = !needsApprovalA && !needsApprovalB && !!liquidityAmountA && !!liquidityAmountB;
  const canSwap = !needsSwapApproval && !!swapAmount;
  const canRemoveLiquidity = userLiquidity != null && userLiquidity > 0n;

  const getSwapOutput = () => {
    if (!swapAmount || !reservoirA || !reservoirB || reservoirA === 0n || reservoirB === 0n) return '0';
    try {
      const amountIn = parseEther(swapAmount);
      const reserveIn = swapDirection === 'AtoB' ? reservoirA : reservoirB;
      const reserveOut = swapDirection === 'AtoB' ? reservoirB : reservoirA;
      const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
      return formatEther(amountOut);
    } catch (e) { return '0'; }
  };
  
  // --- Action Handlers ---
  const handleMint = (tokenAddress: Address, tokenAbi: Abi, tokenName: string) => 
    handleTransaction(`Mint 10,000 ${tokenName}`, { 
      address: tokenAddress, 
      abi: tokenAbi, 
      functionName: 'mint', 
      args: [address, parseEther('10000')]
    });
  
  const handleApprove = (tokenAddress: Address, tokenAbi: Abi, tokenName: string, amount: string) => {
    if (!amount) return;
    handleTransaction(`Approve ${tokenName}`, { 
      address: tokenAddress, 
      abi: tokenAbi, 
      functionName: 'approve', 
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(amount)]
    });
  };
  
  const handleAddLiquidity = () => {
    if (!liquidityAmountA || !liquidityAmountB) return;
    handleTransaction('Add Liquidity', { 
      address: CONTRACT_ADDRESSES.BASIC_POOL, 
      abi: BASIC_POOL_ABI, 
      functionName: 'addLiquidity', 
      args: [parseEther(liquidityAmountA), parseEther(liquidityAmountB)]
    });
  };
  
  const handleSwap = () => {
    if (!swapAmount) return;
    const functionName = swapDirection === 'AtoB' ? 'swapAForB' : 'swapBForA';
    handleTransaction(`Swap ${swapDirection === 'AtoB' ? 'A→B' : 'B→A'}`, { 
      address: CONTRACT_ADDRESSES.BASIC_POOL, 
      abi: BASIC_POOL_ABI, 
      functionName, 
      args: [parseEther(swapAmount), 0]
    });
  };
  
  const handleRemoveLiquidity = () => {
    if (!userLiquidity || userLiquidity === 0n) return;
    handleTransaction('Remove Liquidity', { 
      address: CONTRACT_ADDRESSES.BASIC_POOL, 
      abi: BASIC_POOL_ABI, 
      functionName: 'removeLiquidity'
    });
  };

  // Save benchmark results to backend
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

  // --- Enhanced Benchmark Runner Logic ---
  const runFullBenchmark = async () => {
    setIsRunningBenchmark(true);
    setSessionStats([]);
    setCurrentStepIndex(0);
    
    // Reset all steps to pending
    setBenchmarkSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    
    for (let i = 0; i < benchmarkSteps.length; i++) {
      setCurrentStepIndex(i);
      const step = benchmarkSteps[i];
      
      try {
        await step.func();
        
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
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        console.error(`Error during step ${step.name}:`, e);
        setIsRunningBenchmark(false);
        return;
      }
    }
    
    setIsRunningBenchmark(false);
    setCurrentStepIndex(-1);
  };
  
  // Hydration fix
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'setup', label: 'Setup', icon: '🔧', description: 'Get test tokens' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧', description: 'Add/Remove liquidity' },
    { id: 'swap', label: 'Swap', icon: '🔄', description: 'Token swapping' },
    { id: 'benchmark', label: 'Benchmark', icon: '⚡', description: 'Automated testing' },
  ];

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
    size = 'md',
    loading = false,
    icon,
    className = ''
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    className?: string;
  }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-500',
      secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-gray-500',
      success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500',
      warning: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 border-yellow-500',
      danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-red-500'
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    
    return (
      <button 
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          ${variants[variant]} ${sizes[size]} 
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
        {icon && !loading && <span>{icon}</span>}
        <span>{loading ? 'Processing...' : children}</span>
      </button>
    );
  };

  const ProgressBar = ({ steps, currentStep }: { steps: BenchmarkStep[], currentStep: number }) => {
    const progress = currentStep >= 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Progress</span>
          <span>{currentStep >= 0 ? `${currentStep + 1}/${steps.length}` : `0/${steps.length}`}</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Step indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isRunning = step.status === 'running';
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${
                    isCompleted 
                      ? 'bg-green-500 border-green-400 text-white' 
                      : isFailed 
                      ? 'bg-red-500 border-red-400 text-white'
                      : isRunning
                      ? 'bg-blue-500 border-blue-400 text-white animate-pulse'
                      : isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400'
                  }
                `}>
                  {isCompleted ? '✓' : isFailed ? '✗' : isRunning ? '⟳' : index + 1}
                </div>
                <div className={`
                  text-xs mt-1 text-center max-w-16 leading-tight
                  ${
                    isCompleted 
                      ? 'text-green-400' 
                      : isFailed 
                      ? 'text-red-400'
                      : isActive 
                      ? 'text-blue-400' 
                      : 'text-gray-500'
                  }
                `}>
                  {step.name}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current step description */}
        {currentStep >= 0 && currentStep < steps.length && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">{steps[currentStep].name}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{steps[currentStep].description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-4">
        {isConnected && address ? (
          <div className="space-y-4">
            {/* Account Overview - Compact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CompactCard title="Account Overview">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ETH:</span>
                      <span className="text-white font-mono">{ethBalance?.formatted ? parseFloat(ethBalance.formatted).toFixed(4) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Token A:</span>
                      <span className="text-green-400 font-mono">{tokenAData.balance.data != null ? parseFloat(formatEther(tokenAData.balance.data)).toFixed(2) : '0'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Token B:</span>
                      <span className="text-purple-400 font-mono">{tokenBData.balance.data != null ? parseFloat(formatEther(tokenBData.balance.data)).toFixed(2) : '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">LP Tokens:</span>
                      <span className="text-yellow-400 font-mono">{userLiquidity != null ? parseFloat(formatEther(userLiquidity)).toFixed(2) : '0'}</span>
                    </div>
                  </div>
                </div>
              </CompactCard>
              
              <CompactCard title="Pool Status">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve A:</span>
                    <span className="text-green-400 font-mono">{reservoirA != null ? parseFloat(formatEther(reservoirA)).toFixed(2) : '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve B:</span>
                    <span className="text-purple-400 font-mono">{reservoirB != null ? parseFloat(formatEther(reservoirB)).toFixed(2) : '0'}</span>
                  </div>
                </div>
              </CompactCard>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-800/30 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              {activeTab === 'setup' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Setup Test Tokens</h3>
                    <p className="text-sm text-gray-400">Mint test tokens to your wallet before proceeding</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CompactCard title="Token A" className="border-green-500/20">
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-green-500/10 rounded-lg">
                          <div className="text-2xl font-bold text-green-400">
                            {tokenAData.balance.data != null ? parseFloat(formatEther(tokenAData.balance.data)).toFixed(0) : '0'}
                          </div>
                          <div className="text-xs text-gray-400">Current Balance</div>
                        </div>
                        <EnhancedButton
                          onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'TokenA')}
                          disabled={isMining}
                          loading={isMining && latestTx?.action.includes('TokenA')}
                          variant="success"
                          icon="🪙"
                        >
                          Mint 10,000 Token A
                        </EnhancedButton>
                      </div>
                    </CompactCard>
                    
                    <CompactCard title="Token B" className="border-purple-500/20">
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                          <div className="text-2xl font-bold text-purple-400">
                            {tokenBData.balance.data != null ? parseFloat(formatEther(tokenBData.balance.data)).toFixed(0) : '0'}
                          </div>
                          <div className="text-xs text-gray-400">Current Balance</div>
                        </div>
                        <EnhancedButton
                          onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'TokenB')}
                          disabled={isMining}
                          loading={isMining && latestTx?.action.includes('TokenB')}
                          variant="success"
                          icon="🪙"
                        >
                          Mint 10,000 Token B
                        </EnhancedButton>
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'liquidity' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Liquidity Management</h3>
                    <p className="text-sm text-gray-400">Add or remove liquidity from the pool</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CompactCard title="Add Liquidity">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Token A Amount</label>
                            <input
                              type="number"
                              value={liquidityAmountA}
                              onChange={(e) => setLiquidityAmountA(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                              placeholder="100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Token B Amount</label>
                            <input
                              type="number"
                              value={liquidityAmountB}
                              onChange={(e) => setLiquidityAmountB(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                              placeholder="100"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {needsApprovalA && (
                            <EnhancedButton
                              onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'TokenA', liquidityAmountA)}
                              disabled={isMining}
                              loading={isMining && latestTx?.action.includes('Approve TokenA')}
                              variant="warning"
                              icon="✓"
                            >
                              Approve Token A
                            </EnhancedButton>
                          )}
                          
                          {needsApprovalB && (
                            <EnhancedButton
                              onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'TokenB', liquidityAmountB)}
                              disabled={isMining}
                              loading={isMining && latestTx?.action.includes('Approve TokenB')}
                              variant="warning"
                              icon="✓"
                            >
                              Approve Token B
                            </EnhancedButton>
                          )}
                          
                          <EnhancedButton
                            onClick={handleAddLiquidity}
                            disabled={!canAddLiquidity || isMining}
                            loading={isMining && latestTx?.action.includes('Add Liquidity')}
                            variant="primary"
                            icon="💧"
                          >
                            Add Liquidity
                          </EnhancedButton>
                        </div>
                      </div>
                    </CompactCard>
                    
                    <CompactCard title="Remove Liquidity">
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-400">
                            {userLiquidity != null ? parseFloat(formatEther(userLiquidity)).toFixed(2) : '0'}
                          </div>
                          <div className="text-xs text-gray-400">Your LP Tokens</div>
                        </div>
                        
                        <EnhancedButton
                          onClick={handleRemoveLiquidity}
                          disabled={!canRemoveLiquidity || isMining}
                          loading={isMining && latestTx?.action.includes('Remove Liquidity')}
                          variant="danger"
                          icon="🗑️"
                        >
                          Remove All Liquidity
                        </EnhancedButton>
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'swap' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Token Swap</h3>
                    <p className="text-sm text-gray-400">Exchange tokens through the liquidity pool</p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <CompactCard title="Swap Tokens">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSwapDirection('AtoB')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              swapDirection === 'AtoB' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            A → B
                          </button>
                          <button
                            onClick={() => setSwapDirection('BtoA')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              swapDirection === 'BtoA' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            B → A
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            {swapDirection === 'AtoB' ? 'Token A' : 'Token B'} Amount
                          </label>
                          <input
                            type="number"
                            value={swapAmount}
                            onChange={(e) => setSwapAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            placeholder="10"
                          />
                        </div>
                        
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">You will receive approximately:</div>
                          <div className="text-lg font-bold text-white">
                            {parseFloat(getSwapOutput()).toFixed(4)} {swapDirection === 'AtoB' ? 'Token B' : 'Token A'}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {needsSwapApproval && (
                            <EnhancedButton
                              onClick={() => handleApprove(
                                swapTokenAddress, 
                                ERC20_ABI, 
                                swapDirection === 'AtoB' ? 'TokenA' : 'TokenB', 
                                swapAmount
                              )}
                              disabled={isMining}
                              loading={isMining && latestTx?.action.includes('Approve')}
                              variant="warning"
                              icon="✓"
                            >
                              Approve {swapDirection === 'AtoB' ? 'Token A' : 'Token B'}
                            </EnhancedButton>
                          )}
                          
                          <EnhancedButton
                            onClick={handleSwap}
                            disabled={!canSwap || isMining}
                            loading={isMining && latestTx?.action.includes('Swap')}
                            variant="primary"
                            icon="🔄"
                          >
                            Swap {swapDirection === 'AtoB' ? 'A → B' : 'B → A'}
                          </EnhancedButton>
                        </div>
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'benchmark' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Automated Benchmark Testing</h3>
                    <p className="text-sm text-gray-400">Run comprehensive tests to measure gas usage and performance</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CompactCard title="Benchmark Progress">
                      <ProgressBar steps={benchmarkSteps} currentStep={currentStepIndex} />
                    </CompactCard>
                    
                    <CompactCard title="Benchmark Controls">
                      <div className="space-y-4">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-white mb-2">Test Sequence</h4>
                          <ul className="text-xs text-gray-400 space-y-1">
                            <li>• Mint test tokens</li>
                            <li>• Approve token spending</li>
                            <li>• Add liquidity to pool</li>
                            <li>• Execute token swap</li>
                            <li>• Remove liquidity</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-3">
                          <EnhancedButton
                            onClick={runFullBenchmark}
                            disabled={isRunningBenchmark || isMining}
                            loading={isRunningBenchmark}
                            variant="primary"
                            size="sm"
                            icon="⚡"
                          >
                            Start Full Benchmark
                          </EnhancedButton>
                          
                          <EnhancedButton
                            onClick={saveBenchmarkResults}
                            disabled={sessionStats.length === 0 || isRunningBenchmark}
                            variant="success"
                            icon="💾"
                          >
                            Save Results to Database
                          </EnhancedButton>
                          
                          <EnhancedButton
                            onClick={resetTransactionState}
                            disabled={isRunningBenchmark}
                            variant="secondary"
                            icon="🔄"
                          >
                            Reset Benchmark
                          </EnhancedButton>
                        </div>
                      </div>
                    </CompactCard>
                  </div>
                  
                  {/* Session Statistics */}
                  {sessionStats.length > 0 && (
                    <CompactCard title="Session Statistics">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <div className="text-lg font-bold text-blue-400">{sessionStats.length}</div>
                          <div className="text-xs text-gray-400">Transactions</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-400">
                            {Math.round(Number(sessionStats.reduce((sum, stat) => sum + stat.gasUsed, 0n)) / sessionStats.length).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Avg Gas</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <div className="text-lg font-bold text-yellow-400">
                            {Math.round(sessionStats.reduce((sum, stat) => sum + stat.confirmationTime, 0) / sessionStats.length)}ms
                          </div>
                          <div className="text-xs text-gray-400">Avg Time</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-400">
                            {formatEther(sessionStats.reduce((sum, stat) => sum + stat.fee, 0n))}
                          </div>
                          <div className="text-xs text-gray-400">Total Fees (ETH)</div>
                        </div>
                      </div>
                    </CompactCard>
                  )}
                </div>
              )}
            </div>

            {/* Transaction Log */}
            {transactionLog.length > 0 && (
              <CompactCard title="Transaction Log">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactionLog.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded text-xs">
                      <span className="flex-1">{log.message}</span>
                      <span className="text-gray-400 ml-2">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CompactCard>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to interact with the pool interface.</p>
          </div>
        )}
      </div>
    </div>
  );
}