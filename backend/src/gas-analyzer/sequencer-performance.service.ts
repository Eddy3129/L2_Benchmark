import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SequencerPerformanceTest } from './sequencer-performance.entity';
import { ethers } from 'ethers';
import { NetworkConfigService } from '../shared/network-config';
import { BaseService } from '../shared/base.service';
import { ValidationUtils } from '../shared/validation-utils';

interface SequencerTestConfig {
  l2Network: string;
  testType: 'low_fee_test' | 'stuck_transaction_test' | 'fee_market_stress';
  lowFeeTransactionCount: number;
  normalFeeTransactionCount: number;
  minPriorityFeePerGas: string; // in wei
  normalPriorityFeePerGas: string; // in wei
  testDurationSeconds: number;
  parallelAccountsUsed: number;
}

interface TransactionResult {
  txHash: string;
  nonce: number;
  maxPriorityFeePerGas: string;
  submittedAt: Date;
  confirmedAt: Date | null;
  blockNumber: number | null;
  gasUsed: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'dropped';
  confirmationLatencyMs: number | null;
}

@Injectable()
export class SequencerPerformanceService extends BaseService<SequencerPerformanceTest> {
  protected readonly logger = new Logger(SequencerPerformanceService.name);

  constructor(
    @InjectRepository(SequencerPerformanceTest)
    private sequencerTestRepository: Repository<SequencerPerformanceTest>,
  ) {
    super(sequencerTestRepository, 'SequencerPerformanceTest');
  }

  async runSequencerPerformanceTest(config: SequencerTestConfig): Promise<SequencerPerformanceTest> {
    this.logger.log(`Starting sequencer performance test for ${config.l2Network}`);
    
    // Validate network configuration
    const networkConfig = NetworkConfigService.getNetworkConfig(config.l2Network);
    if (!networkConfig) {
      throw ValidationUtils.createValidationError([`Invalid network: ${config.l2Network}`]);
    }

    const sessionId = `seq-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create initial test record
    const testRecord = this.sequencerTestRepository.create({
      sessionId,
      l2Network: config.l2Network,
      testType: config.testType,
      status: 'running',
      testConfiguration: {
        lowFeeTransactionCount: config.lowFeeTransactionCount,
        normalFeeTransactionCount: config.normalFeeTransactionCount,
        minPriorityFeePerGas: config.minPriorityFeePerGas,
        normalPriorityFeePerGas: config.normalPriorityFeePerGas,
        testDurationSeconds: config.testDurationSeconds,
        parallelAccountsUsed: config.parallelAccountsUsed,
      },
      transactionResults: {
        lowFeeTransactions: [],
        normalFeeTransactions: [],
      },
      performanceMetrics: {
        inclusionRate: { lowFeeTransactions: 0, normalFeeTransactions: 0 },
        confirmationLatency: { lowFeeAvgMs: 0, normalFeeAvgMs: 0, latencyDifferenceMs: 0, latencyRatio: 0 },
        parallelProcessingCapability: { tested: false, sequencerSupportsParallelProcessing: false, parallelProcessingEfficiency: 0 },
        censorshipResistanceScore: 0,
      },
      totalTestCostUSD: 0,
    });

    const savedTest = await this.sequencerTestRepository.save(testRecord);

    // Start test execution asynchronously for real-time updates
    this.executeTestAsync(savedTest, networkConfig, config).catch(error => {
      this.logger.error(`Async test execution failed: ${error.message}`);
      savedTest.status = 'failed';
      savedTest.notes = `Test failed: ${error.message}`;
      this.sequencerTestRepository.save(savedTest);
    });

    return savedTest;
  }

  private async executeTestAsync(
    testRecord: SequencerPerformanceTest,
    networkConfig: any,
    config: SequencerTestConfig
  ): Promise<void> {
    try {
      // Execute the specific test type
      switch (config.testType) {
        case 'low_fee_test':
          await this.executeLowFeeTest(testRecord, networkConfig, config);
          break;
        case 'stuck_transaction_test':
          await this.executeStuckTransactionTest(testRecord, networkConfig, config);
          break;
        case 'fee_market_stress':
          await this.executeFeeMarketStressTest(testRecord, networkConfig, config);
          break;
      }

      // Calculate final metrics
      await this.calculatePerformanceMetrics(testRecord);
      
      // Mark as completed
      testRecord.status = 'completed';
      testRecord.completedAt = new Date();
      await this.sequencerTestRepository.save(testRecord);

    } catch (error) {
      this.logger.error(`Sequencer test failed: ${error.message}`);
      testRecord.status = 'failed';
      testRecord.notes = `Test failed: ${error.message}`;
      await this.sequencerTestRepository.save(testRecord);
      throw error;
    }
  }

  private async executeLowFeeTest(
    testRecord: SequencerPerformanceTest,
    networkConfig: any,
    config: SequencerTestConfig
  ): Promise<void> {
    this.logger.log('Executing low fee transaction test');
    
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    if (!process.env.TEST_WALLET_PRIVATE_KEY) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable is required for sequencer tests');
    }
    
    const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider);
    this.logger.log(`Using funded test wallet: ${wallet.address}`);
    
    // Get current nonce and manage it manually to avoid conflicts
    let currentNonce = await wallet.getNonce();
    this.logger.log(`Starting nonce: ${currentNonce}`);
    
    const lowFeeTransactions: TransactionResult[] = [];
    const normalFeeTransactions: TransactionResult[] = [];
    
    // Submit low fee transactions
    for (let i = 0; i < config.lowFeeTransactionCount; i++) {
      const tx = await this.submitTestTransaction(wallet, {
        maxPriorityFeePerGas: config.minPriorityFeePerGas,
        type: 'low_fee',
        nonce: currentNonce
      });
      lowFeeTransactions.push(tx);
      currentNonce++;
    }
    
    // Submit normal fee transactions
    for (let i = 0; i < config.normalFeeTransactionCount; i++) {
      const tx = await this.submitTestTransaction(wallet, {
        maxPriorityFeePerGas: config.normalPriorityFeePerGas,
        type: 'normal_fee',
        nonce: currentNonce
      });
      normalFeeTransactions.push(tx);
      currentNonce++;
    }
    
    // Save transactions immediately so frontend can see them during monitoring
    testRecord.transactionResults = {
      ...testRecord.transactionResults,
      lowFeeTransactions: lowFeeTransactions,
      normalFeeTransactions: normalFeeTransactions
    };
    
    this.logger.log(`[DEBUG] Saving ${lowFeeTransactions.length} low-fee and ${normalFeeTransactions.length} normal-fee transactions`);
    await this.sequencerTestRepository.save(testRecord);
    
    // Verify the save worked by re-fetching
    const verifyRecord = await this.sequencerTestRepository.findOne({ where: { sessionId: testRecord.sessionId } });
    this.logger.log(`[DEBUG] Verification: saved ${verifyRecord?.transactionResults?.lowFeeTransactions?.length || 0} low-fee and ${verifyRecord?.transactionResults?.normalFeeTransactions?.length || 0} normal-fee transactions`);
    
    // Monitor transactions for the test duration
    await this.monitorTransactions(
      testRecord,
      [...lowFeeTransactions, ...normalFeeTransactions],
      config.testDurationSeconds
    );
    
    // Save final results after monitoring
    await this.sequencerTestRepository.save(testRecord);
  }

  private async executeStuckTransactionTest(
    testRecord: SequencerPerformanceTest,
    networkConfig: any,
    config: SequencerTestConfig
  ): Promise<void> {
    this.logger.log('Executing stuck transaction test');
    
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    if (!process.env.TEST_WALLET_PRIVATE_KEY) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable is required for sequencer tests');
    }
    
    const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider);
    this.logger.log(`Using funded test wallet: ${wallet.address}`);
    
    // Get current nonce and manage it manually to avoid conflicts
    let currentNonce = await wallet.getNonce();
    this.logger.log(`Starting nonce: ${currentNonce}`);
    
    // Submit a low-fee transaction with very low fee (this will get "stuck")
    const stuckTx = await this.submitTestTransaction(wallet, {
      maxPriorityFeePerGas: config.minPriorityFeePerGas,
      type: 'stuck',
      nonce: currentNonce
    });
    currentNonce++;
    
    // Submit burst of normal transactions with sequential nonces
    const parallelTxHashes: string[] = [];
    for (let i = 0; i < config.normalFeeTransactionCount; i++) {
      const tx = await this.submitTestTransaction(wallet, {
        maxPriorityFeePerGas: config.normalPriorityFeePerGas,
        type: 'parallel',
        nonce: currentNonce
      });
      parallelTxHashes.push(tx.txHash);
      currentNonce++;
    }
    
    // Monitor for parallel processing capability
    const parallelTxConfirmed = await this.countConfirmedTransactions(parallelTxHashes, 30000); // 30 second timeout
    const sequencerBlockedParallelProcessing = parallelTxConfirmed === 0;
    
    testRecord.transactionResults.stuckTransactionTest = {
      stuckTxHash: stuckTx.txHash,
      stuckTxNonce: stuckTx.nonce,
      parallelTxHashes,
      parallelTxConfirmed,
      sequencerBlockedParallelProcessing,
    };
    
    await this.sequencerTestRepository.save(testRecord);
  }

  private async executeFeeMarketStressTest(
    testRecord: SequencerPerformanceTest,
    networkConfig: any,
    config: SequencerTestConfig
  ): Promise<void> {
    this.logger.log('Executing fee market stress test');
    
    // This test gradually increases fees to find the minimum inclusion threshold
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    if (!process.env.TEST_WALLET_PRIVATE_KEY) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable is required for sequencer tests');
    }
    
    const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider);
    this.logger.log(`Using funded test wallet: ${wallet.address}`);
    
    // Get current nonce and manage it manually to avoid conflicts
    let currentNonce = await wallet.getNonce();
    this.logger.log(`Starting nonce: ${currentNonce}`);
    
    const feeSteps = this.generateFeeSteps(config.minPriorityFeePerGas, config.normalPriorityFeePerGas, 10);
    const allTransactions: TransactionResult[] = [];
    
    for (const feeStep of feeSteps) {
      const tx = await this.submitTestTransaction(wallet, {
        maxPriorityFeePerGas: feeStep,
        type: 'fee_step',
        nonce: currentNonce
      });
      allTransactions.push(tx);
      currentNonce++;
      
      // Small delay between submissions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Save transactions immediately so frontend can see them during monitoring
    const lowFeeTransactions = allTransactions.filter(tx => 
      BigInt(tx.maxPriorityFeePerGas) < BigInt(config.normalPriorityFeePerGas)
    );
    const normalFeeTransactions = allTransactions.filter(tx => 
      BigInt(tx.maxPriorityFeePerGas) >= BigInt(config.normalPriorityFeePerGas)
    );
    
    testRecord.transactionResults = {
      ...testRecord.transactionResults,
      lowFeeTransactions: lowFeeTransactions,
      normalFeeTransactions: normalFeeTransactions
    };
    
    this.logger.log(`[DEBUG] Fee market test: Saving ${lowFeeTransactions.length} low-fee and ${normalFeeTransactions.length} normal-fee transactions`);
    await this.sequencerTestRepository.save(testRecord);
    
    // Verify the save worked by re-fetching
    const verifyRecord = await this.sequencerTestRepository.findOne({ where: { sessionId: testRecord.sessionId } });
    this.logger.log(`[DEBUG] Fee market verification: saved ${verifyRecord?.transactionResults?.lowFeeTransactions?.length || 0} low-fee and ${verifyRecord?.transactionResults?.normalFeeTransactions?.length || 0} normal-fee transactions`);
    
    await this.monitorTransactions(testRecord, allTransactions, config.testDurationSeconds);
    
    // Save final results after monitoring
    await this.sequencerTestRepository.save(testRecord);
  }

  private async submitTestTransaction(
    wallet: ethers.HDNodeWallet | ethers.Wallet,
    options: {
      maxPriorityFeePerGas: string;
      type: string;
      nonce?: number;
    }
  ): Promise<TransactionResult> {
    const submittedAt = new Date();
    const nonce = options.nonce ?? await wallet.getNonce();
    
    try {
      this.logger.debug(`Submitting ${options.type} transaction with nonce ${nonce}`);
      
      // Check wallet balance before submitting
      if (!wallet.provider) {
        throw new Error('Wallet provider is not available');
      }
      
      const balance = await wallet.provider.getBalance(wallet.address);
      const requiredAmount = ethers.parseEther('0.002'); // 0.001 ETH + gas costs
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance: ${ethers.formatEther(balance)} ETH, required: ${ethers.formatEther(requiredAmount)} ETH`);
      }
      
      // Estimate gas limit dynamically to avoid 'intrinsic gas too low' errors
      let gasLimit: bigint;
      try {
        const gasEstimate = await wallet.provider.estimateGas({
          to: wallet.address,
          value: ethers.parseEther('0.0001'),
          from: wallet.address
        });
        
        // Use estimated gas with a 20% buffer for safety
        gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100);
        this.logger.debug(`Gas estimated: ${gasEstimate}, using: ${gasLimit}`);
      } catch (gasEstimateError) {
        // Fallback to a higher default gas limit if estimation fails
        gasLimit = BigInt(25000);
        this.logger.warn(`Gas estimation failed, using fallback: ${gasLimit}. Error: ${gasEstimateError.message}`);
      }
      
      const tx = await wallet.sendTransaction({
        to: wallet.address, // Self-transfer for testing
        value: ethers.parseEther('0.0001'), // Reduced amount to preserve funds
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        maxFeePerGas: ethers.parseUnits('50', 'gwei'), // Higher base fee for better inclusion
        gasLimit: gasLimit,
        nonce: nonce,
      });
      
      this.logger.debug(`Successfully submitted ${options.type} transaction: ${tx.hash} with nonce ${tx.nonce}`);
      
      return {
        txHash: tx.hash,
        nonce: tx.nonce,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        submittedAt,
        confirmedAt: null,
        blockNumber: null,
        gasUsed: null,
        status: 'pending',
        confirmationLatencyMs: null,
      };
    } catch (error) {
      this.logger.error(`Failed to submit ${options.type} transaction with nonce ${nonce}: ${error.message}`);
      
      // Check if it's a nonce-related error
      if (error.message.includes('nonce') || error.message.includes('NONCE')) {
        this.logger.warn(`Nonce conflict detected for ${options.type} transaction. This may indicate concurrent transaction submission.`);
      }
      
      // Check if it's a balance-related error
      if (error.message.includes('insufficient') || error.message.includes('balance')) {
        this.logger.error(`Insufficient funds for ${options.type} transaction. Please fund the test wallet.`);
      }
      
      // Check if it's a gas-related error
      if (error.message.includes('intrinsic gas too low') || error.message.includes('gas')) {
        this.logger.error(`Gas-related error for ${options.type} transaction. This may indicate network-specific gas requirements or estimation issues.`);
      }
      
      return {
        txHash: '',
        nonce: nonce,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
        submittedAt,
        confirmedAt: null,
        blockNumber: null,
        gasUsed: null,
        status: 'failed',
        confirmationLatencyMs: null,
      };
    }
  }

  private async monitorTransactions(
    testRecord: SequencerPerformanceTest,
    transactions: TransactionResult[],
    timeoutSeconds: number
  ): Promise<void> {
    const provider = new ethers.JsonRpcProvider(
      NetworkConfigService.getNetworkConfig(testRecord.l2Network)?.rpcUrl
    );
    
    const endTime = Date.now() + (timeoutSeconds * 1000);
    let hasUpdates = false;
    
    this.logger.log(`Starting real-time monitoring of ${transactions.length} transactions for ${timeoutSeconds} seconds`);
    
    while (Date.now() < endTime) {
      hasUpdates = false;
      
      for (const tx of transactions) {
        if (tx.status === 'pending' && tx.txHash) {
          try {
            const receipt = await provider.getTransactionReceipt(tx.txHash);
            if (receipt) {
              tx.confirmedAt = new Date();
              tx.blockNumber = receipt.blockNumber;
              tx.gasUsed = receipt.gasUsed.toString();
              tx.status = receipt.status === 1 ? 'confirmed' : 'failed';
              tx.confirmationLatencyMs = tx.confirmedAt.getTime() - tx.submittedAt.getTime();
              hasUpdates = true;
              
              this.logger.log(`Transaction ${tx.txHash} confirmed in ${tx.confirmationLatencyMs}ms (block ${tx.blockNumber})`);
            }
          } catch (error) {
            // Transaction might be dropped or not yet available
            this.logger.debug(`Error checking transaction ${tx.txHash}: ${error.message}`);
          }
        }
      }
      
      // Save real-time updates to database immediately
      if (hasUpdates) {
        await this.sequencerTestRepository.save(testRecord);
        
        // Calculate and update metrics in real-time
        await this.calculatePerformanceMetrics(testRecord);
      }
      
      // Check if all transactions are confirmed or failed (no more pending)
      const pendingTransactions = transactions.filter(tx => tx.status === 'pending');
      if (pendingTransactions.length === 0) {
        this.logger.log(`All transactions completed. Stopping monitoring early.`);
        break;
      }
      
      // Check every 1 second for faster real-time updates
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Mark remaining pending transactions as dropped
    let finalUpdates = false;
    transactions.forEach(tx => {
      if (tx.status === 'pending') {
        tx.status = 'dropped';
        finalUpdates = true;
        this.logger.warn(`Transaction ${tx.txHash} marked as dropped after timeout`);
      }
    });
    
    if (finalUpdates) {
      await this.sequencerTestRepository.save(testRecord);
    }
    
    this.logger.log(`Monitoring completed. Final status: ${transactions.filter(tx => tx.status === 'confirmed').length}/${transactions.length} confirmed`);
  }

  private async calculatePerformanceMetrics(testRecord: SequencerPerformanceTest): Promise<void> {
    const { lowFeeTransactions, normalFeeTransactions } = testRecord.transactionResults;
    
    // Calculate inclusion rates with safe division
    const lowFeeInclusionRate = lowFeeTransactions.length > 0 
      ? (lowFeeTransactions.filter(tx => tx.status === 'confirmed').length / lowFeeTransactions.length) * 100
      : 0;
    const normalFeeInclusionRate = normalFeeTransactions.length > 0
      ? (normalFeeTransactions.filter(tx => tx.status === 'confirmed').length / normalFeeTransactions.length) * 100
      : 0;
    
    // Calculate average confirmation latencies
    const lowFeeConfirmedTxs = lowFeeTransactions.filter(tx => tx.confirmationLatencyMs !== null);
    const normalFeeConfirmedTxs = normalFeeTransactions.filter(tx => tx.confirmationLatencyMs !== null);
    
    const lowFeeAvgMs = lowFeeConfirmedTxs.length > 0 
      ? lowFeeConfirmedTxs.reduce((sum, tx) => sum + (tx.confirmationLatencyMs || 0), 0) / lowFeeConfirmedTxs.length
      : 0;
    
    const normalFeeAvgMs = normalFeeConfirmedTxs.length > 0
      ? normalFeeConfirmedTxs.reduce((sum, tx) => sum + (tx.confirmationLatencyMs || 0), 0) / normalFeeConfirmedTxs.length
      : 0;
    
    const latencyDifferenceMs = lowFeeAvgMs - normalFeeAvgMs;
    const latencyRatio = normalFeeAvgMs > 0 ? lowFeeAvgMs / normalFeeAvgMs : 0;
    
    // Calculate parallel processing capability
    const stuckTest = testRecord.transactionResults.stuckTransactionTest;
    const parallelProcessingTested = !!stuckTest;
    const sequencerSupportsParallelProcessing = stuckTest ? !stuckTest.sequencerBlockedParallelProcessing : false;
    
    // For non-stuck transaction tests, estimate parallel processing based on transaction confirmation patterns
    let parallelProcessingEfficiency = 0;
    if (stuckTest) {
      parallelProcessingEfficiency = (stuckTest.parallelTxConfirmed / stuckTest.parallelTxHashes.length) * 100;
    } else {
      // Estimate parallel processing capability based on how many transactions were confirmed simultaneously
      // This is a simplified heuristic - in reality, we'd need more sophisticated analysis
      const allTransactions = [...lowFeeTransactions, ...normalFeeTransactions];
      const confirmedTransactions = allTransactions.filter(tx => tx.status === 'confirmed');
      
      if (allTransactions.length > 0) {
        // If most transactions were confirmed, assume good parallel processing
        parallelProcessingEfficiency = (confirmedTransactions.length / allTransactions.length) * 100;
      }
    }
    
    // Calculate censorship resistance score (0-100)
    const censorshipResistanceScore = this.calculateCensorshipResistanceScore(
      lowFeeInclusionRate,
      latencyRatio,
      sequencerSupportsParallelProcessing
    );
    
    // Calculate total test cost in USD (simplified calculation)
    const totalTestCostUSD = await this.calculateTestCost(lowFeeTransactions, normalFeeTransactions, testRecord.l2Network);
    
    testRecord.performanceMetrics = {
      inclusionRate: {
        lowFeeTransactions: lowFeeInclusionRate,
        normalFeeTransactions: normalFeeInclusionRate,
      },
      confirmationLatency: {
        lowFeeAvgMs,
        normalFeeAvgMs,
        latencyDifferenceMs,
        latencyRatio,
      },
      parallelProcessingCapability: {
        tested: parallelProcessingTested,
        sequencerSupportsParallelProcessing,
        parallelProcessingEfficiency,
      },
      censorshipResistanceScore,
    };
    
    testRecord.totalTestCostUSD = totalTestCostUSD;
    
    await this.sequencerTestRepository.save(testRecord);
  }

  private calculateCensorshipResistanceScore(
    inclusionRate: number,
    latencyRatio: number,
    supportsParallelProcessing: boolean
  ): number {
    // Weighted scoring algorithm
    let score = 0;
    
    // Inclusion rate (40% weight)
    score += (inclusionRate / 100) * 40;
    
    // Latency fairness (30% weight) - lower ratio is better
    const latencyScore = latencyRatio <= 1.5 ? 30 : Math.max(0, 30 - ((latencyRatio - 1.5) * 10));
    score += latencyScore;
    
    // Parallel processing (30% weight)
    score += supportsParallelProcessing ? 30 : 0;
    
    return Math.min(100, Math.max(0, score));
  }

  private async calculateTestCost(
    lowFeeTransactions: any[],
    normalFeeTransactions: any[],
    l2Network: string
  ): Promise<number> {
    try {
      const allTransactions = [...lowFeeTransactions, ...normalFeeTransactions];
      const confirmedTransactions = allTransactions.filter(tx => tx.status === 'confirmed' && tx.gasUsed);
      
      if (confirmedTransactions.length === 0) {
        return 0;
      }
      
      // Calculate total gas cost in wei
      let totalCostWei = BigInt(0);
      
      for (const tx of confirmedTransactions) {
        const gasUsed = BigInt(tx.gasUsed || '0');
        const maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas || '0');
        const txCost = gasUsed * maxPriorityFeePerGas;
        totalCostWei += txCost;
      }
      
      // Convert wei to ETH
      const totalCostETH = Number(totalCostWei) / Math.pow(10, 18);
      
      // For simplicity, assume 1 ETH = $2000 USD (in a real implementation, you'd fetch current price)
      const ethToUsdRate = 2000;
      const totalCostUSD = totalCostETH * ethToUsdRate;
      
      return Math.round(totalCostUSD * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      this.logger.error(`Error calculating test cost: ${error.message}`);
      return 0;
    }
  }

  private generateFeeSteps(minFee: string, maxFee: string, steps: number): string[] {
    const minBigInt = BigInt(minFee);
    const maxBigInt = BigInt(maxFee);
    const stepSize = (maxBigInt - minBigInt) / BigInt(steps);
    
    const feeSteps: string[] = [];
    for (let i = 0; i < steps; i++) {
      feeSteps.push((minBigInt + (stepSize * BigInt(i))).toString());
    }
    
    return feeSteps;
  }

  private async fundTestWallet(wallet: ethers.HDNodeWallet | ethers.Wallet, networkConfig: any): Promise<void> {
    // This would need to be implemented based on the specific network
    // For testnets, this might involve calling a faucet API
    // For local networks, this might involve transferring from a funded account
    this.logger.log(`Funding test wallet ${wallet.address} on ${networkConfig.name}`);
    // Implementation would depend on the specific network and available funding mechanisms
  }

  private async countConfirmedTransactions(txHashes: string[], timeoutMs: number): Promise<number> {
    // Implementation to count how many transactions get confirmed within the timeout
    return 0; // Placeholder
  }

  async getSequencerPerformanceHistory(limit: number = 50): Promise<SequencerPerformanceTest[]> {
    return this.sequencerTestRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSequencerPerformanceByNetwork(network: string): Promise<SequencerPerformanceTest[]> {
    return this.sequencerTestRepository.find({
      where: { l2Network: network },
      order: { createdAt: 'DESC' },
    });
  }

  // Methods called by the controller
  async runPerformanceTest(config: SequencerTestConfig): Promise<SequencerPerformanceTest> {
    return this.runSequencerPerformanceTest(config);
  }

  async getTestHistory(limit: number = 50): Promise<SequencerPerformanceTest[]> {
    return this.getSequencerPerformanceHistory(limit);
  }

  async getTestResult(sessionId: string): Promise<SequencerPerformanceTest | null> {
    const result = await this.sequencerTestRepository.findOne({
      where: { sessionId },
      // Note: transactionResults is stored as JSON in the entity, so no relations needed
      // The data should be automatically loaded with the entity
    });
    
    if (result) {
      this.logger.debug(`Retrieved test result for session ${sessionId}: status=${result.status}, lowFee=${result.transactionResults?.lowFeeTransactions?.length || 0}, normalFee=${result.transactionResults?.normalFeeTransactions?.length || 0}`);
    } else {
      this.logger.warn(`No test result found for session ${sessionId}`);
    }
    
    return result;
  }
}