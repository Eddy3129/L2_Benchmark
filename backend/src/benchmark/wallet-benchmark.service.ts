import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { NetworkConfig, getNetworkConfig } from '../../../shared/config/networks';
import { getDefaultBenchmarkFunctions, extractWritableFunctions } from '../../../shared/config/contracts';
import { BaseService } from '../shared/base.service';
import { BenchmarkSession } from './benchmark.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface WalletBenchmarkRequest {
  contractName: string;
  networks: string[];
  contracts: Array<{
    networkId: string;
    address: string;
    name: string;
    abi: any[];
  }>;
  functions: string[];
  walletAddress: string;
  useWalletSigning: boolean;
  timestamp: string;
}

interface WalletTransactionResult {
  txHash: string;
  functionName: string;
  gasUsed: number;
  executionTime: number;
  success: boolean;
  error?: string;
  fees: string;
  walletSigned: boolean;
  networkId: string;
}

interface WalletContractExecutionResult {
  networkId: string;
  address: string;
  name: string;
  transactions: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    walletSignedTransactions: number;
    totalGasUsed: string;
    totalFees: string;
  };
  functions: {
    name: string;
    gasUsed: number;
    executionTime: number;
    success: boolean;
    txHash?: string;
    error?: string;
    walletSigned: boolean;
  }[];
}

@Injectable()
export class WalletBenchmarkService extends BaseService<BenchmarkSession> {
  protected readonly logger = new Logger(WalletBenchmarkService.name);

  constructor(
    @InjectRepository(BenchmarkSession)
    repository: Repository<BenchmarkSession>
  ) {
    super(repository, 'BenchmarkSession');
  }

  async executeWalletBenchmark(
    request: WalletBenchmarkRequest,
    progressCallback?: (progress: { stage: string; currentNetwork?: string; currentFunction?: string }) => void
  ): Promise<BenchmarkSession> {
    this.logger.log(`Starting wallet benchmark for ${request.walletAddress}`);
    
    // Validate wallet address
    if (!ethers.isAddress(request.walletAddress)) {
      throw new Error('Invalid wallet address provided');
    }

    const results: WalletContractExecutionResult[] = [];
    let totalSignedTransactions = 0;
    
    for (const contract of request.contracts) {
      progressCallback?.({ stage: 'executing', currentNetwork: contract.networkId });
      
      try {
        const result = await this.executeWalletContractBenchmark(
          contract, 
          request.functions, 
          request.walletAddress,
          progressCallback
        );
        results.push(result);
        totalSignedTransactions += result.transactions.walletSignedTransactions;
      } catch (error) {
        this.logger.error(`Failed to execute wallet benchmark for contract ${contract.address} on ${contract.networkId}: ${error.message}`);
        
        // Add failed result
        results.push({
          networkId: contract.networkId,
          address: contract.address,
          name: contract.name,
          transactions: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: request.functions.length,
            walletSignedTransactions: 0,
            totalGasUsed: '0',
            totalFees: '0'
          },
          functions: request.functions.map(funcName => ({
            name: funcName,
            gasUsed: 0,
            executionTime: 0,
            success: false,
            error: error.message,
            walletSigned: false
          }))
        });
      }
    }
    
    // Calculate aggregated metrics
    const totalTransactions = results.reduce((sum, r) => sum + r.transactions.totalTransactions, 0);
    const successfulTransactions = results.reduce((sum, r) => sum + r.transactions.successfulTransactions, 0);
    const totalGasUsed = results.reduce((sum, r) => sum + parseInt(r.transactions.totalGasUsed), 0);
    const totalExecutionTime = results.reduce((sum, r) => {
      return sum + r.functions.reduce((funcSum, f) => funcSum + f.executionTime, 0);
    }, 0);
    
    const avgGasUsed = totalTransactions > 0 ? Math.round(totalGasUsed / totalTransactions) : 0;
    const avgExecutionTime = totalTransactions > 0 ? Math.round(totalExecutionTime / totalTransactions) : 0;
    
    // Create benchmark session
    const session = new BenchmarkSession();
    session.contractName = request.contractName;
    session.networks = request.networks;
    session.totalOperations = totalTransactions;
    session.avgGasUsed = avgGasUsed;
    session.avgExecutionTime = avgExecutionTime;
    session.signedTransactions = totalSignedTransactions;
    session.walletAddress = request.walletAddress;
    session.results = {
      contractName: request.contractName,
      networks: request.networks,
      contracts: results,
      executionSummary: {
        totalTransactions,
        successfulTransactions,
        failedTransactions: totalTransactions - successfulTransactions,
        walletSignedTransactions: totalSignedTransactions,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
        totalGasUsed: totalGasUsed.toString(),
        avgGasUsed,
        avgExecutionTime
      },
      timestamp: request.timestamp
    };
    
    return await this.create(session);
  }

  private async executeWalletContractBenchmark(
    contract: { networkId: string; address: string; name: string; abi: any[] },
    functions: string[],
    walletAddress: string,
    progressCallback?: (progress: { stage: string; currentNetwork?: string; currentFunction?: string }) => void
  ): Promise<WalletContractExecutionResult> {
    const networkConfig = getNetworkConfig(contract.networkId);
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${contract.networkId}`);
    }

    this.logger.log(`Executing wallet benchmark for contract ${contract.address} on ${networkConfig.displayName}`);
    this.logger.log(`Wallet address: ${walletAddress}`);

    // For wallet benchmarking, we simulate the transactions that would be signed
    // In a real implementation, this would integrate with the frontend wallet
    const transactionResults: WalletTransactionResult[] = [];
    
    // Filter functions that exist in the contract ABI
    const availableFunctions = functions.filter(funcName => {
      const func = contract.abi.find(item => item.type === 'function' && item.name === funcName);
      return func && (func.stateMutability === 'nonpayable' || func.stateMutability === 'payable');
    });

    if (availableFunctions.length === 0) {
      this.logger.warn(`No executable functions found in contract ${contract.address}`);
      // Try to find any non-view functions
      const writableFunctions = extractWritableFunctions(contract.abi);
      
      if (writableFunctions.length > 0) {
        availableFunctions.push(...writableFunctions.slice(0, 3).map(f => f.name));
      }
    }

    for (const funcName of availableFunctions) {
      progressCallback?.({ 
        stage: 'executing', 
        currentNetwork: contract.networkId, 
        currentFunction: funcName 
      });
      
      try {
        const result = await this.simulateWalletTransaction(
          contract,
          funcName,
          walletAddress,
          networkConfig
        );
        transactionResults.push(result);
        
        // Small delay between function calls
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(`Failed to simulate wallet transaction for function ${funcName}: ${error.message}`);
        transactionResults.push({
          txHash: '',
          functionName: funcName,
          gasUsed: 0,
          executionTime: 0,
          success: false,
          error: error.message,
          fees: '0',
          walletSigned: false,
          networkId: contract.networkId
        });
      }
    }
    
    // Calculate transaction summary
    const totalTransactions = transactionResults.length;
    const successfulTransactions = transactionResults.filter(r => r.success).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const walletSignedTransactions = transactionResults.filter(r => r.walletSigned).length;
    const totalGasUsed = transactionResults.reduce((sum, r) => sum + r.gasUsed, 0);
    const totalFees = transactionResults.reduce((sum, r) => sum + parseFloat(r.fees), 0);
    
    return {
      networkId: contract.networkId,
      address: contract.address,
      name: contract.name,
      transactions: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        walletSignedTransactions,
        totalGasUsed: totalGasUsed.toString(),
        totalFees: totalFees.toString()
      },
      functions: transactionResults.map(r => ({
        name: r.functionName,
        gasUsed: r.gasUsed,
        executionTime: r.executionTime,
        success: r.success,
        txHash: r.txHash,
        error: r.error,
        walletSigned: r.walletSigned
      }))
    };
  }

  private async simulateWalletTransaction(
    contract: { networkId: string; address: string; name: string; abi: any[] },
    functionName: string,
    walletAddress: string,
    networkConfig: NetworkConfig
  ): Promise<WalletTransactionResult> {
    const startTime = Date.now();
    
    // Find function in ABI
    const funcAbi = contract.abi.find(item => item.type === 'function' && item.name === functionName);
    if (!funcAbi) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }

    try {
      // Simulate transaction preparation and gas estimation
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const contractInstance = new ethers.Contract(contract.address, contract.abi, provider);
      
      // Generate mock parameters for the function
      const mockParams = this.generateMockParameters(funcAbi.inputs, walletAddress);
      
      // Estimate gas (this doesn't require wallet signing)
      let gasEstimate = BigInt(21000); // Default gas limit
      try {
        if (mockParams.length === 0) {
          gasEstimate = await contractInstance[functionName].estimateGas();
        } else {
          gasEstimate = await contractInstance[functionName].estimateGas(...mockParams);
        }
      } catch (gasError) {
        this.logger.warn(`Gas estimation failed for ${functionName}: ${gasError.message}`);
        gasEstimate = BigInt(100000); // Fallback gas estimate
      }
      
      const executionTime = Date.now() - startTime;
      
      // Simulate successful wallet signing
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const gasPrice = await provider.getFeeData();
      const fees = ethers.formatEther((gasEstimate * (gasPrice.gasPrice || BigInt(20000000000))).toString());
      
      return {
        txHash: mockTxHash,
        functionName,
        gasUsed: Number(gasEstimate),
        executionTime,
        success: true,
        fees,
        walletSigned: true,
        networkId: contract.networkId
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        txHash: '',
        functionName,
        gasUsed: 0,
        executionTime,
        success: false,
        error: error.message,
        fees: '0',
        walletSigned: false,
        networkId: contract.networkId
      };
    }
  }

  private generateMockParameters(inputs: any[], walletAddress: string): any[] {
    return inputs.map(input => {
      switch (input.type) {
        case 'address':
          return walletAddress;
        case 'uint256':
        case 'uint':
          return '1000000000000000000'; // 1 token with 18 decimals
        case 'bool':
          return true;
        case 'string':
          return 'test';
        case 'bytes':
          return '0x';
        default:
          if (input.type.startsWith('uint')) {
            return '1000';
          }
          return '0x';
      }
    });
  }
}