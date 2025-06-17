"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { WalletConnect } from './WalletConnect';
import { CONTRACT_ADDRESSES, BASIC_POOL_ABI } from '@/lib/contracts';
import { parseEther, formatEther } from 'viem';

// Add ERC20 ABI for approve function
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
  }
] as const;

export function PoolInterface() {
  const { isConnected, address } = useAccount();
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [approvalStates, setApprovalStates] = useState({
    tokenA: 'idle', // 'idle' | 'pending' | 'success' | 'error'
    tokenB: 'idle',
    liquidity: 'idle'
  });
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update approval states based on transaction status
  useEffect(() => {
    if (isConfirmed && hash) {
      // Reset the pending state for whichever action was being performed
      setApprovalStates(prev => ({
        tokenA: prev.tokenA === 'pending' ? 'success' : prev.tokenA,
        tokenB: prev.tokenB === 'pending' ? 'success' : prev.tokenB,
        liquidity: prev.liquidity === 'pending' ? 'success' : prev.liquidity
      }));
      
      // Reset success states after 3 seconds
      setTimeout(() => {
        setApprovalStates(prev => ({
          tokenA: prev.tokenA === 'success' ? 'idle' : prev.tokenA,
          tokenB: prev.tokenB === 'success' ? 'idle' : prev.tokenB,
          liquidity: prev.liquidity === 'success' ? 'idle' : prev.liquidity
        }));
      }, 3000);
    }
    
    if (error) {
      setApprovalStates(prev => ({
        tokenA: prev.tokenA === 'pending' ? 'error' : prev.tokenA,
        tokenB: prev.tokenB === 'pending' ? 'error' : prev.tokenB,
        liquidity: prev.liquidity === 'pending' ? 'error' : prev.liquidity
      }));
      
      // Reset error states after 5 seconds
      setTimeout(() => {
        setApprovalStates(prev => ({
          tokenA: prev.tokenA === 'error' ? 'idle' : prev.tokenA,
          tokenB: prev.tokenB === 'error' ? 'idle' : prev.tokenB,
          liquidity: prev.liquidity === 'error' ? 'idle' : prev.liquidity
        }));
      }, 5000);
    }
  }, [isConfirmed, error, hash]);
  
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

  // Refetch allowances when transactions are confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchAllowanceA();
      refetchAllowanceB();
      refetchReservoirA();
      refetchReservoirB();
    }
  }, [isConfirmed, refetchAllowanceA, refetchAllowanceB, refetchReservoirA, refetchReservoirB]);

  const handleApproveTokenA = () => {
    if (!amountA) return;
    setApprovalStates(prev => ({ ...prev, tokenA: 'pending' }));
    writeContract({
      address: CONTRACT_ADDRESSES.TOKEN_A,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(amountA)],
    });
  };

  const handleApproveTokenB = () => {
    if (!amountB) return;
    setApprovalStates(prev => ({ ...prev, tokenB: 'pending' }));
    writeContract({
      address: CONTRACT_ADDRESSES.TOKEN_B,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.BASIC_POOL, parseEther(amountB)],
    });
  };
  
  const handleAddLiquidity = () => {
    if (!amountA || !amountB) return;
    setApprovalStates(prev => ({ ...prev, liquidity: 'pending' }));
    writeContract({
      address: CONTRACT_ADDRESSES.BASIC_POOL,
      abi: BASIC_POOL_ABI,
      functionName: 'addLiquidity',
      args: [parseEther(amountA), parseEther(amountB)],
    });
  };

  // Don't render until mounted (fixes hydration)
  if (!isMounted) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-black font-bold">Pool Interface</h2>
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const needsApprovalA = allowanceA ? allowanceA < parseEther(amountA || '0') : true;
  const needsApprovalB = allowanceB ? allowanceB < parseEther(amountB || '0') : true;
  
  const getButtonState = (state: string, defaultText: string, pendingText: string, successText: string) => {
    switch (state) {
      case 'pending':
        return { text: pendingText, disabled: true, className: 'bg-yellow-500' };
      case 'success':
        return { text: successText, disabled: false, className: 'bg-green-500' };
      case 'error':
        return { text: 'Failed - Retry', disabled: false, className: 'bg-red-500' };
      default:
        return { text: defaultText, disabled: false, className: 'bg-blue-500' };
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-black font-bold">Pool Interface</h2>
        <WalletConnect />
      </div>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-700 font-medium mb-1">Pool Reserves:</p>
            <p className="text-sm text-gray-700">Token A: {reservoirA ? formatEther(reservoirA) : '0'}</p>
            <p className="text-sm text-gray-700">Token B: {reservoirB ? formatEther(reservoirB) : '0'}</p>
          </div>
          
          {/* Transaction Status */}
          {(isPending || isConfirming) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                {isPending && 'Waiting for wallet confirmation...'}
                {isConfirming && 'Transaction confirming...'}
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">Transaction failed: {error.message}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Amount Token A"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="w-full p-2 border rounded text-gray-700"
            />
            
            {/* Token A Approval Status */}
            <div className="text-xs text-gray-600">
              Allowance A: {allowanceA ? formatEther(allowanceA) : '0'} | 
              Needed: {amountA || '0'} | 
              Status: {needsApprovalA ? '❌ Needs Approval' : '✅ Approved'}
            </div>
            
            {needsApprovalA && amountA && (
              <button
                onClick={handleApproveTokenA}
                disabled={getButtonState(approvalStates.tokenA, '', '', '').disabled}
                className={`w-full text-white p-2 rounded disabled:opacity-50 ${
                  getButtonState(approvalStates.tokenA, 'bg-yellow-500', 'bg-yellow-500', 'bg-green-500').className
                }`}
              >
                {getButtonState(
                  approvalStates.tokenA,
                  'Approve Token A',
                  'Approving Token A...',
                  '✅ Token A Approved'
                ).text}
              </button>
            )}
            
            <input
              type="number"
              placeholder="Amount Token B"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              className="w-full p-2 border rounded text-gray-700"
            />
            
            {/* Token B Approval Status */}
            <div className="text-xs text-gray-600">
              Allowance B: {allowanceB ? formatEther(allowanceB) : '0'} | 
              Needed: {amountB || '0'} | 
              Status: {needsApprovalB ? '❌ Needs Approval' : '✅ Approved'}
            </div>
            
            {needsApprovalB && amountB && (
              <button
                onClick={handleApproveTokenB}
                disabled={getButtonState(approvalStates.tokenB, '', '', '').disabled}
                className={`w-full text-white p-2 rounded disabled:opacity-50 ${
                  getButtonState(approvalStates.tokenB, 'bg-yellow-500', 'bg-yellow-500', 'bg-green-500').className
                }`}
              >
                {getButtonState(
                  approvalStates.tokenB,
                  'Approve Token B',
                  'Approving Token B...',
                  '✅ Token B Approved'
                ).text}
              </button>
            )}
            
            <button
              onClick={handleAddLiquidity}
              disabled={
                getButtonState(approvalStates.liquidity, '', '', '').disabled ||
                !amountA || 
                !amountB || 
                needsApprovalA || 
                needsApprovalB
              }
              className={`w-full text-white p-2 rounded disabled:opacity-50 disabled:bg-gray-400 ${
                (!amountA || !amountB || needsApprovalA || needsApprovalB) 
                  ? 'bg-gray-400' 
                  : getButtonState(approvalStates.liquidity, 'bg-blue-500', 'bg-blue-500', 'bg-green-500').className
              }`}
            >
              {getButtonState(
                approvalStates.liquidity,
                'Add Liquidity',
                'Adding Liquidity...',
                '✅ Liquidity Added'
              ).text}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">Connect wallet to continue</p>
      )}
    </div>
  );
}