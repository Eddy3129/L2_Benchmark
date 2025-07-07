import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

interface FinalityMetrics {
  status: 'pending' | 'challenge_period' | 'finalized' | 'disputed';
  confidence: number; // 0-100 based on actual confirmations and rollup type
  timeToFinality: number; // Actual time in milliseconds
  l1Confirmations: number;
  challengePeriodRemaining?: number; // For Optimistic Rollups (hours)
  proofVerified?: boolean; // For ZK Rollups
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  finalityReason: string;
}

interface ChallengeStatus {
  inChallengePeriod: boolean;
  challengePeriodStart: Date;
  challengePeriodEnd: Date;
  hoursRemaining: number;
  canBeDisputed: boolean;
}

interface ProofStatus {
  proofSubmitted: boolean;
  proofVerified: boolean;
  proofHash?: string;
  verificationTime?: Date;
}

@Injectable()
export class FinalityCalculatorService {
  private readonly logger = new Logger(FinalityCalculatorService.name);
  
  // Minimum L1 confirmations for different security levels
  private readonly CONFIRMATION_THRESHOLDS = {
    low: 1,
    medium: 6,
    high: 12,
    maximum: 32 // ~7 minutes on Ethereum
  };

  // Challenge periods for different Optimistic Rollups (in hours)
  private readonly CHALLENGE_PERIODS = {
    'arbitrum-sepolia': 168, // 7 days
    'arbitrum-one': 168, // 7 days
    'optimism-sepolia': 168, // 7 days
    'optimism': 168, // 7 days
    'base-sepolia': 168, // 7 days
    'base': 168, // 7 days
  };

  // ZK Rollups don't have challenge periods but have proof verification requirements
  private readonly ZK_ROLLUPS = [
    'polygon-zkevm-testnet',
    'polygon-zkevm',
    'zksync-era-sepolia',
    'zksync-era',
    'scroll-sepolia',
    'scroll',
    'linea-sepolia',
    'linea'
  ];

  async calculateFinality(
    l2Network: string,
    l1TxHash: string,
    l1BlockNumber: number,
    l1Timestamp: Date,
    l1Provider: ethers.JsonRpcProvider
  ): Promise<FinalityMetrics> {
    try {
      // Get current L1 block number to calculate confirmations
      const currentL1Block = await l1Provider.getBlockNumber();
      const l1Confirmations = Math.max(0, currentL1Block - l1BlockNumber);
      
      // Determine rollup type
      const isZkRollup = this.ZK_ROLLUPS.includes(l2Network);
      
      if (isZkRollup) {
        return await this.calculateZkRollupFinality(
          l2Network,
          l1TxHash,
          l1Confirmations,
          l1Timestamp,
          l1Provider
        );
      } else {
        return await this.calculateOptimisticRollupFinality(
          l2Network,
          l1TxHash,
          l1Confirmations,
          l1Timestamp,
          l1Provider
        );
      }
    } catch (error) {
      this.logger.error(`Error calculating finality for ${l1TxHash}: ${error.message}`);
      throw error;
    }
  }

  private async calculateOptimisticRollupFinality(
    l2Network: string,
    l1TxHash: string,
    l1Confirmations: number,
    l1Timestamp: Date,
    l1Provider: ethers.JsonRpcProvider
  ): Promise<FinalityMetrics> {
    const challengePeriodHours = this.CHALLENGE_PERIODS[l2Network] || 168;
    const challengeStatus = this.calculateChallengeStatus(l1Timestamp, challengePeriodHours);
    
    // Calculate confidence based on L1 confirmations and challenge period status
    let confidence = 0;
    let status: FinalityMetrics['status'] = 'pending';
    let securityLevel: FinalityMetrics['securityLevel'] = 'low';
    let finalityReason = '';
    
    if (!challengeStatus.inChallengePeriod) {
      // Challenge period has passed
      if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.maximum) {
        confidence = 100;
        status = 'finalized';
        securityLevel = 'maximum';
        finalityReason = 'Challenge period completed with maximum L1 confirmations';
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.high) {
        confidence = 95;
        status = 'finalized';
        securityLevel = 'high';
        finalityReason = 'Challenge period completed with high L1 confirmations';
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.medium) {
        confidence = 85;
        status = 'finalized';
        securityLevel = 'medium';
        finalityReason = 'Challenge period completed with medium L1 confirmations';
      } else {
        confidence = 70;
        status = 'finalized';
        securityLevel = 'low';
        finalityReason = 'Challenge period completed but low L1 confirmations';
      }
    } else {
      // Still in challenge period
      status = 'challenge_period';
      
      // Confidence increases as challenge period progresses and L1 confirmations accumulate
      const challengeProgress = 1 - (challengeStatus.hoursRemaining / challengePeriodHours);
      const confirmationBonus = Math.min(l1Confirmations / this.CONFIRMATION_THRESHOLDS.high, 1) * 0.3;
      
      confidence = Math.round((challengeProgress * 0.7 + confirmationBonus) * 60); // Max 60% during challenge period
      
      if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.high) {
        securityLevel = 'medium';
        finalityReason = `In challenge period (${challengeStatus.hoursRemaining.toFixed(1)}h remaining) with high L1 confirmations`;
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.medium) {
        securityLevel = 'medium';
        finalityReason = `In challenge period (${challengeStatus.hoursRemaining.toFixed(1)}h remaining) with medium L1 confirmations`;
      } else {
        securityLevel = 'low';
        finalityReason = `In challenge period (${challengeStatus.hoursRemaining.toFixed(1)}h remaining) with low L1 confirmations`;
      }
    }
    
    const timeToFinality = challengeStatus.inChallengePeriod 
      ? challengeStatus.hoursRemaining * 60 * 60 * 1000 // Convert to milliseconds
      : 0; // Already finalized

    return {
      status,
      confidence,
      timeToFinality,
      l1Confirmations,
      challengePeriodRemaining: challengeStatus.hoursRemaining,
      securityLevel,
      finalityReason
    };
  }

  private async calculateZkRollupFinality(
    l2Network: string,
    l1TxHash: string,
    l1Confirmations: number,
    l1Timestamp: Date,
    l1Provider: ethers.JsonRpcProvider
  ): Promise<FinalityMetrics> {
    // For ZK rollups, finality depends on proof verification and L1 confirmations
    const proofStatus = await this.checkProofVerification(l1TxHash, l1Provider);
    
    let confidence = 0;
    let status: FinalityMetrics['status'] = 'pending';
    let securityLevel: FinalityMetrics['securityLevel'] = 'low';
    let finalityReason = '';
    
    if (proofStatus.proofVerified) {
      // Proof is verified, finality depends on L1 confirmations
      if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.maximum) {
        confidence = 100;
        status = 'finalized';
        securityLevel = 'maximum';
        finalityReason = 'Validity proof verified with maximum L1 confirmations';
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.high) {
        confidence = 95;
        status = 'finalized';
        securityLevel = 'high';
        finalityReason = 'Validity proof verified with high L1 confirmations';
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.medium) {
        confidence = 90;
        status = 'finalized';
        securityLevel = 'medium';
        finalityReason = 'Validity proof verified with medium L1 confirmations';
      } else if (l1Confirmations >= this.CONFIRMATION_THRESHOLDS.low) {
        confidence = 80;
        status = 'finalized';
        securityLevel = 'low';
        finalityReason = 'Validity proof verified with minimal L1 confirmations';
      } else {
        confidence = 70;
        status = 'pending';
        securityLevel = 'low';
        finalityReason = 'Validity proof verified but awaiting L1 confirmations';
      }
    } else if (proofStatus.proofSubmitted) {
      // Proof submitted but not yet verified
      const confirmationBonus = Math.min(l1Confirmations / this.CONFIRMATION_THRESHOLDS.medium, 1) * 0.3;
      confidence = Math.round(40 + confirmationBonus * 100); // 40-70% while proof is being verified
      status = 'pending';
      securityLevel = 'low';
      finalityReason = `Validity proof submitted, verification in progress (${l1Confirmations} L1 confirmations)`;
    } else {
      // No proof submitted yet
      const confirmationBonus = Math.min(l1Confirmations / this.CONFIRMATION_THRESHOLDS.low, 1) * 0.2;
      confidence = Math.round(10 + confirmationBonus * 100); // 10-30% before proof submission
      status = 'pending';
      securityLevel = 'low';
      finalityReason = `Awaiting validity proof submission (${l1Confirmations} L1 confirmations)`;
    }
    
    return {
      status,
      confidence,
      timeToFinality: status === 'finalized' ? 0 : -1, // -1 indicates unknown time for ZK rollups
      l1Confirmations,
      proofVerified: proofStatus.proofVerified,
      securityLevel,
      finalityReason
    };
  }

  private calculateChallengeStatus(l1Timestamp: Date, challengePeriodHours: number): ChallengeStatus {
    const challengePeriodStart = l1Timestamp;
    const challengePeriodEnd = new Date(l1Timestamp.getTime() + challengePeriodHours * 60 * 60 * 1000);
    const now = new Date();
    
    const inChallengePeriod = now < challengePeriodEnd;
    const hoursRemaining = inChallengePeriod 
      ? (challengePeriodEnd.getTime() - now.getTime()) / (60 * 60 * 1000)
      : 0;
    
    return {
      inChallengePeriod,
      challengePeriodStart,
      challengePeriodEnd,
      hoursRemaining: Math.max(0, hoursRemaining),
      canBeDisputed: inChallengePeriod
    };
  }

  private async checkProofVerification(l1TxHash: string, l1Provider: ethers.JsonRpcProvider): Promise<ProofStatus> {
    try {
      // Get the transaction receipt to analyze logs for proof verification events
      const receipt = await l1Provider.getTransactionReceipt(l1TxHash);
      
      if (!receipt || !receipt.logs) {
        return {
          proofSubmitted: false,
          proofVerified: false
        };
      }
      
      // Look for proof verification events in the logs
      // Different ZK rollups have different event signatures
      const proofVerificationTopics = [
        '0x9c72852172521097ba7e1482e6b44b351323df0155f97f4ea18fcec28e1f5966', // Example: Polygon zkEVM proof verification
        '0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498', // Example: zkSync proof verification
        // Add more as needed for different ZK rollups
      ];
      
      let proofSubmitted = false;
      let proofVerified = false;
      
      for (const log of receipt.logs) {
        if (proofVerificationTopics.includes(log.topics[0])) {
          proofSubmitted = true;
          // Additional logic would be needed to determine if verification was successful
          // This would require parsing the specific event data for each rollup
          proofVerified = true; // Simplified - in production, parse the event data
          break;
        }
      }
      
      return {
        proofSubmitted,
        proofVerified,
        proofHash: proofSubmitted ? l1TxHash : undefined,
        verificationTime: proofVerified ? new Date() : undefined
      };
    } catch (error) {
      this.logger.error(`Error checking proof verification for ${l1TxHash}: ${error.message}`);
      return {
        proofSubmitted: false,
        proofVerified: false
      };
    }
  }

  // Helper method to get human-readable finality status
  getFinalityDescription(metrics: FinalityMetrics): string {
    const { status, confidence, l1Confirmations, challengePeriodRemaining, proofVerified } = metrics;
    
    switch (status) {
      case 'finalized':
        return `Finalized (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`;
      
      case 'challenge_period':
        return `Challenge Period (${challengePeriodRemaining?.toFixed(1)}h remaining, ${confidence}% confidence)`;
      
      case 'pending':
        if (proofVerified !== undefined) {
          return proofVerified 
            ? `Proof Verified (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`
            : `Awaiting Proof (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`;
        } else {
          return `Pending (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`;
        }
      
      case 'disputed':
        return `Disputed (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`;
      
      default:
        return `Unknown (${confidence}% confidence, ${l1Confirmations} L1 confirmations)`;
    }
  }

  // Method to estimate time to finality for different rollup types
  estimateTimeToFinality(l2Network: string, currentL1Confirmations: number = 0): number {
    const isZkRollup = this.ZK_ROLLUPS.includes(l2Network);
    
    if (isZkRollup) {
      // ZK rollups: finality depends on proof generation and verification
      // Typical proof generation: 1-4 hours, verification: ~15 minutes
      return 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    } else {
      // Optimistic rollups: challenge period + L1 confirmations
      const challengePeriodHours = this.CHALLENGE_PERIODS[l2Network] || 168;
      const challengePeriodMs = challengePeriodHours * 60 * 60 * 1000;
      
      // Add time for additional L1 confirmations (assuming 12 second block time)
      const confirmationsNeeded = Math.max(0, this.CONFIRMATION_THRESHOLDS.high - currentL1Confirmations);
      const confirmationTimeMs = confirmationsNeeded * 12 * 1000;
      
      return challengePeriodMs + confirmationTimeMs;
    }
  }
}