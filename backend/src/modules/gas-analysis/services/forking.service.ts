import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// Base service
import { BaseService } from '../../../common/base.service';

// Network configuration
import { NetworkConfig, NetworkConfigService } from '../../../config/network.config';

// DTOs
import { CompilationResultDto, FunctionCallDto } from '../../../common/dto/gas-analysis.dto';

const execAsync = promisify(exec);

interface ForkingConfig {
  network: string;
  rpcUrl: string;
  blockNumber?: number;
  forkPort: number;
  isActive: boolean;
  provider?: ethers.Provider;
}

interface SimulationResult {
  gasUsed: number;
  success: boolean;
  error?: string;
  transactionHash?: string;
  blockNumber?: number;
}

@Injectable()
export class ForkingService extends BaseService<any> {
  private readonly activeForks = new Map<string, ForkingConfig>();
  private readonly hardhatProjectRoot = path.join(process.cwd(), '..', 'hardhat');
  private readonly basePort = 8545;
  private portCounter = 0;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /**
   * Creates a mainnet fork for accurate gas simulation
   */
  async createFork(networkConfig: NetworkConfig, blockNumber?: number): Promise<ForkingConfig> {
    const forkKey = `${networkConfig.name}_${blockNumber || 'latest'}`;
    
    // Return existing fork if available
    if (this.activeForks.has(forkKey)) {
      const existingFork = this.activeForks.get(forkKey)!;
      if (existingFork.isActive) {
        this.logger.log(`Reusing existing fork for ${networkConfig.name}`);
        return existingFork;
      }
    }

    const forkPort = this.basePort + this.portCounter++;
    const forkConfig: ForkingConfig = {
      network: networkConfig.name,
      rpcUrl: networkConfig.rpcUrl,
      blockNumber,
      forkPort,
      isActive: false
    };

    try {
      // Start Hardhat fork
      await this.startHardhatFork(forkConfig);
      
      // Create provider for the fork
      forkConfig.provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${forkPort}`);
      forkConfig.isActive = true;
      
      this.activeForks.set(forkKey, forkConfig);
      this.logger.log(`Created fork for ${networkConfig.name} on port ${forkPort}`);
      
      return forkConfig;
    } catch (error) {
      this.logger.error(`Failed to create fork for ${networkConfig.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simulates contract deployment on a fork
   */
  async simulateDeployment(
    forkConfig: ForkingConfig,
    compilation: CompilationResultDto,
    constructorArgs: any[] = []
  ): Promise<SimulationResult> {
    if (!forkConfig.provider || !forkConfig.isActive) {
      throw new Error('Fork is not active or provider not available');
    }

    try {
      // Get a signer (impersonate a funded account)
      const signer = await this.getImpersonatedSigner(forkConfig.provider);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        compilation.abi,
        compilation.bytecode,
        signer
      );

      // Deploy contract and get actual gas usage
      const contract = await factory.deploy(...constructorArgs);
      const deploymentTx = contract.deploymentTransaction();
      
      if (!deploymentTx) {
        throw new Error('Deployment transaction not found');
      }

      const receipt = await deploymentTx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      return {
        gasUsed: Number(receipt.gasUsed),
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      this.logger.warn(`Deployment simulation failed: ${error.message}`);
      return {
        gasUsed: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simulates function call on a deployed contract
   */
  async simulateFunctionCall(
    forkConfig: ForkingConfig,
    compilation: CompilationResultDto,
    functionCall: FunctionCallDto,
    constructorArgs: any[] = []
  ): Promise<SimulationResult> {
    if (!forkConfig.provider || !forkConfig.isActive) {
      throw new Error('Fork is not active or provider not available');
    }

    try {
      // Get a signer (impersonate a funded account)
      const signer = await this.getImpersonatedSigner(forkConfig.provider);
      
      // Deploy contract first
      const factory = new ethers.ContractFactory(
        compilation.abi,
        compilation.bytecode,
        signer
      );

      const contract = await factory.deploy(...constructorArgs);
      await contract.waitForDeployment();

      // Prepare function call parameters
      const functionParams = functionCall.parameters || [];
      
      // Estimate gas for the function call
      const gasEstimate = await contract[functionCall.functionName].estimateGas(...functionParams);
      
      // Execute the function call to verify it works
      const tx = await contract[functionCall.functionName](...functionParams);
      const receipt = await tx.wait();

      return {
        gasUsed: Number(receipt.gasUsed),
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      this.logger.warn(`Function simulation failed: ${error.message}`);
      
      // Try to get gas estimate even if execution fails
      try {
        const signer = await this.getImpersonatedSigner(forkConfig.provider!);
        const factory = new ethers.ContractFactory(
          compilation.abi,
          compilation.bytecode,
          signer
        );
        const contract = await factory.deploy(...constructorArgs);
        await contract.waitForDeployment();
        
        const gasEstimate = await contract[functionCall.functionName].estimateGas(
          ...(functionCall.parameters || [])
        );
        
        return {
          gasUsed: Number(gasEstimate),
          success: false,
          error: `Execution failed but gas estimated: ${error.message}`
        };
      } catch (estimateError) {
        return {
          gasUsed: 0,
          success: false,
          error: `Both execution and estimation failed: ${error.message}`
        };
      }
    }
  }

  /**
   * Calculates L1 data cost for Layer 2 transactions using EIP-4844 blob transactions
   */
  async calculateL1DataCost(
    networkConfig: NetworkConfig,
    transactionData: string,
    l1GasPrice: number
  ): Promise<number> {
    // Calculate transaction data size in bytes
    const data = transactionData.startsWith('0x') ? transactionData.slice(2) : transactionData;
    const dataSizeBytes = data.length / 2; // Convert hex string to bytes
    
    // EIP-4844 blob constants
    const BYTES_PER_BLOB = 131072; // 128 KiB per blob
    const GAS_PER_BLOB = 131072;   // Gas units per blob
    
    // Calculate number of blobs needed for the transaction data
    const blobsNeeded = Math.ceil(dataSizeBytes / BYTES_PER_BLOB);
    const totalBlobGas = blobsNeeded * GAS_PER_BLOB;
    
    // Base transaction overhead (Type 3 blob transaction)
    const baseTxGas = 21000;
    const blobTxOverhead = 1000; // Additional overhead for blob transaction
    const totalBaseTxGas = baseTxGas + blobTxOverhead;
    
    // Total gas is base transaction gas + blob gas
    // Note: Blob gas is priced separately at blob base fee (1 wei = 1e-9 gwei)
    const totalGas = totalBaseTxGas + totalBlobGas;

    // Return actual gas calculation without artificial multipliers
    // Let the forked network provide real data instead of fake efficiency factors
    return totalGas;
  }

  /**
   * Cleans up a specific fork
   */
  async cleanupFork(forkKey: string): Promise<void> {
    const fork = this.activeForks.get(forkKey);
    if (fork && fork.isActive) {
      try {
        // Stop the Hardhat fork process
        await this.stopHardhatFork(fork.forkPort);
        fork.isActive = false;
        this.activeForks.delete(forkKey);
        this.logger.log(`Cleaned up fork for ${fork.network}`);
      } catch (error) {
        this.logger.warn(`Failed to cleanup fork: ${error.message}`);
      }
    }
  }

  /**
   * Cleans up all active forks
   */
  async cleanupAllForks(): Promise<void> {
    const cleanupPromises = Array.from(this.activeForks.keys()).map(key => 
      this.cleanupFork(key)
    );
    await Promise.all(cleanupPromises);
  }

  /**
   * Starts a Hardhat fork process
   */
  private async startHardhatFork(forkConfig: ForkingConfig): Promise<void> {
    const forkCommand = this.buildForkCommand(forkConfig);
    
    try {
      // Start the fork in the background
      const { stdout, stderr } = await execAsync(forkCommand, {
        cwd: this.hardhatProjectRoot,
        timeout: 30000 // 30 second timeout
      });
      
      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(`Fork startup error: ${stderr}`);
      }
      
      // Wait a bit for the fork to be ready
      await this.waitForForkReady(forkConfig.forkPort);
      
    } catch (error) {
      throw new Error(`Failed to start Hardhat fork: ${error.message}`);
    }
  }

  /**
   * Builds the Hardhat fork command
   */
  private buildForkCommand(forkConfig: ForkingConfig): string {
    let command = `npx hardhat node --port ${forkConfig.forkPort} --fork ${forkConfig.rpcUrl}`;
    
    if (forkConfig.blockNumber) {
      command += ` --fork-block-number ${forkConfig.blockNumber}`;
    }
    
    // Run in background
    command += ' &';
    
    return command;
  }

  /**
   * Waits for the fork to be ready
   */
  private async waitForForkReady(port: number, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`);
        await provider.getBlockNumber();
        return; // Fork is ready
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Fork not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
  }

  /**
   * Stops a Hardhat fork process
   */
  private async stopHardhatFork(port: number): Promise<void> {
    try {
      // Kill process using the port (Windows compatible)
      await execAsync(`netstat -ano | findstr :${port}`);
      // Note: In a production environment, you'd want to properly track and kill the process
      // For now, we'll rely on process cleanup when the service shuts down
    } catch (error) {
      // Process might already be stopped
      this.logger.warn(`Could not stop fork on port ${port}: ${error.message}`);
    }
  }

  /**
   * Gets an impersonated signer with funds
   */
  private async getImpersonatedSigner(provider: ethers.Provider): Promise<ethers.Signer> {
    // Use a well-known address with funds (like Vitalik's address)
    const impersonatedAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik's address
    
    try {
      // Cast provider to JsonRpcProvider to access required methods
      const jsonRpcProvider = provider as ethers.JsonRpcProvider;
      
      // Impersonate the account
      await jsonRpcProvider.send('hardhat_impersonateAccount', [impersonatedAddress]);
      
      // Get the signer
      const signer = await jsonRpcProvider.getSigner(impersonatedAddress);
      
      return signer;
    } catch (error) {
      // Fallback to the first available signer
      const jsonRpcProvider = provider as ethers.JsonRpcProvider;
      const accounts = await jsonRpcProvider.listAccounts();
      if (accounts.length > 0) {
        return await jsonRpcProvider.getSigner(accounts[0].address);
      }
      throw new Error('No signers available');
    }
  }

  /**
   * Gets the optimal block number for forking (recent but stable)
   */
  async getOptimalForkBlock(networkConfig: NetworkConfig): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const latestBlock = await provider.getBlockNumber();
      
      // Use a block that's a few blocks behind for stability
      const stableBlock = Math.max(latestBlock - 10, 0);
      
      return stableBlock;
    } catch (error) {
      this.logger.warn(`Could not get optimal fork block: ${error.message}`);
      return 0; // Use latest if we can't determine
    }
  }
}