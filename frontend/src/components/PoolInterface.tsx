"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { WalletConnect } from './WalletConnect';
import { CONTRACT_ADDRESSES, BASIC_POOL_ABI } from '@/lib/contracts';
import { parseEther, formatEther } from 'viem';

// Add ERC20 ABI for approve and balance functions
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

interface TransactionLog {
  id: string;
  timestamp: Date;
  action: string;
  status: 'pending' | 'confirmed' | 'failed';
  hash?: string;
  gasUsed?: bigint;
  fee?: bigint;
  message: string;
}

interface SessionStat {
  action: string;
  gasUsed: bigint;
  fee: bigint;
  confirmationTime: number;
  timestamp: Date;
}

export function PoolInterface() {
  const { isConnected, address } = useAccount();
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
  const [removeLiquidityPercent, setRemoveLiquidityPercent] = useState(50);
  const [isMounted, setIsMounted] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [transactionLog, setTransactionLog] = useState<TransactionLog[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkStep, setBenchmarkStep] = useState('');
  const [transactionStartTime, setTransactionStartTime] = useState<number>(0);
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add transaction to log
  const addToLog = (action: string, status: 'pending' | 'confirmed' | 'failed', additionalInfo?: any) => {
    const logEntry: TransactionLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action,
      status,
      hash: hash,
      message: `${status === 'pending' ? '⏳' : status === 'confirmed' ? '✅' : '❌'} ${action} ${status}${additionalInfo ? ` - ${additionalInfo}` : ''}`
    };
    
    if (status === 'confirmed' && receipt) {
      const fee = receipt.gasUsed * receipt.effectiveGasPrice;
      logEntry.gasUsed = receipt.gasUsed;
      logEntry.fee = fee;
      logEntry.message += ` | Gas: ${receipt.gasUsed.toString()} | Fee: ${formatEther(fee)} ETH`;
      
      // Add to session stats
      const confirmationTime = Date.now() - transactionStartTime;
      setSessionStats(prev => [...prev, {
        action,
        gasUsed: receipt.gasUsed,
        fee,
        confirmationTime,
        timestamp: new Date()
      }]);
    }
    
    setTransactionLog(prev => {
      const updated = prev.filter(log => log.action !== action || log.status === 'confirmed');
      return [...updated, logEntry];
    });
  };

  // Handle transaction states
  useEffect(() => {
    if (isPending && currentAction) {
      setTransactionStartTime(Date.now());
      addToLog(currentAction, 'pending');
    }
  }, [isPending, currentAction]);

  useEffect(() => {
    if (isConfirmed && currentAction) {
      addToLog(currentAction, 'confirmed');
      refetchAllData();
      setCurrentAction('');
    }
  }, [isConfirmed, currentAction]);

  useEffect(() => {
    if (error && currentAction) {
      addToLog(currentAction, 'failed', error.message);
      setCurrentAction('');
    }
  }, [error, currentAction]);
  
  // Read user balances
  const { data: balanceA, refetch: refetchBalanceA } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN_A,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: balanceB, refetch: refetchBalanceB } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN_B,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  
  // Read pool reserves
  const { data: reservoirA, refetch: refetchReservoirA } = useReadContract({
    address: CONTRACT_ADDRESSES.BASIC_POOL,
    abi: BASIC_POOL_ABI,
    functionName: 'reservoirA',
  });
  
  const { data: reservoirB, refetch: refetchReservoirB } = useReadContract({
    address: CONTRACT_ADDRESSES.BASIC_POOL,
    abi: BASIC_POOL_ABI,
    functionName: 'reservoirB',
  });

  // Read user liquidity
  const { data: userLiquidity, refetch: refetchUserLiquidity } = useReadContract({
    address: CONTRACT_ADDRESSES.BASIC_POOL,
    abi: BASIC_POOL_ABI,
    functionName: 'liquidityProvided',
    args: address ? [address] : undefined,
  });

  // Check allowances
  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN_A,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.BASIC_POOL] : undefined,
  });

  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN_B,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.BASIC_POOL] : undefined,
  });

  // Refetch all data
  const refetchAllData = () => {
    refetchBalanceA();
    refetchBalanceB();
    refetchAllowanceA();
    refetchAllowanceB();
    refetchReservoirA();
    refetchReservoirB();
    refetchUserLiquidity();
  };

  // Calculate swap output (simplified)
  const calculateSwapOutput = () => {
    if (!swapAmount || !reservoirA || !reservoirB) return '0';
    
    const amountIn = parseEther(swapAmount);
    const reserveIn = swapDirection === 'AtoB' ? reservoirA : reservoirB;
    const reserveOut = swapDirection === 'AtoB' ? reservoirB : reservoirA;
    
    // Simple constant product formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
    const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    return formatEther(amountOut);
  };

  // Handler functions
  const handleApproveTokenA = () => {
    if (!amountA) return;
    setCurrentAction('Approve Token A');
    writeContract({
      address: CONTRACT_ADDRESSES.TOKEN_A,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(amountA)],
    });
  };

  const handleApproveTokenB = () => {
    if (!amountB) return;
    setCurrentAction('Approve Token B');
    writeContract({
      address: CONTRACT_ADDRESSES.TOKEN_B,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(amountB)],
    });
  };

  const handleApproveSwapToken = () => {
    if (!swapAmount) return;
    const tokenAddress = swapDirection === 'AtoB' ? CONTRACT_ADDRESSES.TOKEN_A : CONTRACT_ADDRESSES.TOKEN_B;
    setCurrentAction(`Approve ${swapDirection === 'AtoB' ? 'Token A' : 'Token B'} for Swap`);
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(swapAmount)],
    });
  };
  
  const handleAddLiquidity = () => {
    if (!amountA || !amountB) return;
    setCurrentAction('Add Liquidity');
    writeContract({
      address: CONTRACT_ADDRESSES.BASIC_POOL,
      abi: BASIC_POOL_ABI,
      functionName: 'addLiquidity',
      args: [parseEther(amountA), parseEther(amountB)],
    });
  };

  const handleSwap = () => {
    if (!swapAmount) return;
    const functionName = swapDirection === 'AtoB' ? 'swapAForB' : 'swapBForA';
    setCurrentAction(`Swap ${swapDirection === 'AtoB' ? 'A→B' : 'B→A'}`);
    writeContract({
      address: CONTRACT_ADDRESSES.BASIC_POOL,
      abi: BASIC_POOL_ABI,
      functionName,
      args: [parseEther(swapAmount)],
    });
  };

  const handleRemoveLiquidity = () => {
    if (!userLiquidity) return;
    const amountToRemove = (userLiquidity * BigInt(removeLiquidityPercent)) / BigInt(100);
    setCurrentAction('Remove Liquidity');
    writeContract({
      address: CONTRACT_ADDRESSES.BASIC_POOL,
      abi: BASIC_POOL_ABI,
      functionName: 'removeLiquidity',
      args: [amountToRemove],
    });
  };

  // Benchmark runner
  const runFullBenchmark = async () => {
    setIsRunningBenchmark(true);
    setBenchmarkStep('Starting benchmark...');
    
    const steps = [
      { name: 'Approve Token A', action: handleApproveTokenA },
      { name: 'Approve Token B', action: handleApproveTokenB },
      { name: 'Add Liquidity', action: handleAddLiquidity },
      { name: 'Approve Token A for Swap', action: handleApproveSwapToken },
      { name: 'Swap A→B', action: handleSwap },
      { name: 'Remove Liquidity', action: handleRemoveLiquidity }
    ];
    
    for (const step of steps) {
      setBenchmarkStep(`Running: ${step.name}`);
      step.action();
      // Wait for transaction to complete before next step
      await new Promise(resolve => {
        const checkComplete = () => {
          if (!isPending && !isConfirming) {
            resolve(undefined);
          } else {
            setTimeout(checkComplete, 1000);
          }
        };
        checkComplete();
      });
    }
    
    setIsRunningBenchmark(false);
    setBenchmarkStep('');
  };

  // Don't render until mounted (fixes hydration)
  if (!isMounted) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const needsApprovalA = allowanceA ? allowanceA < parseEther(amountA || '0') : true;
  const needsApprovalB = allowanceB ? allowanceB < parseEther(amountB || '0') : true;
  const swapTokenAllowance = swapDirection === 'AtoB' ? allowanceA : allowanceB;
  const needsSwapApproval = swapTokenAllowance ? swapTokenAllowance < parseEther(swapAmount || '0') : true;
  
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-black font-bold">AMM Testing Dashboard</h2>
        <WalletConnect />
      </div>
      
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info & Pool Status */}
          <div className="space-y-4">
            {/* User Balances */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Your Balances</h3>
              <p className="text-sm text-gray-700">Token A: {balanceA ? formatEther(balanceA) : '0'}</p>
              <p className="text-sm text-gray-700">Token B: {balanceB ? formatEther(balanceB) : '0'}</p>
              <p className="text-sm text-gray-700">Liquidity: {userLiquidity ? formatEther(userLiquidity) : '0'}</p>
            </div>
            
            {/* Pool Reserves */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Pool Reserves</h3>
              <p className="text-sm text-gray-700">Token A: {reservoirA ? formatEther(reservoirA) : '0'}</p>
              <p className="text-sm text-gray-700">Token B: {reservoirB ? formatEther(reservoirB) : '0'}</p>
            </div>

            {/* Benchmark Runner */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Benchmark Runner</h3>
              {benchmarkStep && <p className="text-sm text-purple-700 mb-2">{benchmarkStep}</p>}
              <button
                onClick={runFullBenchmark}
                disabled={isRunningBenchmark || isPending || isConfirming}
                className="w-full bg-purple-500 text-white p-2 rounded disabled:opacity-50"
              >
                {isRunningBenchmark ? 'Running Benchmark...' : 'Run Full Benchmark'}
              </button>
            </div>
          </div>

          {/* Middle Column - Actions */}
          <div className="space-y-6">
            {/* Add Liquidity */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Add Liquidity</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Amount Token A"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  className="w-full p-2 border rounded text-gray-700"
                />
                {needsApprovalA && amountA && (
                  <button
                    onClick={handleApproveTokenA}
                    disabled={isPending || isConfirming}
                    className="w-full bg-yellow-500 text-white p-2 rounded disabled:opacity-50"
                  >
                    Approve Token A
                  </button>
                )}
                
                <input
                  type="number"
                  placeholder="Amount Token B"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  className="w-full p-2 border rounded text-gray-700"
                />
                {needsApprovalB && amountB && (
                  <button
                    onClick={handleApproveTokenB}
                    disabled={isPending || isConfirming}
                    className="w-full bg-yellow-500 text-white p-2 rounded disabled:opacity-50"
                  >
                    Approve Token B
                  </button>
                )}
                
                <button
                  onClick={handleAddLiquidity}
                  disabled={isPending || isConfirming || !amountA || !amountB || needsApprovalA || needsApprovalB}
                  className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
                >
                  Add Liquidity
                </button>
              </div>
            </div>

            {/* Swap */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Swap Tokens</h3>
              <div className="space-y-2">
                <select
                  value={swapDirection}
                  onChange={(e) => setSwapDirection(e.target.value as 'AtoB' | 'BtoA')}
                  className="w-full p-2 border rounded text-gray-700"
                >
                  <option value="AtoB">Token A → Token B</option>
                  <option value="BtoA">Token B → Token A</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Amount to swap"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="w-full p-2 border rounded text-gray-700"
                />
                
                {swapAmount && (
                  <p className="text-sm text-gray-600">
                    Estimated output: {calculateSwapOutput()}
                  </p>
                )}
                
                {needsSwapApproval && swapAmount && (
                  <button
                    onClick={handleApproveSwapToken}
                    disabled={isPending || isConfirming}
                    className="w-full bg-yellow-500 text-white p-2 rounded disabled:opacity-50"
                  >
                    Approve {swapDirection === 'AtoB' ? 'Token A' : 'Token B'}
                  </button>
                )}
                
                <button
                  onClick={handleSwap}
                  disabled={isPending || isConfirming || !swapAmount || needsSwapApproval}
                  className="w-full bg-green-500 text-white p-2 rounded disabled:opacity-50"
                >
                  Swap
                </button>
              </div>
            </div>

            {/* Remove Liquidity */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Remove Liquidity</h3>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Remove {removeLiquidityPercent}% of liquidity
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={removeLiquidityPercent}
                  onChange={(e) => setRemoveLiquidityPercent(Number(e.target.value))}
                  className="w-full"
                />
                <button
                  onClick={handleRemoveLiquidity}
                  disabled={isPending || isConfirming || !userLiquidity || userLiquidity === BigInt(0)}
                  className="w-full bg-red-500 text-white p-2 rounded disabled:opacity-50"
                >
                  Remove Liquidity
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Logs & Stats */}
          <div className="space-y-4">
            {/* Transaction Log */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Transaction Log</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {transactionLog.slice(-10).map((log) => (
                  <div key={log.id} className="text-xs text-gray-800 p-2 bg-white rounded border">
                    <div className="font-mono">{log.timestamp.toLocaleTimeString()}</div>
                    <div>{log.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Statistics */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Session Statistics</h3>
              <div className="max-h-60 overflow-y-auto">
                {sessionStats.length > 0 ? (
                  <div className="space-y-2">
                    {sessionStats.map((stat, index) => (
                      <div key={index} className="text-xs text-gray-700 p-2 bg-white rounded border">
                        <div className="font-semibold">{stat.action}</div>
                        <div>Gas: {stat.gasUsed.toString()}</div>
                        <div>Fee: {formatEther(stat.fee)} ETH</div>
                        <div>Time: {stat.confirmationTime}ms</div>
                      </div>
                    ))}
                    <div className="mt-2 p-2 text-gray-700 bg-green-300 rounded text-xs border">
                      <div>Total Transactions: {sessionStats.length}</div>
                      <div>Total Gas: {sessionStats.reduce((sum, stat) => sum + stat.gasUsed, BigInt(0)).toString()}</div>
                      <div>Total Fees: {formatEther(sessionStats.reduce((sum, stat) => sum + stat.fee, BigInt(0)))} ETH</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No transactions yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">Connect wallet to continue</p>
      )}
    </div>
  );
}