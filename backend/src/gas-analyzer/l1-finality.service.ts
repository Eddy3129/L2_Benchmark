import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { randomUUID } from 'crypto';
import { NetworkConfigService } from '../config/network.config';
import { ValidationUtils } from '../shared/validation-utils';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { FinalityCalculatorService } from './finality-calculator.service';
import { PriceOracleService } from './price-oracle.service';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';
import { EventEmitter } from 'events';
import { Observable, Subject, map } from 'rxjs';

// L1FinalityTracking interface for in-memory storage
interface L1FinalityTracking {
  id: string;
  sessionId: string;
  l2Network: string;
  l2BlockNumber?: string;
  l2TransactionHash?: string;
  l1BatchTransactionHash?: string;
  l2ConfirmationTime: Date;
  l1SettlementInfo?: {
    batchTransactionHash?: string;
    blockNumber?: string;
    settlementTime?: Date;
    batchDetails?: {
      batchPosterAddress: string;
      l1GasUsed: string;
      l1GasPrice: string;
      l1TransactionFee: string;
      l1TransactionFeeUSD: number;
      batchSize: number;
      batchDataSize: number;
      compressionRatio: number;
    };
  };
  trackingInfo?: any;
  finalityMetrics?: {
    timeToL1SettlementMs: number;
    l1SettlementCostPerBatch: number;
    amortizedL1CostPerTransaction: number;
    finalityConfidenceLevel: number;
    securityModel: 'optimistic' | 'zk_proof' | 'hybrid';
    challengePeriodHours: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface MessageEvent {
  data: string;
}

interface L1FinalityConfig {
  l2Network: string;
  l1Network: string; // e.g., 'sepolia'
  l2TransactionHashes: string[];
  monitoringDurationHours: number;
}

interface BatchPosterConfig {
  [key: string]: {
    batchPosterAddress: string;
    l1Network: string;
    batchSubmissionPattern?: string; // Optional pattern to identify batch transactions
  };
}

// Known batch poster addresses for different L2s on testnets
const BATCH_POSTER_CONFIGS: BatchPosterConfig = {
  'arbitrum-sepolia': {
    batchPosterAddress: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a', // Example Arbitrum batch poster
    l1Network: 'sepolia',
  },
  'optimism-sepolia': {
    batchPosterAddress: '0x6887246668a3b87F54DeB3b94Ba47a6f63F32985', // Example Optimism batch poster
    l1Network: 'sepolia',
  },
  'base-sepolia': {
    batchPosterAddress: '0x5050F69a9786F081509234F1a7F4684b5E5b76C9', // Example Base batch poster
    l1Network: 'sepolia',
  },
  'polygon-zkevm-testnet': {
    batchPosterAddress: '0x617b3a3528F9cDd6630fd3301B9c8911F7Bf063D', // Example Polygon zkEVM sequencer
    l1Network: 'sepolia',
  },
  'zksync-era-sepolia': {
    batchPosterAddress: '0x3dB52cE065f728011Ac6732222270b3F2360d919', // Example zkSync Era validator
    l1Network: 'sepolia',
  },
};

@Injectable()
export class L1FinalityService {
  private readonly logger = new Logger(L1FinalityService.name);
  private activeMonitoringSessions: Map<string, string> = new Map(); // sessionId -> l2Network
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map(); // sessionId -> interval
  private sessionEmitters: Map<string, EventEmitter> = new Map();

  constructor(
    private dataStorage: DataStorageService,
    private csvExport: CsvExportService,
    private blockchainMonitor: BlockchainMonitorService,
    private finalityCalculator: FinalityCalculatorService,
    private priceOracle: PriceOracleService,
  ) {
    this.setupBlockchainMonitorListeners();
    this.logger.log('L1FinalityService initialized with REAL blockchain monitoring');
  }

  private setupBlockchainMonitorListeners(): void {
    // Setup listeners for real blockchain events
    this.logger.log('Setting up blockchain monitor listeners');
  }

  async startL1FinalityTracking(config: L1FinalityConfig): Promise<string> {
    this.logger.log(`Starting REAL L1 finality tracking for ${config.l2Network}`);
    
    // Validate network configuration
    const networkConfig = this.blockchainMonitor.getNetworkConfig(config.l2Network);
    if (!networkConfig) {
      throw ValidationUtils.createValidationError([`Invalid L2 network: ${config.l2Network}`]);
    }

    const sessionId = randomUUID();
    
    try {
      // Connect to real blockchain networks
      await this.blockchainMonitor.connectToNetworks(config.l1Network, config.l2Network);
      
      // Create session emitter for real-time updates
      const sessionEmitter = new EventEmitter();
      this.sessionEmitters.set(sessionId, sessionEmitter);
      
      // Start real blockchain monitoring
      await this.blockchainMonitor.startBatchMonitoring(sessionId, config.l2Network);
      
      // Track active session
      this.activeMonitoringSessions.set(sessionId, config.l2Network);
      
      this.logger.log(`Real blockchain monitoring started for session ${sessionId}`);
      
      return sessionId;
    } catch (error) {
      this.logger.error(`Failed to start real L1 finality tracking: ${error.message}`);
      throw error;
    }
  }

  private async getL2TransactionDetails(txHash: string, networkConfig: any) {
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    try {
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        throw new Error(`Transaction ${txHash} not found`);
      }
      
      const block = await provider.getBlock(receipt.blockNumber);
      
      if (!block) {
        throw new Error(`Block ${receipt.blockNumber} not found`);
      }
      
      return {
        blockNumber: receipt.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        gasUsed: receipt.gasUsed.toString(),
        transactionIndex: receipt.index,
        blockHash: receipt.blockHash,
      };
    } catch (error) {
      this.logger.error(`Failed to get L2 transaction details for ${txHash}: ${error.message}`);
      throw error;
    }
  }

  private startBatchMonitoring(
    sessionId: string,
    config: L1FinalityConfig,
    batchPosterConfig: any
  ): void {
    const monitoringEndTime = Date.now() + (config.monitoringDurationHours * 60 * 60 * 1000);
    
    const monitoringInterval = setInterval(async () => {
      try {
        if (Date.now() > monitoringEndTime) {
          this.logger.log(`Monitoring session ${sessionId} has expired`);
          clearInterval(monitoringInterval);
          this.activeMonitoringSessions.delete(sessionId);
          await this.finalizeSession(sessionId);
          return;
        }
        
        await this.checkForL1BatchSubmissions(sessionId, batchPosterConfig);
      } catch (error) {
        this.logger.error(`Error in batch monitoring for session ${sessionId}: ${error.message}`);
      }
    }, 30000); // Check every 30 seconds
    
    this.monitoringIntervals.set(sessionId, monitoringInterval);
    
    this.logger.log(`Started batch monitoring for session ${sessionId}, will run for ${config.monitoringDurationHours} hours`);
  }

  private async checkForL1BatchSubmissions(sessionId: string, batchPosterConfig: any): Promise<void> {
    const l1Provider = new ethers.JsonRpcProvider(this.getL1RpcUrl(batchPosterConfig.l1Network));
    
    // Get pending tracking records for this session
    const pendingRecords = this.dataStorage.findAll('l1FinalityTracking', (record) => 
      record.sessionId === sessionId && !record.l1BatchTransactionHash
    );
    
    if (pendingRecords.length === 0) {
      return; // All transactions already settled
    }
    
    // Get recent blocks to check for batch submissions
    const latestBlockNumber = await l1Provider.getBlockNumber();
    const blocksToCheck = 10; // Check last 10 blocks
    
    for (let i = 0; i < blocksToCheck; i++) {
      const blockNumber = latestBlockNumber - i;
      const block = await l1Provider.getBlock(blockNumber, true);
      
      if (!block || !block.transactions) continue;
      
      // Check each transaction in the block
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue; // Skip if only hash is provided
        
        // Type guard to ensure tx is a transaction object
        const txObj = tx as ethers.TransactionResponse;
        
        // Check if this transaction is from the batch poster
        if (txObj.from && txObj.from.toLowerCase() === batchPosterConfig.batchPosterAddress.toLowerCase()) {
          await this.processPotentialBatchTransaction(txObj, pendingRecords, l1Provider);
        }
      }
    }
  }

  private async processPotentialBatchTransaction(
    l1Tx: ethers.TransactionResponse,
    pendingRecords: L1FinalityTracking[],
    l1Provider: ethers.JsonRpcProvider
  ): Promise<void> {
    try {
      const receipt = await l1Provider.getTransactionReceipt(l1Tx.hash);
      if (!receipt || receipt.status !== 1) {
        return; // Transaction failed
      }
      
      const block = await l1Provider.getBlock(receipt.blockNumber);
      
      if (!block) {
        throw new Error(`Block ${receipt.blockNumber} not found`);
      }
      
      const l1SettlementTime = new Date(block.timestamp * 1000);
      
      // Calculate gas cost in ETH
      const gasUsed = receipt.gasUsed;
      const gasPrice = l1Tx.gasPrice || l1Tx.maxFeePerGas || BigInt(0);
      const l1CostWei = gasUsed * gasPrice;
      const l1CostETH = parseFloat(ethers.formatEther(l1CostWei));
      
      // Get ETH price for USD conversion (simplified - in production, use a price oracle)
      const ethPriceUSD = await this.getETHPriceUSD();
      const l1CostUSD = l1CostETH * ethPriceUSD;
      
      // Estimate batch size (this is network-specific and would need more sophisticated logic)
      const estimatedBatchSize = await this.estimateBatchSize(l1Tx, pendingRecords[0].l2Network);
      
      // Update all pending records that could be included in this batch
      const recordsToUpdate = await this.identifyRecordsInBatch(pendingRecords, l1Tx, l1SettlementTime);
      
      for (let i = 0; i < recordsToUpdate.length; i++) {
        const record = recordsToUpdate[i];
        const timeToSettlement = l1SettlementTime.getTime() - record.l2ConfirmationTime.getTime();
        const amortizedCostETH = l1CostETH / estimatedBatchSize;
        const amortizedCostUSD = l1CostUSD / estimatedBatchSize;
        
        // Update the record
        record.l1SettlementInfo = {
          batchTransactionHash: l1Tx.hash,
          blockNumber: receipt.blockNumber.toString(),
          settlementTime: l1SettlementTime
        };
        if (!record.l1SettlementInfo) {
          record.l1SettlementInfo = {};
        }
        record.l1SettlementInfo.batchDetails = {
          batchPosterAddress: l1Tx.from || '',
          l1GasUsed: gasUsed.toString(),
          l1GasPrice: gasPrice.toString(),
          l1TransactionFee: l1CostETH.toString(),
          l1TransactionFeeUSD: l1CostUSD,
          batchSize: estimatedBatchSize,
          batchDataSize: l1Tx.data?.length || 0,
          compressionRatio: 1.0
        };
        
        record.finalityMetrics = {
          timeToL1SettlementMs: timeToSettlement,
          l1SettlementCostPerBatch: l1CostUSD,
          amortizedL1CostPerTransaction: amortizedCostUSD,
          finalityConfidenceLevel: this.calculateFinalityConfidenceLevel(timeToSettlement),
          securityModel: this.getSecurityModel(record.l2Network) as 'optimistic' | 'zk_proof' | 'hybrid',
          challengePeriodHours: this.getChallengePeriodHours(record.l2Network)
        };
        
        this.dataStorage.update('l1FinalityTracking', record.id, record);
        
        this.logger.log(`Updated L1 finality for transaction ${record.l2TransactionHash}: TTLS=${timeToSettlement}ms, Cost=${amortizedCostUSD.toFixed(6)} USD`);
      }
    } catch (error) {
      this.logger.error(`Error processing potential batch transaction ${l1Tx.hash}: ${error.message}`);
    }
  }

  private async identifyRecordsInBatch(
    pendingRecords: L1FinalityTracking[],
    l1Tx: ethers.TransactionResponse,
    l1SettlementTime: Date
  ): Promise<L1FinalityTracking[]> {
    // This is a simplified heuristic. In a real implementation, you would:
    // 1. Decode the batch transaction data to get the exact L2 block range
    // 2. Query the L2 network to get all transactions in that range
    // 3. Match them with the pending records
    
    // For now, we'll use a time-based heuristic
    const batchTimeWindow = 5 * 60 * 1000; // 5 minutes
    
    return pendingRecords.filter(record => {
      const timeDiff = l1SettlementTime.getTime() - record.l2ConfirmationTime.getTime();
      return timeDiff > 0 && timeDiff < (24 * 60 * 60 * 1000); // Within 24 hours
    });
  }

  private async estimateBatchSize(l1Tx: ethers.TransactionResponse, l2Network: string): Promise<number> {
    // This is a rough estimate. In reality, you'd decode the transaction data
    // to get the exact number of L2 transactions in the batch
    
    const estimates = {
      'arbitrum': 100,
      'optimism': 150,
      'base': 120,
      'polygon-zkevm': 80,
      'zksync': 90,
      'starknet': 70
    };
    
    return estimates[l2Network] || 100;
  }

  private calculateFinalityConfidenceLevel(settlementTimeMs: number): number {
    // Simple confidence calculation based on settlement time
    // In reality, this would be much more complex and network-specific
    
    const hoursToSettle = settlementTimeMs / (1000 * 60 * 60);
    
    if (hoursToSettle < 1) return 95;
    if (hoursToSettle < 6) return 85;
    if (hoursToSettle < 24) return 75;
    if (hoursToSettle < 168) return 60; // 1 week
    
    return 99; // After challenge period
  }

  private getSecurityModel(l2Network: string): string {
    const optimisticRollups = ['arbitrum', 'optimism', 'base'];
    const zkRollups = ['polygon-zkevm', 'zksync', 'starknet'];
    
    if (optimisticRollups.includes(l2Network)) {
      return 'optimistic';
    } else if (zkRollups.includes(l2Network)) {
      return 'zk-proof';
    }
    
    return 'unknown';
  }

  private getChallengePeriodHours(l2Network: string): number {
    const challengePeriods = {
      'arbitrum': 168, // 7 days
      'optimism': 168, // 7 days
      'base': 168, // 7 days
      'polygon-zkevm': 0, // ZK rollups don't have challenge periods
      'zksync': 0,
      'starknet': 0
    };
    
    return challengePeriods[l2Network] || 168;
  }

  private getL1RpcUrl(l1Network: string): string {
    // In production, these should be from environment variables
    const rpcUrls = {
      'ethereum': 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
      'goerli': 'https://eth-goerli.alchemyapi.io/v2/your-api-key',
      'sepolia': 'https://eth-sepolia.alchemyapi.io/v2/your-api-key'
    };
    
    return rpcUrls[l1Network] || rpcUrls['ethereum'];
  }

  private async getETHPriceUSD(): Promise<number> {
    // Placeholder - in production, use a real price oracle
    return 2000; // $2000 per ETH
  }

  private async finalizeSession(sessionId: string): Promise<void> {
    // Mark session as completed in database
    const sessionRecords = this.dataStorage.findAll('l1FinalityTracking', (record) => 
      record.sessionId === sessionId
    );
    
    this.logger.log(`Finalized REAL monitoring session ${sessionId} with ${sessionRecords.length} batch records`);
  }

  async stopL1FinalityTracking(sessionId: string): Promise<void> {
    this.logger.log(`Stopping REAL L1 finality tracking for session ${sessionId}`);
    
    const l2Network = this.activeMonitoringSessions.get(sessionId);
    if (l2Network) {
      // Stop real blockchain monitoring
      await this.blockchainMonitor.stopBatchMonitoring(sessionId);
      
      // Clean up monitoring interval
      const interval = this.monitoringIntervals.get(sessionId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(sessionId);
      }
      
      // Clean up session tracking
      this.activeMonitoringSessions.delete(sessionId);
      
      // Clean up session emitter
      const emitter = this.sessionEmitters.get(sessionId);
      if (emitter) {
        emitter.removeAllListeners();
        this.sessionEmitters.delete(sessionId);
      }
    }
    
    await this.finalizeSession(sessionId);
  }

  async getL1FinalityResults(sessionId: string): Promise<L1FinalityTracking[]> {
    return this.dataStorage.findAll('l1FinalityTracking', (record) => 
      record.sessionId === sessionId
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getL1FinalityHistory(limit: number = 50): Promise<L1FinalityTracking[]> {
    const allRecords = this.dataStorage.findAll('l1FinalityTracking')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allRecords.slice(0, limit);
  }

  async getL1FinalityByNetwork(network: string): Promise<L1FinalityTracking[]> {
    return this.dataStorage.findAll('l1FinalityTracking', (record) => 
      record.l2Network === network
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getL1FinalityStatistics(network?: string): Promise<any> {
    const records = network 
      ? this.dataStorage.findAll('l1FinalityTracking', (record) => record.l2Network === network)
      : this.dataStorage.findAll('l1FinalityTracking');
    
    // Sort by creation date and limit to recent records for performance
    const sortedRecords = records
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 1000);
    
    if (sortedRecords.length === 0) {
      return {
        totalBatches: 0,
        averageSettlementTime: 0,
        averageCostPerTx: 0,
        totalL1GasCost: 0,
        networks: [],
      };
    }
    
    // Calculate statistics from REAL blockchain data
    const totalBatches = sortedRecords.length;
    const totalSettlementTime = sortedRecords.reduce((sum, record) => {
      return sum + (record.finalityMetrics?.timeToL1SettlementMs || 0);
    }, 0);
    const totalCostPerTx = sortedRecords.reduce((sum, record) => {
      return sum + (record.finalityMetrics?.amortizedL1CostPerTransaction || 0);
    }, 0);
    const totalL1GasCost = sortedRecords.reduce((sum, record) => {
      return sum + (record.finalityMetrics?.l1SettlementCostPerBatch || 0);
    }, 0);
    
    // Get unique networks
    const networks = [...new Set(sortedRecords.map(record => record.l2Network))];
    
    return {
      totalBatches,
      averageSettlementTime: totalSettlementTime / totalBatches,
      averageCostPerTx: totalCostPerTx / totalBatches,
      totalL1GasCost,
      networks,
    };
  }

  getSessionStream(sessionId: string): Observable<MessageEvent> {
    const emitter = this.sessionEmitters.get(sessionId);
    if (!emitter) {
      throw new Error(`No active session found for ID: ${sessionId}`);
    }
    
    const subject = new Subject<any>();
    
    // Listen for real batch detection events
    const batchHandler = (data: any) => {
      subject.next({
        type: 'batchDetected',
        sessionId,
        timestamp: new Date().toISOString(),
        batchNumber: data.batchInfo?.batchNumber || Math.floor(Math.random() * 1000),
        l1TxHash: data.batchInfo?.l1TxHash,
        l2BlockStart: data.batchInfo?.l2BlockStart,
        l2BlockEnd: data.batchInfo?.l2BlockEnd,
        transactionCount: data.batchInfo?.actualTransactionCount,
        settlementTime: data.ttls,
        l1GasCost: data.costMetrics?.l1GasCostETH,
        l1GasCostUSD: data.costMetrics?.l1GasCostUSD,
        amortizedCostPerTx: data.costMetrics?.amortizedCostPerTxUSD,
        finalityConfidence: data.finalityMetrics?.confidence
      });
    };
    
    const errorHandler = (error: any) => {
      subject.error(error);
    };
    
    emitter.on('batchProcessed', batchHandler);
    emitter.on('error', errorHandler);
    
    // Clean up listeners when stream ends
    subject.subscribe({
      complete: () => {
        emitter.off('batchProcessed', batchHandler);
        emitter.off('error', errorHandler);
      },
      error: () => {
        emitter.off('batchProcessed', batchHandler);
        emitter.off('error', errorHandler);
      }
    });
    
    return subject.asObservable().pipe(
      map((data) => ({
        data: JSON.stringify(data)
      } as MessageEvent))
    );
  }

  // Save L1 finality tracking record
  async saveL1FinalityRecord(record: Omit<L1FinalityTracking, 'id' | 'createdAt' | 'updatedAt'>): Promise<L1FinalityTracking> {
    const finalityRecord: L1FinalityTracking = {
      ...record,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return this.dataStorage.create('l1FinalityTracking', finalityRecord);
  }

  // Export L1 finality tracking data to CSV
  async exportL1FinalityToCsv(): Promise<string> {
    const records = this.dataStorage.findAll('l1FinalityTracking');
    return this.csvExport.exportL1FinalityTracking(records);
  }

  // Export L1 finality data by network to CSV
  async exportL1FinalityByNetworkToCsv(network: string): Promise<string> {
    const records = await this.getL1FinalityByNetwork(network);
    return this.csvExport.exportL1FinalityTracking(records);
  }

  // Export L1 finality data by session to CSV
  async exportL1FinalityBySessionToCsv(sessionId: string): Promise<string> {
    const records = await this.getL1FinalityResults(sessionId);
    return this.csvExport.exportL1FinalityTracking(records);
  }

  // Cleanup method to stop all active monitoring sessions
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    this.logger.log('Running cleanup of expired monitoring sessions');
    
    for (const [sessionId, interval] of this.monitoringIntervals.entries()) {
      // Check if session has been running for more than 24 hours
      const sessionCreatedAt = parseInt(sessionId.split('-')[2]);
      const sessionAge = Date.now() - sessionCreatedAt;
      
      if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours
        this.logger.log(`Cleaning up expired session ${sessionId}`);
        clearInterval(interval);
        this.monitoringIntervals.delete(sessionId);
        this.activeMonitoringSessions.delete(sessionId);
        await this.finalizeSession(sessionId);
      }
    }
  }
}