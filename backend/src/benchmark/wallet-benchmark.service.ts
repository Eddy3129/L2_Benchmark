import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { NetworkConfig, getNetworkConfig } from '../config/networks';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';
import { extractWritableFunctions } from '@/config/contracts';

interface BenchmarkSession {
  id: string;
  sessionName: string;
  status: string;
  benchmarkConfig: any;
  benchmarkResults: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: any;
}

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
export class WalletBenchmarkService {
  protected readonly logger = new Logger(WalletBenchmarkService.name);

  constructor(
    private dataStorage: DataStorageService,
    private csvExport: CsvExportService
  ) {}

  async executeWalletBenchmark(
    request: WalletBenchmarkRequest,
    progressCallback?: (progress: { stage: string; currentNetwork?: string; currentFunction?: string }) => void
  ): Promise<BenchmarkSession> {
    this.logger.log(`Creating wallet benchmark session for ${request.walletAddress}`);
    
    // Validate wallet address
    if (!ethers.isAddress(request.walletAddress)) {
      throw new Error('Invalid wallet address provided');
    }

    // Since we're moving to frontend execution, this method now just
    // creates a session placeholder. The real execution happens in the frontend.
    progressCallback?.({ stage: 'creating_session' });
    
    // Create benchmark session with placeholder data
    const sessionData = {
      sessionName: `Wallet Benchmark - ${request.contractName}`,
      status: 'pending',
      benchmarkConfig: {
        contractName: request.contractName,
        networks: request.networks,
        totalOperations: 0,
        walletAddress: request.walletAddress,
        useWalletSigning: true,
        signedTransactions: 0
      },
      benchmarkResults: {
        results: {
          contractName: request.contractName,
          networks: request.networks,
          contracts: [],
          executionSummary: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            walletSignedTransactions: 0,
            successRate: 0,
            totalGasUsed: '0',
            avgGasUsed: 0,
            avgExecutionTime: 0
          },
          timestamp: request.timestamp
        },
        avgGasUsed: 0,
        avgExecutionTime: 0
      },
      completedAt: null
    };
    
    return this.dataStorage.create('benchmarkSession', sessionData);
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
    this.logger.log(`Contract ABI exists: ${!!contract.abi}, ABI length: ${contract.abi?.length || 0}`);
    this.logger.log(`Contract data:`, JSON.stringify({ networkId: contract.networkId, address: contract.address, name: contract.name, abiLength: contract.abi?.length }, null, 2));

    // For wallet benchmarking, we simulate the transactions that would be signed
    // In a real implementation, this would integrate with the frontend wallet
    const transactionResults: WalletTransactionResult[] = [];
    
    // Check if ABI exists
    if (!contract.abi || !Array.isArray(contract.abi)) {
      throw new Error(`Contract ABI is missing or invalid for ${contract.address}`);
    }

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
      let gasEstimationSuccess = false;
      
      try {
        if (mockParams.length === 0) {
          gasEstimate = await contractInstance[functionName].estimateGas();
        } else {
          gasEstimate = await contractInstance[functionName].estimateGas(...mockParams);
        }
        gasEstimationSuccess = true;
      } catch (gasError) {
        this.logger.warn(`Gas estimation failed for ${functionName}: ${gasError.message}`);
        
        // For functions with tokenId parameters, try multiple fallback values
        if (mockParams.length >= 2 && funcAbi.inputs.some(input => 
          input.name && (input.name.toLowerCase().includes('tokenid') || input.name.toLowerCase().includes('id'))
        )) {
          const fallbackTokenIds = ['1', '2', '3', '4', '5']; // Try multiple tokenIds
          
          for (const tokenId of fallbackTokenIds) {
            try {
              const fallbackParams = [...mockParams];
              // Find the tokenId parameter and replace it
              const tokenIdIndex = funcAbi.inputs.findIndex(input => 
                input.name && (input.name.toLowerCase().includes('tokenid') || input.name.toLowerCase().includes('id'))
              );
              if (tokenIdIndex !== -1) {
                fallbackParams[tokenIdIndex] = tokenId;
              }
              
              gasEstimate = await contractInstance[functionName].estimateGas(...fallbackParams);
              gasEstimationSuccess = true;
              this.logger.log(`Gas estimation succeeded with tokenId ${tokenId} for ${functionName}`);
              break;
            } catch (fallbackError) {
              // Continue to next tokenId
              continue;
            }
          }
        }
        
        // Final fallback for approve functions specifically
        if (!gasEstimationSuccess && functionName === 'approve' && mockParams.length >= 2) {
          try {
            const fallbackParams = [...mockParams];
            fallbackParams[1] = '0'; // Try tokenId 0
            gasEstimate = await contractInstance[functionName].estimateGas(...fallbackParams);
            gasEstimationSuccess = true;
            this.logger.log(`Gas estimation succeeded with tokenId 0 for ${functionName}`);
          } catch (fallbackError) {
            this.logger.warn(`Final fallback gas estimation also failed for ${functionName}: ${fallbackError.message}`);
            gasEstimate = BigInt(100000); // Final fallback gas estimate
          }
        } else if (!gasEstimationSuccess) {
          gasEstimate = BigInt(100000); // Fallback gas estimate
        }
      }
      
      // Skip functions that failed gas estimation as they likely require specific state
      if (!gasEstimationSuccess) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(`Skipping ${functionName} due to gas estimation failure`);
        return {
          txHash: '',
          functionName,
          gasUsed: 0,
          executionTime,
          success: false,
          error: 'Gas estimation failed - function may require specific contract state',
          fees: '0',
          walletSigned: false,
          networkId: contract.networkId
        };
      }
      
      const executionTime = Date.now() - startTime;
      
      // Get current gas price for fee calculation
      const gasPrice = await provider.getFeeData();
      const effectiveGasPrice = gasPrice.gasPrice || BigInt(20000000000); // 20 gwei fallback
      
      // Calculate fees in ETH
      const feesInWei = gasEstimate * effectiveGasPrice;
      const fees = ethers.formatEther(feesInWei.toString());
      
      // Simulate successful wallet signing if gas estimation succeeded
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
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
    return inputs.map((input, index) => {
      switch (input.type) {
        case 'address':
          return walletAddress;
        case 'uint256':
        case 'uint':
          // For tokenId parameters (common in NFTs), use smaller values that are more likely to exist
          if (input.name && (input.name.toLowerCase().includes('tokenid') || input.name.toLowerCase().includes('id'))) {
            return '0'; // Use tokenId 0 which often exists
          }
          // For amount parameters, use smaller values to avoid overflow and high gas costs
          return '1000000000000000'; // 0.001 token with 18 decimals
        case 'bool':
          return true;
        case 'string':
          return 'test';
        case 'bytes':
          return '0x';
        default:
          if (input.type.startsWith('uint')) {
            // For smaller uint types, use appropriate values
            if (input.name && (input.name.toLowerCase().includes('tokenid') || input.name.toLowerCase().includes('id'))) {
              return '0'; // Use tokenId 0 for better compatibility
            }
            return '100'; // Smaller default values
          }
          return '0x';
      }
    });
  }

  /**
   * Export wallet benchmark sessions to CSV
   */
  async exportWalletBenchmarksToCsv(): Promise<string> {
    const sessions = this.dataStorage.findAll('benchmarkSession', (session) => {
      return session.benchmarkConfig?.useWalletSigning === true;
    });
    return this.csvExport.exportBenchmarkData(sessions);
  }

  /**
   * Get all wallet benchmark sessions
   */
  async getWalletBenchmarkSessions(): Promise<BenchmarkSession[]> {
    return this.dataStorage.findAll('benchmarkSession', (session) => {
      return session.benchmarkConfig?.useWalletSigning === true;
    });
  }

  /**
   * Get wallet benchmark session by ID
   */
  async getWalletBenchmarkSession(id: string): Promise<BenchmarkSession | null> {
    const session = this.dataStorage.findById('benchmarkSession', id);
    if (session && session.benchmarkConfig?.useWalletSigning === true) {
      return session;
    }
    return null;
  }
}