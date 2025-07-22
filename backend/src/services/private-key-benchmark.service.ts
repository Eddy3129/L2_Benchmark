import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { getNetworkConfig } from '../config/networks';
import { DataStorageService } from '../shared/data-storage.service';

export interface TransactionMetrics {
  txHash: string;
  functionName: string;
  contractAddress: string;
  networkId: string;
  gasUsed: number;
  effectiveGasPrice: string;
  l1Fee?: string;
  confirmationTime: number;
  blockNumber: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface BenchmarkSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  transactions: TransactionMetrics[];
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasUsed: number;
    avgGasPrice: string;
    avgConfirmationTime: number;
    totalL1Fees: string;
  };
}

@Injectable()
export class PrivateKeyBenchmarkService {
  private readonly logger = new Logger(PrivateKeyBenchmarkService.name);
  private activeSessions = new Map<string, BenchmarkSession>();

  constructor(private dataStorage: DataStorageService) {}

  async startBenchmark(
    contracts: Array<{
      networkId: string;
      address: string;
      name: string;
      abi: any[];
    }>,
    functions: string[],
    userParameters: { [functionName: string]: { [paramName: string]: string } },
    progressCallback?: (progress: any) => void
  ): Promise<string> {
    if (!process.env.TEST_WALLET_PRIVATE_KEY) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable is required');
    }

    const sessionId = `benchmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: BenchmarkSession = {
      id: sessionId,
      status: 'running',
      startTime: Date.now(),
      transactions: [],
      summary: {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalGasUsed: 0,
        avgGasPrice: '0',
        avgConfirmationTime: 0,
        totalL1Fees: '0'
      }
    };

    this.activeSessions.set(sessionId, session);

    // Execute benchmark asynchronously
    this.executeBenchmarkAsync(sessionId, contracts, functions, userParameters, progressCallback)
      .catch(error => {
        this.logger.error(`Benchmark session ${sessionId} failed:`, error);
        session.status = 'failed';
        session.endTime = Date.now();
      });

    return sessionId;
  }

  private async executeBenchmarkAsync(
    sessionId: string,
    contracts: Array<{
      networkId: string;
      address: string;
      name: string;
      abi: any[];
    }>,
    functions: string[],
    userParameters: { [functionName: string]: { [paramName: string]: string } },
    progressCallback?: (progress: any) => void
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      for (const contract of contracts) {
        progressCallback?.({
          sessionId,
          stage: 'executing',
          currentNetwork: contract.networkId,
          currentContract: contract.address
        });

        await this.executeContractBenchmark(sessionId, contract, functions, userParameters, progressCallback);
      }

      // Calculate final summary
      this.calculateSessionSummary(sessionId);
      session.status = 'completed';
      session.endTime = Date.now();

      // Save to storage
      await this.dataStorage.create('benchmarkSession', session);

      this.logger.log(`Benchmark session ${sessionId} completed successfully`);
    } catch (error) {
      this.logger.error(`Benchmark session ${sessionId} failed:`, error);
      session.status = 'failed';
      session.endTime = Date.now();
    }
  }

  private async executeContractBenchmark(
    sessionId: string,
    contract: { networkId: string; address: string; name: string; abi: any[] },
    functions: string[],
    userParameters: { [functionName: string]: { [paramName: string]: string } },
    progressCallback?: (progress: any) => void
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const networkConfig = getNetworkConfig(contract.networkId);
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${contract.networkId}`);
    }

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY!, provider);
    const contractInstance = new ethers.Contract(contract.address, contract.abi, wallet);

    // Filter available functions and exclude owner-only functions
    const availableFunctions = functions.filter(funcName => {
      const funcAbi = contract.abi.find(item => item.name === funcName && item.type === 'function');
      if (!funcAbi || (funcAbi.stateMutability !== 'nonpayable' && funcAbi.stateMutability !== 'payable')) {
        return false;
      }
      
      // Skip functions that are likely owner-only (common patterns)
      const ownerOnlyPatterns = ['onlyOwner', 'owner', 'admin', 'mint', 'burn', 'pause', 'unpause'];
      const isOwnerOnly = ownerOnlyPatterns.some(pattern => 
        funcName.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isOwnerOnly) {
        this.logger.warn(`Skipping potentially owner-only function: ${funcName}`);
        return false;
      }
      
      return true;
    });

    for (const funcName of availableFunctions) {
      progressCallback?.({
        sessionId,
        stage: 'executing',
        currentNetwork: contract.networkId,
        currentContract: contract.address,
        currentFunction: funcName
      });

      try {
        const metrics = await this.executeAndTrackTransaction(
          contractInstance,
          funcName,
          contract.abi,
          contract.address,
          contract.networkId,
          userParameters[funcName] || {}
        );

        session.transactions.push(metrics);
        this.logger.log(`Transaction completed: ${metrics.txHash}`);

        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed to execute ${funcName}:`, error);
        session.transactions.push({
          txHash: '',
          functionName: funcName,
          contractAddress: contract.address,
          networkId: contract.networkId,
          gasUsed: 0,
          effectiveGasPrice: '0',
          l1Fee: '0',
          confirmationTime: 0,
          blockNumber: 0,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });
      }
    }
  }

  private async executeAndTrackTransaction(
    contract: ethers.Contract,
    functionName: string,
    abi: any[],
    contractAddress: string,
    networkId: string,
    userParams: { [paramName: string]: string } = {}
  ): Promise<TransactionMetrics> {
    const startTime = Date.now();

    // Find function in ABI
    const funcAbi = abi.find(item => item.type === 'function' && item.name === functionName);
    if (!funcAbi) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }

    // Get wallet address from provider
    const signer = contract.runner as ethers.Wallet;
    const walletAddress = signer.address;
    
    // Generate parameters using user-provided values or defaults
    const params = this.generateFunctionParameters(funcAbi.inputs || [], functionName, walletAddress, userParams);

    // Estimate gas
    let gasEstimate: bigint;
    try {
      gasEstimate = await contract[functionName].estimateGas(...params);
    } catch (error) {
      gasEstimate = BigInt(100000); // Default
    }

    const gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100);

    // Execute transaction
    let tx;
    try {
      this.logger.log(`Executing ${functionName} with params: ${JSON.stringify(params)}`);
      tx = await contract[functionName](...params, {
        gasLimit: gasLimit,
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxFeePerGas: ethers.parseUnits('20', 'gwei')
      });
    } catch (error) {
      this.logger.error(`Failed to execute ${functionName}: ${error.message}`);
      throw new Error(`Transaction execution failed: ${error.message}`);
    }

    // Wait for confirmation and track time
    let receipt;
    let confirmationTime;
    try {
      receipt = await tx.wait();
      confirmationTime = Date.now() - startTime;

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
    } catch (error) {
      this.logger.error(`Transaction failed during confirmation: ${error.message}`);
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }

    // Calculate L1 fee for L2 networks (if available)
    let l1Fee = '0';
    try {
      // For Optimism-based chains, try to get L1 fee
      if (networkId.includes('optimism') || networkId.includes('base')) {
        const l1FeeContract = new ethers.Contract(
          '0x420000000000000000000000000000000000000F',
          ['function getL1Fee(bytes) view returns (uint256)'],
          contract.runner
        );
        const l1FeeWei = await l1FeeContract.getL1Fee(tx.data);
        l1Fee = ethers.formatEther(l1FeeWei);
      }
    } catch (error) {
      // L1 fee calculation failed, keep as '0'
    }

    return {
      txHash: tx.hash,
      functionName,
      contractAddress,
      networkId,
      gasUsed: Number(receipt.gasUsed),
      effectiveGasPrice: ethers.formatUnits(receipt.gasPrice || BigInt(0), 'gwei'),
      l1Fee,
      confirmationTime,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
      success: receipt.status === 1
    };
  }

  private generateFunctionParameters(inputs: any[], functionName: string, walletAddress: string, userParams: { [paramName: string]: string } = {}): any[] {
    return inputs.map((input, index) => {
      // Check if user provided a value for this parameter
      if (userParams[input.name]) {
        return this.convertParameterValue(userParams[input.name], input.type);
      }
      
      switch (input.type) {
        case 'address':
          // For approve functions, use the wallet address as the spender
          if (functionName === 'approve' && (input.name === 'to' || input.name === 'spender')) {
            return walletAddress;
          }
          // For mint functions, use the wallet address as recipient
          if ((functionName.includes('mint') || functionName.includes('Mint')) && 
              (input.name === 'to' || input.name === 'recipient')) {
            return walletAddress;
          }
          // For transfer functions, use wallet address for 'to' parameter
          if ((functionName.includes('transfer') || functionName.includes('Transfer')) && 
              (input.name === 'to' || input.name === 'recipient')) {
            return walletAddress;
          }
          return '0x0000000000000000000000000000000000000001';
        case 'uint256':
        case 'uint':
          // For token IDs, use 0 (most likely to exist)
          if (input.name === 'tokenId') {
            return '0';
          }
          // For quantities, use reasonable amounts
          if (input.name === 'quantity' || input.name === 'amount') {
            return '1';
          }
          // For approve function amounts, use smaller values
          if (functionName === 'approve' && (input.name === 'amount' || input.name === 'value')) {
            return '1000000000000000000'; // 1 token (18 decimals)
          }
          return '1000000000000000000'; // 1 token (18 decimals)
        case 'uint8':
          return 1;
        case 'bool':
          return true;
        case 'string':
          return 'test';
        case 'bytes32':
          return ethers.ZeroHash;
        case 'bytes':
          return '0x';
        default:
          if (input.type.startsWith('uint')) {
            return '1';
          }
          if (input.type.startsWith('int')) {
            return '1';
          }
          if (input.type.endsWith('[]')) {
            return [];
          }
          return '0x0000000000000000000000000000000000000000';
      }
    });
  }

  private convertParameterValue(value: string, type: string): any {
    switch (type) {
      case 'address':
        return value;
      case 'uint256':
      case 'uint':
        return value;
      case 'uint8':
        return parseInt(value);
      case 'bool':
        return value.toLowerCase() === 'true';
      case 'string':
        return value;
      case 'bytes32':
        return value.startsWith('0x') ? value : ethers.id(value);
      case 'bytes':
        return value.startsWith('0x') ? value : ethers.toUtf8Bytes(value);
      default:
        if (type.startsWith('uint') || type.startsWith('int')) {
          return value;
        }
        if (type.endsWith('[]')) {
          try {
            return JSON.parse(value);
          } catch {
            return [value];
          }
        }
        return value;
    }
  }

  private calculateSessionSummary(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const transactions = session.transactions;
    const successful = transactions.filter(tx => tx.success);
    const failed = transactions.filter(tx => !tx.success);

    const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.gasUsed, 0);
    const avgGasPrice = successful.length > 0 
      ? (successful.reduce((sum, tx) => sum + parseFloat(tx.effectiveGasPrice), 0) / successful.length).toFixed(4)
      : '0';
    const avgConfirmationTime = successful.length > 0
      ? successful.reduce((sum, tx) => sum + tx.confirmationTime, 0) / successful.length
      : 0;
    const totalL1Fees = transactions.reduce((sum, tx) => sum + parseFloat(tx.l1Fee || '0'), 0).toFixed(6);

    session.summary = {
      totalTransactions: transactions.length,
      successfulTransactions: successful.length,
      failedTransactions: failed.length,
      totalGasUsed,
      avgGasPrice,
      avgConfirmationTime: Math.round(avgConfirmationTime),
      totalL1Fees
    };
  }

  getSession(sessionId: string): BenchmarkSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getAllSessions(): BenchmarkSession[] {
    return Array.from(this.activeSessions.values());
  }

  async exportSessionToCsv(sessionId: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const headers = [
      'Transaction Hash',
      'Function Name',
      'Contract Address',
      'Network ID',
      'Gas Used',
      'Effective Gas Price (Gwei)',
      'L1 Fee (ETH)',
      'Confirmation Time (ms)',
      'Block Number',
      'Timestamp',
      'Success',
      'Error'
    ];

    const rows = session.transactions.map(tx => [
      tx.txHash,
      tx.functionName,
      tx.contractAddress,
      tx.networkId,
      tx.gasUsed.toString(),
      tx.effectiveGasPrice,
      tx.l1Fee || '0',
      tx.confirmationTime.toString(),
      tx.blockNumber.toString(),
      new Date(tx.timestamp).toISOString(),
      tx.success.toString(),
      tx.error || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}