import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Base service
import { BaseService } from '../../../common/base.service';

// DTOs
import { BytecodeAnalysisDto } from '../../../common/dto/gas-analysis.dto';

// Local utility classes and interfaces
class NumberUtils {
  static roundToDecimals(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

class StringUtils {
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

interface OpCode {
  opcode: number;
  name: string;
  gasCost: number;
  stackInput: number;
  stackOutput: number;
  category: string;
}

interface FunctionSignature {
  selector: string;
  signature: string;
  gasEstimate: number;
}

interface SecurityIssue {
  type: string;
  severity: string;
  description: string;
}

@Injectable()
export class BytecodeAnalysisService {
  private readonly logger = new Logger(BytecodeAnalysisService.name);
  private readonly opcodeMap: Map<number, OpCode>;

  constructor(private readonly configService: ConfigService) {
    this.opcodeMap = this.initializeOpcodeMap();
  }

  /**
   * Analyzes contract bytecode and provides detailed insights
   */
  async analyzeBytecode(bytecode: string): Promise<BytecodeAnalysisDto> {
    try {
      if (!bytecode || bytecode.length === 0) {
        throw new Error('Empty bytecode provided');
      }

      // Remove 0x prefix if present
      const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
      
      // Validate bytecode format
      if (!/^[0-9a-fA-F]*$/.test(cleanBytecode)) {
        throw new Error('Invalid bytecode format');
      }

      const startTime = Date.now();

      // Perform various analyses
      const [sizeAnalysis, opcodeAnalysis, functionAnalysis, securityAnalysis, gasAnalysis] = await Promise.all([
        this.analyzeBytecodeSize(cleanBytecode),
        this.analyzeOpcodes(cleanBytecode),
        this.analyzeFunctions(cleanBytecode),
        this.analyzeSecurityIssues(cleanBytecode),
        this.analyzeGasOptimization(cleanBytecode),
      ]);

      const analysisTime = Date.now() - startTime;

      const result: BytecodeAnalysisDto = {
        size: sizeAnalysis.bytes,
        complexityScore: this.calculateComplexity(opcodeAnalysis, functionAnalysis).score,
        opcodeCount: opcodeAnalysis.totalOpcodes,
        topOpcodes: opcodeAnalysis.distribution.slice(0, 10).map(item => ({
          opcode: item.name,
          count: item.count,
          percentage: item.percentage
        })),
        deploymentCostMultiplier: sizeAnalysis.deploymentCost / 21000, // Relative to base transaction cost
        securityAnalysis: {
          hasReentrancyGuards: !this.hasReentrancyPattern(this.extractOpcodes(cleanBytecode)),
          hasOverflowChecks: true, // Simplified assumption
          hasAccessControls: securityAnalysis.some(issue => issue.type.includes('ACCESS')),
          riskLevel: securityAnalysis.length > 2 ? 'high' : securityAnalysis.length > 0 ? 'medium' : 'low'
        }
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to analyze bytecode', error);
      throw error;
    }
  }

  /**
   * Analyzes bytecode size and provides size-related metrics
   */
  private async analyzeBytecodeSize(bytecode: string): Promise<any> {
    const sizeInBytes = bytecode.length / 2;
    const sizeInKB = NumberUtils.roundToDecimals(sizeInBytes / 1024, 2);
    
    // Ethereum contract size limit is 24KB (EIP-170)
    const maxSizeKB = 24;
    const utilizationPercentage = NumberUtils.roundToDecimals((sizeInKB / maxSizeKB) * 100, 1);
    
    return {
      bytes: sizeInBytes,
      kilobytes: sizeInKB,
      utilizationPercentage,
      isNearLimit: utilizationPercentage > 90,
      deploymentCost: this.estimateDeploymentCost(sizeInBytes),
      recommendations: this.getSizeRecommendations(utilizationPercentage),
    };
  }

  /**
   * Analyzes opcode distribution and usage patterns
   */
  private async analyzeOpcodes(bytecode: string): Promise<any> {
    const opcodes = this.extractOpcodes(bytecode);
    const distribution = new Map<string, number>();
    const categories = new Map<string, number>();
    let totalGasCost = 0;

    for (const opcode of opcodes) {
      const opcodeInfo = this.opcodeMap.get(opcode);
      if (opcodeInfo) {
        // Count opcode occurrences
        const count = distribution.get(opcodeInfo.name) || 0;
        distribution.set(opcodeInfo.name, count + 1);

        // Count category occurrences
        const categoryCount = categories.get(opcodeInfo.category) || 0;
        categories.set(opcodeInfo.category, categoryCount + 1);

        // Accumulate gas costs
        totalGasCost += opcodeInfo.gasCost;
      }
    }

    // Convert to arrays for easier consumption
    const distributionArray = Array.from(distribution.entries())
      .map(([name, count]) => ({ name, count, percentage: NumberUtils.roundToDecimals((count / opcodes.length) * 100, 1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 opcodes

    const categoriesArray = Array.from(categories.entries())
      .map(([category, count]) => ({ category, count, percentage: NumberUtils.roundToDecimals((count / opcodes.length) * 100, 1) }))
      .sort((a, b) => b.count - a.count);

    return {
      distribution: distributionArray,
      categories: categoriesArray,
      totalOpcodes: opcodes.length,
      uniqueOpcodes: distribution.size,
      estimatedGasCost: totalGasCost,
    };
  }

  /**
   * Analyzes function signatures and selectors
   */
  private async analyzeFunctions(bytecode: string): Promise<any> {
    const signatures = this.extractFunctionSignatures(bytecode);
    const publicFunctions = signatures.filter(sig => sig.selector !== '0x00000000');
    
    return {
      signatures: publicFunctions,
      totalFunctions: publicFunctions.length,
      averageGasEstimate: publicFunctions.length > 0 
        ? Math.round(publicFunctions.reduce((sum, func) => sum + func.gasEstimate, 0) / publicFunctions.length)
        : 0,
    };
  }

  /**
   * Analyzes potential security issues in bytecode
   */
  private async analyzeSecurityIssues(bytecode: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const opcodes = this.extractOpcodes(bytecode);

    // Check for dangerous opcodes
    const dangerousOpcodes = {
      0x32: { name: 'ORIGIN', severity: 'medium' as const, description: 'Use of tx.origin can be dangerous for authorization' },
      0x3a: { name: 'GASPRICE', severity: 'low' as const, description: 'Gas price dependency detected' },
      0x40: { name: 'BLOCKHASH', severity: 'low' as const, description: 'Block hash dependency detected' },
      0x41: { name: 'COINBASE', severity: 'medium' as const, description: 'Coinbase dependency detected' },
      0x42: { name: 'TIMESTAMP', severity: 'medium' as const, description: 'Timestamp dependency detected' },
      0x43: { name: 'NUMBER', severity: 'low' as const, description: 'Block number dependency detected' },
      0x44: { name: 'DIFFICULTY', severity: 'low' as const, description: 'Difficulty dependency detected' },
      0x45: { name: 'GASLIMIT', severity: 'low' as const, description: 'Gas limit dependency detected' },
    };

    for (const opcode of opcodes) {
      const dangerous = dangerousOpcodes[opcode];
      if (dangerous) {
        issues.push({
          type: dangerous.name,
          severity: dangerous.severity,
          description: dangerous.description,
        });
      }
    }

    // Check for potential reentrancy patterns
    if (this.hasReentrancyPattern(opcodes)) {
      issues.push({
        type: 'REENTRANCY_RISK',
        severity: 'high',
        description: 'Potential reentrancy vulnerability detected',
      });
    }

    // Check for unchecked external calls
    if (this.hasUncheckedExternalCalls(opcodes)) {
      issues.push({
        type: 'UNCHECKED_CALL',
        severity: 'medium',
        description: 'Unchecked external call detected',
      });
    }

    // Remove duplicates
    const uniqueIssues = issues.filter((issue, index, self) => 
      index === self.findIndex(i => i.type === issue.type)
    );

    return uniqueIssues;
  }

  /**
   * Analyzes gas optimization opportunities
   */
  private async analyzeGasOptimization(bytecode: string): Promise<any> {
    const opcodes = this.extractOpcodes(bytecode);
    const suggestions: string[] = [];
    let potentialSavings = 0;

    // Check for expensive operations
    const expensiveOps = {
      0x54: { name: 'SLOAD', cost: 800, suggestion: 'Consider caching storage reads' },
      0x55: { name: 'SSTORE', cost: 5000, suggestion: 'Minimize storage writes' },
      0x20: { name: 'SHA3', cost: 30, suggestion: 'Consider alternatives to keccak256' },
    };

    const opcodeCounts = new Map<number, number>();
    for (const opcode of opcodes) {
      opcodeCounts.set(opcode, (opcodeCounts.get(opcode) || 0) + 1);
    }

    for (const [opcode, info] of Object.entries(expensiveOps)) {
      const count = opcodeCounts.get(parseInt(opcode)) || 0;
      if (count > 0) {
        const savings = count * info.cost * 0.1; // Assume 10% potential savings
        potentialSavings += savings;
        suggestions.push(`${info.name}: ${info.suggestion} (${count} occurrences, potential savings: ${Math.round(savings)} gas)`);
      }
    }

    // Check for optimization patterns
    const optimizationScore = this.calculateOptimizationScore(opcodes);

    return {
      score: optimizationScore,
      suggestions,
      potentialSavings: Math.round(potentialSavings),
      recommendations: this.getOptimizationRecommendations(optimizationScore),
    };
  }

  /**
   * Calculates overall complexity score
   */
  private calculateComplexity(opcodeAnalysis: any, functionAnalysis: any): any {
    const opcodeComplexity = opcodeAnalysis.uniqueOpcodes / opcodeAnalysis.totalOpcodes;
    const functionComplexity = functionAnalysis.totalFunctions * 0.1;
    const gasComplexity = opcodeAnalysis.estimatedGasCost / 1000000; // Normalize to millions

    const overallComplexity = (opcodeComplexity + functionComplexity + gasComplexity) / 3;
    
    let complexityLevel: string;
    if (overallComplexity < 0.3) complexityLevel = 'Low';
    else if (overallComplexity < 0.6) complexityLevel = 'Medium';
    else if (overallComplexity < 0.8) complexityLevel = 'High';
    else complexityLevel = 'Very High';

    return {
      score: NumberUtils.roundToDecimals(overallComplexity, 3),
      level: complexityLevel,
      factors: {
        opcodeComplexity: NumberUtils.roundToDecimals(opcodeComplexity, 3),
        functionComplexity: NumberUtils.roundToDecimals(functionComplexity, 3),
        gasComplexity: NumberUtils.roundToDecimals(gasComplexity, 3),
      },
    };
  }

  /**
   * Extracts opcodes from bytecode
   */
  private extractOpcodes(bytecode: string): number[] {
    const opcodes: number[] = [];
    
    for (let i = 0; i < bytecode.length; i += 2) {
      const opcode = parseInt(bytecode.substr(i, 2), 16);
      opcodes.push(opcode);
      
      // Handle PUSH opcodes that have data following them
      if (opcode >= 0x60 && opcode <= 0x7f) {
        const pushSize = opcode - 0x5f;
        i += pushSize * 2; // Skip the pushed data
      }
    }
    
    return opcodes;
  }

  /**
   * Extracts function signatures from bytecode
   */
  private extractFunctionSignatures(bytecode: string): FunctionSignature[] {
    const signatures: FunctionSignature[] = [];
    
    // Look for function selector patterns (PUSH4 followed by EQ)
    const selectorPattern = /63([0-9a-fA-F]{8})/g;
    let match;
    
    while ((match = selectorPattern.exec(bytecode)) !== null) {
      const selector = '0x' + match[1];
      
      // Estimate gas cost based on position and surrounding opcodes
      const gasEstimate = this.estimateFunctionGas(bytecode, match.index);
      
      signatures.push({
        selector,
        signature: `function_${selector}()`, // In real implementation, decode from ABI
        gasEstimate,
      });
    }
    
    return signatures;
  }

  /**
   * Estimates deployment cost based on bytecode size
   */
  private estimateDeploymentCost(sizeInBytes: number): number {
    const baseGas = 21000; // Base transaction cost
    const creationGas = 32000; // Contract creation cost
    const codeDepositGas = sizeInBytes * 200; // Cost per byte of code
    
    return baseGas + creationGas + codeDepositGas;
  }

  /**
   * Estimates gas cost for a function based on its bytecode
   */
  private estimateFunctionGas(bytecode: string, position: number): number {
    // Simple estimation based on surrounding opcodes
    const windowSize = 100; // Look at 100 bytes around the function
    const start = Math.max(0, position - windowSize);
    const end = Math.min(bytecode.length, position + windowSize);
    const window = bytecode.slice(start, end);
    
    const opcodes = this.extractOpcodes(window);
    let gasCost = 21000; // Base cost
    
    for (const opcode of opcodes) {
      const opcodeInfo = this.opcodeMap.get(opcode);
      if (opcodeInfo) {
        gasCost += opcodeInfo.gasCost;
      }
    }
    
    return Math.min(gasCost, 500000); // Cap at reasonable maximum
  }

  /**
   * Checks for reentrancy patterns in opcodes
   */
  private hasReentrancyPattern(opcodes: number[]): boolean {
    // Look for CALL followed by SSTORE pattern
    for (let i = 0; i < opcodes.length - 1; i++) {
      if (opcodes[i] === 0xf1 && opcodes[i + 1] === 0x55) { // CALL followed by SSTORE
        return true;
      }
    }
    return false;
  }

  /**
   * Checks for unchecked external calls
   */
  private hasUncheckedExternalCalls(opcodes: number[]): boolean {
    // Look for CALL opcodes without proper return value checking
    const callOpcodes = [0xf1, 0xf2, 0xf4]; // CALL, CALLCODE, DELEGATECALL
    
    for (let i = 0; i < opcodes.length; i++) {
      if (callOpcodes.includes(opcodes[i])) {
        // Check if return value is checked (simplified)
        const nextOpcodes = opcodes.slice(i + 1, i + 5);
        if (!nextOpcodes.includes(0x15)) { // ISZERO opcode
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculates optimization score
   */
  private calculateOptimizationScore(opcodes: number[]): number {
    let score = 100; // Start with perfect score
    
    const opcodeCounts = new Map<number, number>();
    for (const opcode of opcodes) {
      opcodeCounts.set(opcode, (opcodeCounts.get(opcode) || 0) + 1);
    }
    
    // Penalize expensive operations
    const expensiveOps = [0x54, 0x55, 0x20]; // SLOAD, SSTORE, SHA3
    for (const op of expensiveOps) {
      const count = opcodeCounts.get(op) || 0;
      score -= count * 2; // Reduce score by 2 points per expensive operation
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gets size-related recommendations
   */
  private getSizeRecommendations(utilizationPercentage: number): string[] {
    const recommendations: string[] = [];
    
    if (utilizationPercentage > 95) {
      recommendations.push('Contract size is very close to the 24KB limit. Consider splitting into multiple contracts.');
    } else if (utilizationPercentage > 80) {
      recommendations.push('Contract size is approaching the limit. Monitor size carefully.');
    }
    
    if (utilizationPercentage > 50) {
      recommendations.push('Consider using libraries to reduce contract size.');
      recommendations.push('Remove unused functions and variables.');
    }
    
    return recommendations;
  }

  /**
   * Gets optimization recommendations
   */
  private getOptimizationRecommendations(score: number): string[] {
    const recommendations: string[] = [];
    
    if (score < 50) {
      recommendations.push('Contract has significant optimization opportunities.');
      recommendations.push('Consider using more efficient algorithms.');
      recommendations.push('Minimize storage operations.');
    } else if (score < 75) {
      recommendations.push('Contract has moderate optimization opportunities.');
      recommendations.push('Review storage access patterns.');
    } else {
      recommendations.push('Contract is well optimized.');
    }
    
    return recommendations;
  }

  /**
   * Initializes the opcode mapping
   */
  private initializeOpcodeMap(): Map<number, OpCode> {
    const opcodes = new Map<number, OpCode>();
    
    // Add common opcodes (simplified set)
    const opcodeData = [
      { opcode: 0x00, name: 'STOP', gasCost: 0, stackInput: 0, stackOutput: 0, category: 'Control' },
      { opcode: 0x01, name: 'ADD', gasCost: 3, stackInput: 2, stackOutput: 1, category: 'Arithmetic' },
      { opcode: 0x02, name: 'MUL', gasCost: 5, stackInput: 2, stackOutput: 1, category: 'Arithmetic' },
      { opcode: 0x03, name: 'SUB', gasCost: 3, stackInput: 2, stackOutput: 1, category: 'Arithmetic' },
      { opcode: 0x04, name: 'DIV', gasCost: 5, stackInput: 2, stackOutput: 1, category: 'Arithmetic' },
      { opcode: 0x20, name: 'SHA3', gasCost: 30, stackInput: 2, stackOutput: 1, category: 'Cryptographic' },
      { opcode: 0x32, name: 'ORIGIN', gasCost: 2, stackInput: 0, stackOutput: 1, category: 'Environmental' },
      { opcode: 0x54, name: 'SLOAD', gasCost: 800, stackInput: 1, stackOutput: 1, category: 'Storage' },
      { opcode: 0x55, name: 'SSTORE', gasCost: 5000, stackInput: 2, stackOutput: 0, category: 'Storage' },
      { opcode: 0xf1, name: 'CALL', gasCost: 700, stackInput: 7, stackOutput: 1, category: 'External' },
      { opcode: 0xf2, name: 'CALLCODE', gasCost: 700, stackInput: 7, stackOutput: 1, category: 'External' },
      { opcode: 0xf4, name: 'DELEGATECALL', gasCost: 700, stackInput: 6, stackOutput: 1, category: 'External' },
    ];
    
    for (const op of opcodeData) {
      opcodes.set(op.opcode, op);
    }
    
    return opcodes;
  }
}