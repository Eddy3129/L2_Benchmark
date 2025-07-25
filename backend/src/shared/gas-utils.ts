import { GasPriceData, GasEstimate } from './types';
import { ethers, FunctionFragment } from 'ethers';

/**
 * Utility class for gas-related calculations and operations
 */
export class GasUtils {
  /**
   * Calculate cost in ETH from gas amount and gas price
   */
  static calculateCostETH(gasAmount: number, gasPriceGwei: number): string {
    // Ensure gas price is in proper decimal format (avoid scientific notation)
    const safeGasPriceString = gasPriceGwei.toFixed(12);
    const gasPriceWei = ethers.parseUnits(safeGasPriceString, 'gwei');
    const costWei = BigInt(gasAmount) * gasPriceWei;
    const ethValue = ethers.formatEther(costWei);
    // Limit precision to prevent 'too many decimals for format' errors
    return Number(ethValue).toFixed(12);
  }

  /**
   * Calculate cost in USD from ETH cost and ETH price
   */
  static calculateCostUSD(costETH: string, ethPriceUSD: number): number {
    return parseFloat(costETH) * ethPriceUSD;
  }

  /**
   * Estimate deployment gas based on bytecode complexity
   */
  static estimateDeploymentGas(bytecode: string): number {
    const baseGas = 21000;
    const bytecodeLength = (bytecode.length - 2) / 2; // Remove '0x' and convert to bytes
    const deploymentGas = baseGas + (bytecodeLength * 200); // Rough estimation
    
    // Apply complexity multiplier
    const complexity = this.calculateBytecodeComplexity(bytecode);
    return Math.floor(deploymentGas * complexity);
  }

  /**
   * Estimate function gas usage based on function signature and complexity
   */
  static estimateFunctionGas(fragment: FunctionFragment): number {
    const baseGas = 21000;
    let additionalGas = 0;
    
    // Add gas based on input parameters
    fragment.inputs.forEach(input => {
      switch (input.type) {
        case 'uint256':
        case 'int256':
        case 'address':
          additionalGas += 3000;
          break;
        case 'string':
        case 'bytes':
          additionalGas += 5000;
          break;
        default:
          if (input.type.includes('[]')) {
            additionalGas += 10000; // Arrays are more expensive
          } else {
            additionalGas += 2000;
          }
      }
    });
    
    // Add gas based on function name complexity
    if (fragment.name.toLowerCase().includes('transfer')) {
      additionalGas += 5000;
    }
    if (fragment.name.toLowerCase().includes('approve')) {
      additionalGas += 3000;
    }
    if (fragment.name.toLowerCase().includes('mint')) {
      additionalGas += 8000;
    }
    
    return baseGas + additionalGas;
  }

  /**
   * Calculate bytecode complexity multiplier
   */
  static calculateBytecodeComplexity(bytecode: string): number {
    let complexity = 1.0;
    
    // Count expensive operations in bytecode
    const expensiveOps = [
      '55', // SSTORE
      '54', // SLOAD
      'f0', // CREATE
      'f1', // CALL
      'f2', // CALLCODE
      'f4', // DELEGATECALL
      'f5', // CREATE2
      'fa', // STATICCALL
    ];
    
    for (const op of expensiveOps) {
      const count = (bytecode.match(new RegExp(op, 'gi')) || []).length;
      complexity += count * 0.1;
    }
    
    // Cap complexity at reasonable bounds
    return Math.min(Math.max(complexity, 1.0), 3.0);
  }

  /**
   * Format gas amount with proper units
   */
  static formatGasAmount(gasAmount: string | number): string {
    const gas = typeof gasAmount === 'string' ? parseInt(gasAmount) : gasAmount;
    
    if (gas >= 1000000) {
      return `${(gas / 1000000).toFixed(2)}M`;
    } else if (gas >= 1000) {
      return `${(gas / 1000).toFixed(1)}K`;
    }
    return gas.toString();
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number | string, currency: 'ETH' | 'USD' = 'USD'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (currency === 'ETH') {
      return `${num.toFixed(6)} ETH`;
    }
    return `$${num.toFixed(2)}`;
  }

  /**
   * Calculate percentage difference between two values
   */
  static calculatePercentageDifference(value1: number, value2: number): number {
    if (value1 === 0) return value2 === 0 ? 0 : 100;
    return ((value2 - value1) / value1) * 100;
  }

  /**
   * Calculate savings between two costs
   */
  static calculateSavings(originalCost: number, newCost: number): {
    absolute: number;
    percentage: number;
    isSaving: boolean;
  } {
    const absolute = originalCost - newCost;
    const percentage = this.calculatePercentageDifference(originalCost, newCost);
    
    return {
      absolute,
      percentage: Math.abs(percentage),
      isSaving: absolute > 0
    };
  }

  /**
   * Validate gas price data
   */
  static validateGasPriceData(gasPriceData: GasPriceData): boolean {
    return (
      gasPriceData.baseFee > 0 &&
      gasPriceData.priorityFee >= 0 &&
      gasPriceData.totalFee > 0 &&
      gasPriceData.confidence >= 0 &&
      gasPriceData.confidence <= 100
    );
  }

  /**
   * Create default gas price data for fallback scenarios
   */
  static createDefaultGasPriceData(chainId: number): GasPriceData {
    // Default values based on network type
    const isL2 = [42161, 10, 8453, 137].includes(chainId);
    
    return {
      baseFee: isL2 ? 0.1 : 20,
      priorityFee: isL2 ? 0.01 : 2,
      totalFee: isL2 ? 0.11 : 22,
      confidence: 50,
      source: 'provider'
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use estimateBlobGas instead for EIP-4844 blob-based L1 costs
   */
  static estimateCalldataGas(fragment: FunctionFragment): number {
    // This method is deprecated but kept for backward compatibility
    return this.estimateBlobGas(fragment);
  }

  /**
   * Estimate blob gas cost for L1 data availability using EIP-4844
   */
  static estimateBlobGas(fragment: FunctionFragment): number {
    // Base calldata for function selector (4 bytes)
    let calldataBytes = 4;
    
    // Add bytes for each parameter
    fragment.inputs.forEach(input => {
      switch (input.type) {
        case 'uint256':
        case 'int256':
        case 'address':
        case 'bytes32':
          calldataBytes += 32;
          break;
        case 'bool':
        case 'uint8':
          calldataBytes += 1;
          break;
        case 'string':
        case 'bytes':
          calldataBytes += 64; // Estimate for dynamic types
          break;
        default:
          if (input.type.includes('[]')) {
            calldataBytes += 96; // Estimate for arrays
          } else {
            calldataBytes += 32; // Default for other types
          }
      }
    });
    
    // EIP-4844 blob constants
    const BYTES_PER_BLOB = 131072; // 128 KiB per blob
    const GAS_PER_BLOB = 131072;   // Gas units per blob
    
    // Calculate number of blobs needed for the function data
    const blobsNeeded = Math.ceil(calldataBytes / BYTES_PER_BLOB);
    
    // Return total blob gas needed
    return blobsNeeded * GAS_PER_BLOB;
  }

  /**
   * Calculate blob cost in ETH using standard blob base fee
   */
  static calculateBlobCostETH(blobGas: number): string {
    // Standard blob base fee per gas: 1 wei = 1e-9 gwei
    const blobBaseFeeGwei = 1e-9;
    return this.calculateCostETH(blobGas, blobBaseFeeGwei);
  }

  /**
   * Estimate total L1 data cost for deployment using blobs
   */
  static estimateDeploymentBlobCost(bytecodeSize: number): {
    blobsNeeded: number;
    totalBlobGas: number;
    costETH: string;
  } {
    // EIP-4844 blob constants
    const BYTES_PER_BLOB = 131072; // 128 KiB per blob
    const GAS_PER_BLOB = 131072;   // Gas units per blob
    
    // Calculate blobs needed for bytecode
    const blobsNeeded = Math.ceil(bytecodeSize / BYTES_PER_BLOB);
    const totalBlobGas = blobsNeeded * GAS_PER_BLOB;
    
    // Calculate cost using standard blob base fee
    const costETH = this.calculateBlobCostETH(totalBlobGas);
    
    return {
      blobsNeeded,
      totalBlobGas,
      costETH
    };
  }

  /**
   * Aggregate gas estimates for summary statistics
   */
  static aggregateGasEstimates(estimates: GasEstimate[]): {
    totalGas: number;
    avgGas: number;
    totalCostETH: number;
    totalCostUSD: number;
  } {
    if (estimates.length === 0) {
      return { totalGas: 0, avgGas: 0, totalCostETH: 0, totalCostUSD: 0 };
    }
    
    const totalGas = estimates.reduce((sum, est) => sum + parseInt(est.gasUsed), 0);
    const avgGas = totalGas / estimates.length;
    const totalCostETH = estimates.reduce((sum, est) => sum + parseFloat(est.estimatedCostETH), 0);
    const totalCostUSD = estimates.reduce((sum, est) => sum + est.estimatedCostUSD, 0);
    
    return {
      totalGas,
      avgGas,
      totalCostETH,
      totalCostUSD
    };
  }
}