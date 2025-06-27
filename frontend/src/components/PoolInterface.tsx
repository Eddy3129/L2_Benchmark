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
  
  // --- Benchmark Runner State ---
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkStep, setBenchmarkStep] = useState('');

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
    }
  }, [writeContract, address]);

  const resetTransactionState = useCallback(() => {
    setLatestTx(null);
    setIsRunningBenchmark(false);
    setBenchmarkStep('');
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
    }
  }, [hash, latestTx]);

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
    }
  }, [error, latestTx]);
  
  useEffect(() => {
    if (!latestTx) return;

    if (isConfirmed && receipt) {
      const confirmationTime = Date.now() - latestTx.startTime;
      const fee = receipt.gasUsed * receipt.effectiveGasPrice;
      
      setTransactionLog(prev => prev.map(log => log.hash === latestTx.hash ? { ...log, status: 'confirmed', message: `✅ ${latestTx.action} confirmed in ${confirmationTime}ms. Fee: ${formatEther(fee)} ETH` } : log));
      setSessionStats(prev => [...prev, { action: latestTx.action, gasUsed: receipt.gasUsed, fee, confirmationTime }]);
      
      setTimeout(refetchAllData, 1000);
      setLatestTx(null);
    } else if (isTxError && txError) {
        const errorMessage = txError;
        setTransactionLog(prev => prev.map(log => log.hash === latestTx.hash ? { ...log, status: 'failed', message: `❌ ${latestTx.action} failed: ${errorMessage}` } : log));
        setLatestTx(null);
        setIsRunningBenchmark(false);
    }
  }, [isConfirmed, isTxError, receipt, txError, latestTx, refetchAllData]);

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

  // --- Benchmark Runner Logic ---
  const runFullBenchmark = async () => {
    setIsRunningBenchmark(true);
    setSessionStats([]);
    
    const steps = [
        { name: 'Mint 10,000 TokenA', func: () => handleTransaction(`Mint 10,000 TokenA`, { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'mint', args: [address, parseEther('10000')] })},
        { name: `Mint 10,000 TokenB`, func: () => handleTransaction(`Mint 10,000 TokenB`, { address: CONTRACT_ADDRESSES.TOKEN_B, abi: ERC20_ABI, functionName: 'mint', args: [address, parseEther('10000')] })},
        { name: `Approve TokenA for Liquidity`, func: () => handleTransaction(`Approve TokenA for Liquidity`, { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('1000')] })},
        { name: `Approve TokenB for Liquidity`, func: () => handleTransaction(`Approve TokenB for Liquidity`, { address: CONTRACT_ADDRESSES.TOKEN_B, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('1000')] })},
        { name: `Add Liquidity`, func: () => handleTransaction('Add Liquidity', { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'addLiquidity', args: [parseEther('1000'), parseEther('1000')] })},
        { name: `Approve TokenA for Swap`, func: () => handleTransaction(`Approve TokenA for Swap`, { address: CONTRACT_ADDRESSES.TOKEN_A, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther('100')] })},
        { name:`Swap A for B`, func: () => handleTransaction(`Swap A->B`, { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'swapAForB', args: [parseEther('100'), 0] })},
        { name: `Remove Liquidity`, func: () => handleTransaction('Remove Liquidity', { address: CONTRACT_ADDRESSES.BASIC_POOL, abi: BASIC_POOL_ABI, functionName: 'removeLiquidity' }) },
    ];

    for (const step of steps) {
      setBenchmarkStep(`Executing: ${step.name}`);
      try {
        await step.func();
        await new Promise(resolve => {
          const interval = setInterval(() => {
            if (!isMining) { clearInterval(interval); resolve(true); }
          }, 500);
        });
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        setBenchmarkStep(`Error during: ${step.name}. Stopping benchmark.`);
        setIsRunningBenchmark(false);
        return;
      }
    }
    
    setBenchmarkStep('Benchmark Complete!');
    setTimeout(() => setBenchmarkStep(''), 5000);
    setIsRunningBenchmark(false);
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

  const CompactButton = ({ onClick, disabled, children, variant = 'primary', size = 'sm' }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning';
    size?: 'xs' | 'sm';
  }) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700',
      secondary: 'bg-gray-600 hover:bg-gray-700',
      success: 'bg-green-600 hover:bg-green-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700'
    };
    const sizes = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-2 text-sm'
    };
    
    return (
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`${variants[variant]} ${sizes[size]} disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors w-full`}
      >
        {disabled && isMining ? 'Processing...' : children}
      </button>
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
                <div className="grid grid-cols-2 gap-3 text-xs">
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
                <div className="grid grid-cols-2 gap-3 text-xs">
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
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
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
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
              {activeTab === 'setup' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Step 1: Setup Test Tokens</h3>
                    <p className="text-xs text-gray-400">Mint test tokens to your wallet before proceeding</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CompactCard title="Token A">
                      <CompactButton 
                        onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'Token A')} 
                        disabled={isMining}
                        variant="success"
                      >
                        Mint 10,000 Token A
                      </CompactButton>
                    </CompactCard>
                    <CompactCard title="Token B">
                      <CompactButton 
                        onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'Token B')} 
                        disabled={isMining}
                        variant="success"
                      >
                        Mint 10,000 Token B
                      </CompactButton>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'liquidity' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Step 2: Liquidity Management</h3>
                    <p className="text-xs text-gray-400">Add or remove liquidity from the pool</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CompactCard title="Add Liquidity">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number" 
                            placeholder="Token A" 
                            value={liquidityAmountA} 
                            onChange={e => setLiquidityAmountA(e.target.value)} 
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input 
                            type="number" 
                            placeholder="Token B" 
                            value={liquidityAmountB} 
                            onChange={e => setLiquidityAmountB(e.target.value)} 
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        {needsApprovalA && (
                          <CompactButton 
                            onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'Token A', liquidityAmountA)} 
                            disabled={isMining}
                            variant="warning"
                            size="xs"
                          >
                            Approve Token A
                          </CompactButton>
                        )}
                        {needsApprovalB && (
                          <CompactButton 
                            onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'Token B', liquidityAmountB)} 
                            disabled={isMining}
                            variant="warning"
                            size="xs"
                          >
                            Approve Token B
                          </CompactButton>
                        )}
                        <CompactButton 
                          onClick={handleAddLiquidity} 
                          disabled={!canAddLiquidity || isMining}
                          variant="primary"
                        >
                          Add Liquidity
                        </CompactButton>
                      </div>
                    </CompactCard>
                    
                    <CompactCard title="Remove Liquidity">
                      <div className="space-y-3">
                        <div className="text-xs text-gray-400 text-center">
                          Current LP: {userLiquidity != null ? parseFloat(formatEther(userLiquidity)).toFixed(4) : '0'}
                        </div>
                        <CompactButton 
                          onClick={handleRemoveLiquidity} 
                          disabled={!canRemoveLiquidity || isMining}
                          variant="secondary"
                        >
                          Remove All Liquidity
                        </CompactButton>
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'swap' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Step 3: Token Swapping</h3>
                    <p className="text-xs text-gray-400">Exchange tokens through the AMM pool</p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <CompactCard title="Swap Tokens">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <select 
                            value={swapDirection} 
                            onChange={e => setSwapDirection(e.target.value as 'AtoB' | 'BtoA')}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="AtoB">A → B</option>
                            <option value="BtoA">B → A</option>
                          </select>
                          <input 
                            type="number" 
                            placeholder="Amount" 
                            value={swapAmount} 
                            onChange={e => setSwapAmount(e.target.value)} 
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="text-xs text-gray-400 text-center">
                          Output: ~{parseFloat(getSwapOutput()).toFixed(4)} {swapDirection === 'AtoB' ? 'Token B' : 'Token A'}
                        </div>
                        {needsSwapApproval && (
                          <CompactButton 
                            onClick={() => handleApprove(swapTokenAddress, ERC20_ABI, swapDirection === 'AtoB' ? 'Token A' : 'Token B', swapAmount)} 
                            disabled={isMining}
                            variant="warning"
                            size="xs"
                          >
                            Approve {swapDirection === 'AtoB' ? 'Token A' : 'Token B'}
                          </CompactButton>
                        )}
                        <CompactButton 
                          onClick={handleSwap} 
                          disabled={!canSwap || isMining}
                          variant="primary"
                        >
                          Execute Swap
                        </CompactButton>
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}

              {activeTab === 'benchmark' && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Step 4: Automated Benchmark</h3>
                    <p className="text-xs text-gray-400">Run comprehensive automated testing suite</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CompactCard title="Benchmark Controls">
                      <div className="space-y-3">
                        <CompactButton 
                          onClick={runFullBenchmark} 
                          disabled={isRunningBenchmark || isMining}
                          variant="success"
                        >
                          {isRunningBenchmark ? 'Running...' : 'Start Full Benchmark'}
                        </CompactButton>
                        <CompactButton 
                          onClick={saveBenchmarkResults} 
                          disabled={sessionStats.length === 0}
                          variant="primary"
                        >
                          Save Results
                        </CompactButton>
                        <CompactButton 
                          onClick={resetTransactionState} 
                          variant="secondary"
                        >
                          Reset
                        </CompactButton>
                      </div>
                    </CompactCard>
                    
                    <CompactCard title="Session Stats">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transactions:</span>
                          <span className="text-white">{sessionStats.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Gas:</span>
                          <span className="text-blue-400">{sessionStats.reduce((sum, stat) => sum + Number(stat.gasUsed), 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Fees:</span>
                          <span className="text-green-400">{parseFloat(formatEther(sessionStats.reduce((sum, stat) => sum + stat.fee, 0n))).toFixed(6)} ETH</span>
                        </div>
                        {benchmarkStep && (
                          <div className="text-xs text-yellow-400 mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                            {benchmarkStep}
                          </div>
                        )}
                      </div>
                    </CompactCard>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Log - Compact */}
            <CompactCard title="Transaction Log" className="max-h-48 overflow-hidden">
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {transactionLog.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-gray-700/30 rounded">
                    <span className={`font-medium ${
                      log.status === 'confirmed' ? 'text-green-400' : 
                      log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {transactionLog.length === 0 && (
                  <div className="text-center text-gray-500 text-xs py-4">No transactions yet</div>
                )}
              </div>
            </CompactCard>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to start testing</p>
          </div>
        )}
      </div>
    </div>
  );
}