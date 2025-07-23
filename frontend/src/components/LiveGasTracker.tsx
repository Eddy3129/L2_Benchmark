'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, Trash2 } from 'lucide-react'

interface TransactionData {
  id: string
  hash: string
  network: string
  contractAddress: string
  functionName: string
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: bigint
  gasPrice?: bigint
  executionTime?: number
  timestamp: number
  startTime: number
}

interface LiveGasTrackerProps {
  networkName: string
  explorerUrl: string
}

export function LiveGasTracker({ networkName, explorerUrl }: LiveGasTrackerProps) {
  const { address } = useAccount()
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [totalGasUsed, setTotalGasUsed] = useState<bigint>(0n)
  const [totalCost, setTotalCost] = useState<bigint>(0n)

  // Track transaction receipts
  const trackTransaction = (hash: string, contractAddress: string, functionName: string, startTime: number) => {
    const newTx: TransactionData = {
      id: `${hash}-${Date.now()}`,
      hash,
      network: networkName,
      contractAddress,
      functionName,
      status: 'pending',
      timestamp: Date.now(),
      startTime
    }
    
    setTransactions(prev => [newTx, ...prev.slice(0, 49)]) // Keep last 50 transactions
  }

  // Custom hook to wait for transaction receipt and update gas data
  const useTransactionTracker = (hash: string) => {
    const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({
      hash: hash as `0x${string}`,
    })

    useEffect(() => {
      if (receipt && isSuccess) {
        setTransactions(prev => prev.map(tx => {
          if (tx.hash === hash) {
            const executionTime = Date.now() - tx.startTime
            const gasUsed = receipt.gasUsed
            const gasPrice = receipt.effectiveGasPrice
            const cost = gasUsed * gasPrice

            // Update totals
            setTotalGasUsed(prevTotal => prevTotal + gasUsed)
            setTotalCost(prevTotal => prevTotal + cost)

            return {
              ...tx,
              status: 'confirmed' as const,
              gasUsed,
              gasPrice,
              executionTime
            }
          }
          return tx
        }))
      } else if (isError) {
        setTransactions(prev => prev.map(tx => 
          tx.hash === hash ? { ...tx, status: 'failed' as const, executionTime: Date.now() - tx.startTime } : tx
        ))
      }
    }, [receipt, isSuccess, isError, hash])

    return { receipt, isSuccess, isError }
  }

  // Transaction components that track their own receipts
  const TransactionRow = ({ tx }: { tx: TransactionData }) => {
    useTransactionTracker(tx.hash)

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-500'
        case 'confirmed': return 'bg-green-500'
        case 'failed': return 'bg-red-500'
        default: return 'bg-gray-500'
      }
    }

    return (
      <div className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-gray-800/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${getStatusColor(tx.status)} text-white`}>
              {tx.status}
            </Badge>
            <span className="text-sm font-medium text-white">{tx.functionName}</span>
            {tx.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Contract: {tx.contractAddress.slice(0, 8)}...{tx.contractAddress.slice(-6)}</div>
            {tx.gasUsed && (
              <div className="flex gap-4">
                <span>Gas: {tx.gasUsed.toLocaleString()}</span>
                {tx.gasPrice && (
                  <span>Cost: {parseFloat(formatEther(tx.gasUsed * tx.gasPrice)).toFixed(6)} ETH</span>
                )}
                {tx.executionTime && <span>Time: {tx.executionTime}ms</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${explorerUrl}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  const clearTransactions = () => {
    setTransactions([])
    setTotalGasUsed(0n)
    setTotalCost(0n)
  }

  const averageGas = transactions.length > 0 
    ? totalGasUsed / BigInt(transactions.filter(tx => tx.gasUsed).length || 1)
    : 0n

  const successRate = transactions.length > 0 
    ? (transactions.filter(tx => tx.status === 'confirmed').length / transactions.length) * 100
    : 0

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Live Gas Tracker - {networkName}</CardTitle>
          <Button
            onClick={clearTransactions}
            variant="outline"
            size="sm"
            className="text-gray-400 border-gray-600 hover:bg-gray-800"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Total Transactions</div>
            <div className="text-lg font-bold text-white">{transactions.length}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Success Rate</div>
            <div className="text-lg font-bold text-green-400">{successRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Total Gas Used</div>
            <div className="text-lg font-bold text-blue-400">{totalGasUsed.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Average Gas</div>
            <div className="text-lg font-bold text-purple-400">{averageGas.toLocaleString()}</div>
          </div>
        </div>

        {/* Total Cost */}
        {totalCost > 0n && (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 rounded-lg border border-blue-700/50">
            <div className="text-sm text-gray-300">Total Cost</div>
            <div className="text-2xl font-bold text-white">
              {parseFloat(formatEther(totalCost)).toFixed(6)} ETH
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No transactions tracked yet. Execute some contract functions to see real-time gas data.
            </div>
          ) : (
            transactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook to use the gas tracker
export function useGasTracker() {
  const [transactions, setTransactions] = useState<TransactionData[]>([])

  const trackTransaction = (hash: string, contractAddress: string, functionName: string) => {
    const newTx: TransactionData = {
      id: `${hash}-${Date.now()}`,
      hash,
      network: 'Current Network',
      contractAddress,
      functionName,
      status: 'pending',
      timestamp: Date.now(),
      startTime: Date.now()
    }
    
    setTransactions(prev => [newTx, ...prev.slice(0, 49)])
  }

  return { trackTransaction, transactions }
}