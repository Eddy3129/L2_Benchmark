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
  
  // --- Transaction State Management ---
  const [latestTx, setLatestTx] = useState<{ hash?: `0x${string}`; startTime: number; action: string } | null>(null);
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, isError: isTxError, error: txError } = useWaitForTransactionReceipt({ hash: latestTx?.hash });
  const isMining = isConfirming || isPending; // Updated to use isPending from useWriteContract

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
    
    // Clear any existing transaction state first
    setLatestTx(null);
    
    const logId = `${action}-${Date.now()}`;
    setLatestTx({ action, startTime: Date.now() });
    setTransactionLog(prev => [{ id: logId, timestamp: new Date().toISOString(), action, status: 'pending', message: `⏳ ${action}: Waiting for wallet confirmation...` }, ...prev]);
    
    // Add EIP-1559 gas parameters to config
    const eip1559Config = {
      ...config,
      gas: 300000n, // Set reasonable gas limit
      maxFeePerGas: parseGwei('30'), // Maximum fee per gas (30 gwei)
      maxPriorityFeePerGas: parseGwei('2'), // Priority fee for miners (2 gwei)
    };
    
    try {
      writeContract(eip1559Config);
    } catch (e: any) {
      // Immediately clear transaction state on error
      const errorMessage = e.shortMessage || e.message;
      setTransactionLog(prev => prev.map(log => log.id === logId ? { ...log, status: 'failed', message: `❌ ${action} failed: ${errorMessage}` } : log));
      setLatestTx(null);
      setIsRunningBenchmark(false);
    }
  }, [writeContract, address]);

  // Add a manual reset function
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
      // You must have enough balance to provide, and your allowance must be less than what you want to provide.
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
      // Formula: amountOut = (reserveOut * amountIn) / (reserveIn + amountIn)
      const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
      return formatEther(amountOut);
    } catch (e) { return '0'; }
  };
  
  // --- Action Handlers with EIP-1559 ---
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

  // --- Benchmark Runner Logic with EIP-1559 ---
  const runFullBenchmark = async () => {
    setIsRunningBenchmark(true);
    setSessionStats([]); // Clear previous session stats
    
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
  if (!isMounted) return <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 rounded-lg shadow animate-pulse"><div className="h-[70vh] bg-gray-200 rounded-lg"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-slate-800 font-bold">AMM Benchmarking Dashboard</h2>
        <div className="flex gap-2">
          {/* Add this reset button for debugging */}
          {(latestTx || isRunningBenchmark) && (
            <button 
              onClick={resetTransactionState}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Reset State
            </button>
          )}
        </div>
      </div>
      
      {isConnected && address ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <InfoCard title="Your Balances">
              <p>Address: <span className="font-mono text-xs break-all">{address}</span></p>
              <p>ETH: {ethBalance?.formatted ? parseFloat(ethBalance.formatted).toFixed(4) : '0.00'}</p>
              <p>Token A: {tokenAData.balance.data != null ? formatEther(tokenAData.balance.data) : 'Loading...'}</p>
              <p>Token B: {tokenBData.balance.data != null ? formatEther(tokenBData.balance.data) : 'Loading...'}</p>
              <p>Your Pool Share (LP Tokens): {userLiquidity != null ? formatEther(userLiquidity) : 'Loading...'}</p>
            </InfoCard>
            <InfoCard title="Pool Status">
              <p>Token A Reserve: {reservoirA != null ? formatEther(reservoirA) : 'Loading...'}</p>
              <p>Token B Reserve: {reservoirB != null ? formatEther(reservoirB) : 'Loading...'}</p>
            </InfoCard>
          </div>

          <div className="lg:col-span-1 space-y-4">
             <ActionCard title="1. Setup: Get Test Tokens">
                <p className="text-xs text-gray-600 mb-2">First, mint test tokens to your wallet. You must have tokens to do anything else.</p>
                <button onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'Token A')} className="w-full bg-indigo-500 text-white p-2 rounded mb-2 disabled:opacity-50" disabled={isMining}>Mint 10,000 Token A</button>
                <button onClick={() => handleMint(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'Token B')} className="w-full bg-indigo-500 text-white p-2 rounded disabled:opacity-50" disabled={isMining}>Mint 10,000 Token B</button>
             </ActionCard>

             <ActionCard title="2. Add Liquidity">
                <input type="number" placeholder="Amount Token A" value={liquidityAmountA} onChange={e => setLiquidityAmountA(e.target.value)} className="w-full p-2 border rounded text-gray-700 mb-2"/>
                {needsApprovalA && <button onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_A, ERC20_ABI, 'Token A', liquidityAmountA)} className="w-full bg-yellow-500 text-white p-2 rounded mb-2 disabled:opacity-50" disabled={isMining}>1. Approve Token A</button>}
                
                <input type="number" placeholder="Amount Token B" value={liquidityAmountB} onChange={e => setLiquidityAmountB(e.target.value)} className="w-full p-2 border rounded text-gray-700 mb-2"/>
                {needsApprovalB && <button onClick={() => handleApprove(CONTRACT_ADDRESSES.TOKEN_B, ERC20_ABI, 'Token B', liquidityAmountB)} className="w-full bg-yellow-500 text-white p-2 rounded mb-2 disabled:opacity-50" disabled={isMining}>2. Approve Token B</button>}
                
                <button onClick={handleAddLiquidity} disabled={!canAddLiquidity || isMining} className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-400 disabled:opacity-70">{canAddLiquidity ? '3. Add Liquidity' : 'Approve both tokens first'}</button>
             </ActionCard>
             
             <ActionCard title="3. Swap Tokens">
                <select value={swapDirection} onChange={(e) => setSwapDirection(e.target.value as 'AtoB' | 'BtoA')} className="w-full p-2 border rounded text-gray-700 mb-2">
                  <option value="AtoB">Swap Token A for Token B</option>
                  <option value="BtoA">Swap Token B for Token A</option>
                </select>
                <input type="number" placeholder="Amount to swap" value={swapAmount} onChange={e => setSwapAmount(e.target.value)} className="w-full p-2 border rounded text-gray-700 mb-2"/>
                {swapAmount && <p className="text-sm text-gray-600">Estimated output: {getSwapOutput()}</p>}
                
                {needsSwapApproval && <button onClick={() => handleApprove(swapTokenAddress, swapDirection === 'AtoB' ? ERC20_ABI : ERC20_ABI, `Token for Swap`, swapAmount)} className="w-full bg-yellow-500 text-white p-2 rounded mb-2 disabled:opacity-50" disabled={isMining}>Approve Token for Swap</button>}
                <button onClick={handleSwap} disabled={!canSwap || isMining} className="w-full bg-green-600 text-white p-2 rounded disabled:bg-gray-400 disabled:opacity-70">{canSwap ? 'Swap' : 'Approve token first'}</button>
             </ActionCard>

             <ActionCard title="4. Remove Liquidity">
                <button onClick={handleRemoveLiquidity} disabled={!canRemoveLiquidity || isMining} className="w-full bg-red-500 text-white p-2 rounded disabled:opacity-50 mt-2">Remove All Liquidity</button>
             </ActionCard>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-4">
            <InfoCard title="Benchmark Runner">
              <button onClick={runFullBenchmark} disabled={isRunningBenchmark || isMining} className="w-full bg-purple-600 text-white p-2 rounded disabled:opacity-50 mb-3">{isRunningBenchmark ? `Running: ${benchmarkStep}` : 'Run Full Automated Benchmark'}</button>
              
              {sessionStats.length > 0 && (
                <div className="mt-4">
                  <button onClick={saveBenchmarkResults} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors">
                    💾 Save Results to Database
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    {sessionStats.length} transactions recorded
                  </p>
                </div>
              )}
            </InfoCard>
            
            <InfoCard title="Live Transaction Log">
                <div className="max-h-[30rem] overflow-y-auto space-y-2">
                    {transactionLog.map(log => (
                        <div key={log.id} className={`p-2 rounded border text-xs ${log.status === 'confirmed' ? 'bg-green-50 border-green-200' : log.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                            <p className="font-mono text-gray-500">{log.timestamp}</p>
                            <p className="text-gray-800 break-words">{log.message}</p>
                        </div>
                    ))}
                </div>
            </InfoCard>
            
            <InfoCard title="Session Statistics">
                <div className="max-h-60 overflow-y-auto">
                    {sessionStats.length > 0 ? (
                        <table className="w-full text-xs text-left">
                            <thead><tr className="border-b"><th className="py-1">Action</th><th className="py-1">Gas Used</th><th className="py-1">Time (ms)</th></tr></thead>
                            <tbody>
                                {sessionStats.map((stat, i) => (<tr key={i} className="border-b"><td className="py-1 pr-2">{stat.action}</td><td className="py-1">{stat.gasUsed.toString()}</td><td className="py-1">{stat.confirmationTime}</td></tr>))}
                            </tbody>
                        </table>
                    ) : <p className="text-sm text-gray-500">No completed transactions yet.</p>}
                </div>
            </InfoCard>
          </div>
        </div>
      ) : (
        <div className="text-center p-10 bg-gray-50 rounded-lg"><p className="text-gray-600">Please connect your wallet to begin benchmarking.</p></div>
      )}
    </div>
  );
}

// Helper Components
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="p-4 bg-white border rounded-lg shadow-sm"><h3 className="font-semibold text-slate-800 mb-2 text-lg">{title}</h3><div className="space-y-1 text-slate-700">{children}</div></div>
);

const ActionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="p-4 bg-white border rounded-lg shadow-sm"><h3 className="font-semibold text-slate-800 mb-3 text-lg">{title}</h3><div className="space-y-3">{children}</div></div>
);