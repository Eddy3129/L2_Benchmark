import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { NetworkConfig, getNetworkConfig, TESTNET_NETWORKS } from '../../../shared/config/networks';
import { getDefaultBenchmarkFunctions } from '../../../shared/config/contracts';

interface ContractExecutionResult {
  networkId: string;
  address: string;
  name: string;
  transactions: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
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
  }[];
}

interface TransactionResult {
  txHash: string;
  functionName: string;
  gasUsed: number;
  executionTime: number;
  success: boolean;
  error?: string;
  fees: string;
}

@Injectable()
export class BlockchainExecutorService {
  private readonly logger = new Logger(BlockchainExecutorService.name);
  
  private readonly networkConfigs = TESTNET_NETWORKS;

  async executeBenchmark(
    contracts: Array<{
      networkId: string;
      address: string;
      name: string;
      abi: any[];
    }>,
    functions: string[],
    progressCallback?: (progress: { stage: string; currentNetwork?: string; currentFunction?: string }) => void
  ): Promise<ContractExecutionResult[]> {
    if (!process.env.TEST_WALLET_PRIVATE_KEY) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable is required for benchmark execution');
    }

    const results: ContractExecutionResult[] = [];
    
    for (const contract of contracts) {
      progressCallback?.({ stage: 'executing', currentNetwork: contract.networkId });
      
      try {
        const result = await this.executeContractBenchmark(contract, functions, progressCallback);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to execute benchmark for contract ${contract.address} on ${contract.networkId}: ${error.message}`);
        
        // Add failed result
        results.push({
          networkId: contract.networkId,
          address: contract.address,
          name: contract.name,
          transactions: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: functions.length,
            totalGasUsed: '0',
            totalFees: '0'
          },
          functions: functions.map(funcName => ({
            name: funcName,
            gasUsed: 0,
            executionTime: 0,
            success: false,
            error: error.message
          }))
        });
      }
    }
    
    return results;
  }

  private async executeContractBenchmark(
    contract: { networkId: string; address: string; name: string; abi: any[] },
    functions: string[],
    progressCallback?: (progress: { stage: string; currentNetwork?: string; currentFunction?: string }) => void
  ): Promise<ContractExecutionResult> {
    const networkConfig = getNetworkConfig(contract.networkId);
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${contract.networkId}`);
    }

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY!, provider);
    
    // Check wallet balance
    if (!wallet.provider) {
      throw new Error(`No provider available for network ${contract.networkId}`);
    }
    const balance = await wallet.provider.getBalance(wallet.address);
    const requiredAmount = ethers.parseEther('0.01'); // Minimum required balance
    
    if (balance < requiredAmount) {
      throw new Error(`Insufficient balance: ${ethers.formatEther(balance)} ${networkConfig.nativeCurrency.symbol}, required: ${ethers.formatEther(requiredAmount)} ${networkConfig.nativeCurrency.symbol}`);
    }

    this.logger.log(`Executing benchmark for contract ${contract.address} on ${networkConfig.displayName}`);
    this.logger.log(`Wallet balance: ${ethers.formatEther(balance)} ${networkConfig.nativeCurrency.symbol}`);

    const contractInstance = new ethers.Contract(contract.address, contract.abi, wallet);
    const transactionResults: TransactionResult[] = [];
    
    // Filter functions that exist in the contract ABI
    const availableFunctions = functions.filter(funcName => {
      const func = contract.abi.find(item => item.type === 'function' && item.name === funcName);
      return func && (func.stateMutability === 'nonpayable' || func.stateMutability === 'payable');
    });

    if (availableFunctions.length === 0) {
      this.logger.warn(`No executable functions found in contract ${contract.address}`);
      // Try to find any non-view functions
      const nonViewFunctions = contract.abi.filter(item => 
        item.type === 'function' && 
        (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable')
      );
      
      if (nonViewFunctions.length > 0) {
        availableFunctions.push(...nonViewFunctions.slice(0, 3).map(f => f.name));
      }
    }

    for (const funcName of availableFunctions) {
      progressCallback?.({ 
        stage: 'executing', 
        currentNetwork: contract.networkId, 
        currentFunction: funcName 
      });
      
      try {
        const result = await this.executeContractFunction(contractInstance, funcName, contract.abi);
        transactionResults.push(result);
        
        // Small delay between function calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to execute function ${funcName}: ${error.message}`);
        transactionResults.push({
          txHash: '',
          functionName: funcName,
          gasUsed: 0,
          executionTime: 0,
          success: false,
          error: error.message,
          fees: '0'
        });
      }
    }

    // Calculate aggregated results
    const successfulTxs = transactionResults.filter(tx => tx.success);
    const totalGasUsed = transactionResults.reduce((sum, tx) => sum + tx.gasUsed, 0);
    const totalFees = transactionResults.reduce((sum, tx) => sum + parseFloat(tx.fees), 0);

    return {
      networkId: contract.networkId,
      address: contract.address,
      name: contract.name,
      transactions: {
        totalTransactions: transactionResults.length,
        successfulTransactions: successfulTxs.length,
        failedTransactions: transactionResults.length - successfulTxs.length,
        totalGasUsed: totalGasUsed.toString(),
        totalFees: totalFees.toFixed(6)
      },
      functions: transactionResults.map(tx => ({
        name: tx.functionName,
        gasUsed: tx.gasUsed,
        executionTime: tx.executionTime,
        success: tx.success,
        txHash: tx.txHash,
        error: tx.error
      }))
    };
  }

  private async executeContractFunction(
    contract: ethers.Contract,
    functionName: string,
    abi: any[]
  ): Promise<TransactionResult> {
    const startTime = Date.now();
    
    // Find function in ABI
    const funcAbi = abi.find(item => item.type === 'function' && item.name === functionName);
    if (!funcAbi) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }

    // Generate appropriate parameters for the function
    const params = this.generateFunctionParameters(funcAbi.inputs || []);
    
    this.logger.debug(`Executing ${functionName} with params: ${JSON.stringify(params)}`);

    try {
      // Estimate gas first
      let gasEstimate: bigint;
      try {
        gasEstimate = await contract[functionName].estimateGas(...params);
      } catch (estimateError) {
        this.logger.warn(`Gas estimation failed for ${functionName}, using default: ${estimateError.message}`);
        gasEstimate = BigInt(100000); // Default gas limit
      }

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100);

      // Execute the transaction
      const tx = await contract[functionName](...params, {
        gasLimit: gasLimit,
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxFeePerGas: ethers.parseUnits('20', 'gwei')
      });

      this.logger.debug(`Transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      const endTime = Date.now();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      const gasUsed = Number(receipt.gasUsed);
      const executionTime = endTime - startTime;
      const fees = ethers.formatEther(receipt.gasUsed * receipt.gasPrice || BigInt(0));

      this.logger.log(`Function ${functionName} executed successfully. Gas used: ${gasUsed}, Time: ${executionTime}ms`);

      return {
        txHash: tx.hash,
        functionName,
        gasUsed,
        executionTime,
        success: receipt.status === 1,
        fees
      };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      this.logger.error(`Function ${functionName} failed: ${error.message}`);
      
      return {
        txHash: '',
        functionName,
        gasUsed: 0,
        executionTime,
        success: false,
        error: error.message,
        fees: '0'
      };
    }
  }

  private generateFunctionParameters(inputs: any[]): any[] {
    return inputs.map(input => {
      switch (input.type) {
        case 'address':
          return '0x0000000000000000000000000000000000000001'; // Test address
        case 'uint256':
        case 'uint':
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
            return '1000';
          }
          if (input.type.startsWith('int')) {
            return '1000';
          }
          if (input.type.endsWith('[]')) {
            return []; // Empty array for array types
          }
          return '0x0000000000000000000000000000000000000000'; // Default to zero address
      }
    });
  }
}