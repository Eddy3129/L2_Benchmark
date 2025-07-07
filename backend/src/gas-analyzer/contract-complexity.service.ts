import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractComplexityProfile } from './contract-complexity.entity';
import { ethers } from 'ethers';
import { NetworkConfigService } from '../shared/network-config';
import { BaseService } from '../shared/base.service';
import { ValidationUtils } from '../shared/validation-utils';
import * as solc from 'solc';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface ComplexityAnalysisConfig {
  contractName: string;
  solidityCode: string;
  functionName: string;
  functionParameters: any[];
  l2Network: string;
  enableDetailedTracing: boolean;
  enableOptimizationAnalysis: boolean;
}

interface TraceFrame {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory: string[];
  storage: { [key: string]: string };
  error?: string;
}

interface CallTraceNode {
  type: 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2' | 'INTERNAL';
  from: string;
  to: string;
  input: string;
  output: string;
  gas: number;
  gasUsed: number;
  value?: string;
  error?: string;
  calls?: CallTraceNode[];
  functionName?: string;
  opcodes?: OpcodeAnalysis[];
}

interface OpcodeAnalysis {
  opcode: string;
  pc: number;
  gas: number;
  gasCost: number;
  frequency: number;
  cumulativeGasCost: number;
  description: string;
  category: 'arithmetic' | 'comparison' | 'bitwise' | 'memory' | 'storage' | 'control' | 'system' | 'other';
}

interface GasBreakdown {
  totalGas: number;
  functionLevelBreakdown: {
    [functionName: string]: {
      gasUsed: number;
      percentage: number;
      callCount: number;
      averageGasPerCall: number;
    };
  };
  opcodeAnalysis: {
    [opcode: string]: {
      totalGas: number;
      frequency: number;
      averageGasPerExecution: number;
      percentage: number;
      category: string;
    };
  };
  costHotspots: {
    functionName: string;
    lineNumber?: number;
    gasUsed: number;
    percentage: number;
    optimization: string;
  }[];
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  codeSize: number;
  stackDepth: number;
  memoryUsage: number;
  storageSlots: number;
  externalCalls: number;
  loops: number;
  conditionals: number;
  gasEfficiencyScore: number;
}

@Injectable()
export class ContractComplexityService extends BaseService<ContractComplexityProfile> {

  constructor(
    @InjectRepository(ContractComplexityProfile)
    private complexityRepository: Repository<ContractComplexityProfile>,
  ) {
    super(complexityRepository, 'ContractComplexityProfile');
  }

  async analyzeContractComplexity(config: ComplexityAnalysisConfig): Promise<ContractComplexityProfile> {
    this.logger.log(`Starting complexity analysis for ${config.contractName}.${config.functionName}`);
    
    // Validate network configuration
    const networkConfig = NetworkConfigService.getNetworkConfig(config.l2Network);
    if (!networkConfig) {
      throw ValidationUtils.createValidationError([`Invalid network: ${config.l2Network}`]);
    }

    const sessionId = `complexity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Compile the contract
    const compilationResult = await this.compileContract(config.solidityCode, config.contractName);
    
    // Deploy and execute the contract with tracing
    const executionResult = await this.executeWithTracing(config, networkConfig, compilationResult);
    
    // Analyze the execution trace
    const gasBreakdown = await this.analyzeGasBreakdown(executionResult.trace, config.solidityCode);
    
    // Calculate complexity metrics
    const complexityMetrics = await this.calculateComplexityMetrics(config.solidityCode, executionResult.trace);
    
    // Generate optimization recommendations
    const optimizationRecommendations = await this.generateOptimizationRecommendations(
      gasBreakdown,
      complexityMetrics,
      config.solidityCode
    );
    
    // Get network-specific pricing
    const networkAnalysis = await this.performNetworkSpecificAnalysis(config.l2Network, executionResult);
    
    // Transform gasBreakdown to match entity structure
    const transformedGasBreakdown = {
      functionLevelBreakdown: Object.entries(gasBreakdown.functionLevelBreakdown).map(([functionName, data]) => ({
        functionName,
        gasUsed: data.gasUsed,
        percentage: data.percentage,
        internalCalls: [] // Will be populated if available
      })),
      opcodeAnalysis: {
        computationOpcodes: { gasUsed: 0, percentage: 0 },
        storageOpcodes: { gasUsed: 0, percentage: 0 },
        memoryOpcodes: { gasUsed: 0, percentage: 0 },
        logOpcodes: { gasUsed: 0, percentage: 0 },
        externalCallOpcodes: { gasUsed: 0, percentage: 0 }
      },
      costHotspots: gasBreakdown.costHotspots.map(hotspot => ({
        lineNumber: hotspot.lineNumber || 0,
        sourceCode: '',
        gasUsed: hotspot.gasUsed,
        percentage: hotspot.percentage,
        optimizationSuggestion: hotspot.optimization
      }))
    };

    // Create the complexity profile record
    const complexityProfileData = {
      sessionId,
      contractName: config.contractName,
      functionName: config.functionName,
      l2Network: config.l2Network,
      transactionHash: executionResult.transactionHash,
      solidityCode: config.solidityCode,
      compilationArtifacts: {
        bytecode: compilationResult.bytecode,
        abi: compilationResult.abi,
        metadata: compilationResult.metadata,
        sourceMap: compilationResult.sourceMap,
        ast: {},
        opcodes: ''
      },
      executionTrace: {
        totalGasUsed: executionResult.gasUsed,
        gasUsedByOpcode: [],
        callTrace: this.transformCallTrace(executionResult.callTrace || []),
        storageAccess: this.extractStorageAccesses(executionResult.trace),
      },
      gasBreakdown: transformedGasBreakdown,
      complexityMetrics,
      optimizationRecommendations,
      networkSpecificAnalysis: networkAnalysis,
      totalExecutionCostETH: networkAnalysis.totalCostETH,
      totalExecutionCostUSD: networkAnalysis.totalCostUSD,
    };

    const complexityProfile = this.complexityRepository.create(complexityProfileData);
    const savedProfile = await this.complexityRepository.save(complexityProfile);
    return savedProfile;
  }

  private async compileContract(solidityCode: string, contractName: string): Promise<any> {
    this.logger.log('Compiling contract for complexity analysis');
    
    try {
      // Create a temporary file for the Solidity code
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const contractPath = path.join(tempDir, `${contractName}.sol`);
      fs.writeFileSync(contractPath, solidityCode);
      
      // Prepare the input for solc
      const input = {
        language: 'Solidity',
        sources: {
          [`${contractName}.sol`]: {
            content: solidityCode,
          },
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.sourceMap', 'metadata'],
            },
          },
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      };
      
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      
      if (output.errors) {
        const errors = output.errors.filter(error => error.severity === 'error');
        if (errors.length > 0) {
          throw new Error(`Compilation errors: ${errors.map(e => e.message).join(', ')}`);
        }
      }
      
      const contract = output.contracts[`${contractName}.sol`][contractName];
      
      // Clean up temporary file
      fs.unlinkSync(contractPath);
      
      return {
        bytecode: contract.evm.bytecode.object,
        abi: contract.abi,
        metadata: contract.metadata,
        sourceMap: contract.evm.sourceMap,
      };
    } catch (error) {
      this.logger.error(`Contract compilation failed: ${error.message}`);
      throw error;
    }
  }

  private async executeWithTracing(
    config: ComplexityAnalysisConfig,
    networkConfig: any,
    compilationResult: any
  ): Promise<any> {
    this.logger.log('Executing contract with detailed tracing');
    
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = ethers.Wallet.createRandom().connect(provider);
    
    try {
      // Deploy the contract
      const contractFactory = new ethers.ContractFactory(
        compilationResult.abi,
        compilationResult.bytecode,
        wallet
      );
      
      const contract = await contractFactory.deploy();
      await contract.waitForDeployment();
      
      // Execute the function with parameters
      const tx = await contract[config.functionName](...config.functionParameters);
      const receipt = await tx.wait();
      
      // Get detailed trace using debug_traceTransaction
      let trace: any[] = [];
      let callTrace: any = null;
      
      if (config.enableDetailedTracing) {
        try {
          // Try to get detailed trace (this requires a node that supports debug_traceTransaction)
          trace = await provider.send('debug_traceTransaction', [
            tx.hash,
            {
              tracer: 'callTracer',
              tracerConfig: {
                withLog: true,
              },
            },
          ]);
          
          // Also get opcode-level trace
          const opcodeTrace = await provider.send('debug_traceTransaction', [
            tx.hash,
            {
              disableMemory: false,
              disableStack: false,
              disableStorage: false,
            },
          ]);
          
          callTrace = this.parseCallTrace(trace);
          trace = opcodeTrace.structLogs || [];
        } catch (error) {
          this.logger.warn(`Detailed tracing not available: ${error.message}`);
          // Fallback to basic execution without detailed tracing
          trace = [];
          callTrace = this.createBasicCallTrace(receipt);
        }
      } else {
        callTrace = this.createBasicCallTrace(receipt);
      }
      
      return {
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        trace,
        callTrace,
        contractAddress: await contract.getAddress(),
      };
    } catch (error) {
      this.logger.error(`Contract execution failed: ${error.message}`);
      throw error;
    }
  }

  private parseCallTrace(trace: any): CallTraceNode {
    // Parse the call trace from debug_traceTransaction
    if (!trace || !trace.calls) {
      return {
        type: 'CALL',
        from: '',
        to: '',
        input: '',
        output: '',
        gas: 0,
        gasUsed: 0,
        calls: [],
      };
    }
    
    return this.convertTraceToCallNode(trace);
  }

  private convertTraceToCallNode(trace: any): CallTraceNode {
    return {
      type: trace.type || 'CALL',
      from: trace.from || '',
      to: trace.to || '',
      input: trace.input || '',
      output: trace.output || '',
      gas: parseInt(trace.gas || '0', 16),
      gasUsed: parseInt(trace.gasUsed || '0', 16),
      value: trace.value,
      error: trace.error,
      calls: (trace.calls || []).map(call => this.convertTraceToCallNode(call)),
    };
  }

  private createBasicCallTrace(receipt: any): CallTraceNode {
    return {
      type: 'CALL',
      from: receipt.from,
      to: receipt.to,
      input: '',
      output: '',
      gas: parseInt(receipt.gasUsed.toString()),
      gasUsed: parseInt(receipt.gasUsed.toString()),
      calls: [],
    };
  }

  private async analyzeGasBreakdown(trace: TraceFrame[], solidityCode: string): Promise<GasBreakdown> {
    this.logger.log('Analyzing gas breakdown from execution trace');
    
    const opcodeAnalysis: { [opcode: string]: any } = {};
    const functionBreakdown: { [functionName: string]: any } = {};
    let totalGas = 0;
    
    // Analyze opcode usage
    for (const frame of trace) {
      const opcode = frame.op;
      const gasCost = frame.gasCost || 0;
      
      totalGas += gasCost;
      
      if (!opcodeAnalysis[opcode]) {
        opcodeAnalysis[opcode] = {
          totalGas: 0,
          frequency: 0,
          category: this.categorizeOpcode(opcode),
        };
      }
      
      opcodeAnalysis[opcode].totalGas += gasCost;
      opcodeAnalysis[opcode].frequency += 1;
    }
    
    // Calculate percentages and averages
    Object.keys(opcodeAnalysis).forEach(opcode => {
      const analysis = opcodeAnalysis[opcode];
      analysis.percentage = totalGas > 0 ? (analysis.totalGas / totalGas) * 100 : 0;
      analysis.averageGasPerExecution = analysis.frequency > 0 ? analysis.totalGas / analysis.frequency : 0;
    });
    
    // Identify cost hotspots
    const costHotspots = this.identifyCostHotspots(opcodeAnalysis, solidityCode);
    
    return {
      totalGas,
      functionLevelBreakdown: functionBreakdown,
      opcodeAnalysis,
      costHotspots,
    };
  }

  private categorizeOpcode(opcode: string): string {
    const categories = {
      arithmetic: ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'ADDMOD', 'MULMOD', 'EXP', 'SIGNEXTEND'],
      comparison: ['LT', 'GT', 'SLT', 'SGT', 'EQ', 'ISZERO'],
      bitwise: ['AND', 'OR', 'XOR', 'NOT', 'BYTE', 'SHL', 'SHR', 'SAR'],
      memory: ['MLOAD', 'MSTORE', 'MSTORE8', 'MSIZE'],
      storage: ['SLOAD', 'SSTORE'],
      control: ['JUMP', 'JUMPI', 'PC', 'JUMPDEST', 'STOP', 'RETURN', 'REVERT'],
      system: ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'],
    };
    
    for (const [category, opcodes] of Object.entries(categories)) {
      if (opcodes.includes(opcode)) {
        return category;
      }
    }
    
    return 'other';
  }

  private identifyCostHotspots(opcodeAnalysis: any, solidityCode: string): any[] {
    // Identify the most expensive operations and suggest optimizations
    const hotspots: any[] = [];
    
    // Sort opcodes by total gas consumption
    const sortedOpcodes = Object.entries(opcodeAnalysis)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.totalGas - a.totalGas)
      .slice(0, 10); // Top 10 most expensive
    
    for (const [opcode, analysis] of sortedOpcodes) {
      let optimization = '';
      
      switch (opcode) {
        case 'SSTORE':
          optimization = 'Consider using packed structs or mappings to reduce storage writes';
          break;
        case 'SLOAD':
          optimization = 'Cache storage reads in memory variables';
          break;
        case 'CALL':
          optimization = 'Minimize external calls or batch them when possible';
          break;
        case 'MSTORE':
          optimization = 'Optimize memory usage patterns';
          break;
        default:
          optimization = `Optimize ${opcode} usage`;
      }
      
      hotspots.push({
        functionName: 'Unknown', // Would need source map analysis for precise function mapping
        gasUsed: (analysis as any).totalGas,
        percentage: (analysis as any).percentage,
        optimization,
      });
    }
    
    return hotspots;
  }

  private async calculateComplexityMetrics(solidityCode: string, trace: TraceFrame[]): Promise<ComplexityMetrics> {
    this.logger.log('Calculating complexity metrics');
    
    // Analyze the Solidity code for complexity metrics
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(solidityCode);
    const codeSize = solidityCode.length;
    
    // Analyze trace for runtime metrics
    let maxStackDepth = 0;
    let memoryUsage = 0;
    let storageAccesses = 0;
    let externalCalls = 0;
    
    for (const frame of trace) {
      maxStackDepth = Math.max(maxStackDepth, frame.depth || 0);
      
      if (frame.op === 'SLOAD' || frame.op === 'SSTORE') {
        storageAccesses++;
      }
      
      if (['CALL', 'DELEGATECALL', 'STATICCALL'].includes(frame.op)) {
        externalCalls++;
      }
      
      if (frame.memory && frame.memory.length > 0) {
        memoryUsage = Math.max(memoryUsage, frame.memory.length);
      }
    }
    
    // Calculate gas efficiency score (0-100)
    const gasEfficiencyScore = Math.max(0, Math.min(100, 100 - (storageAccesses * 2) - (externalCalls * 5)));
    
    // Count unique storage slots accessed
    const storageSlots = new Set(
      trace
        .filter(frame => frame.op === 'SLOAD' || frame.op === 'SSTORE')
        .map(frame => frame.stack?.[frame.stack.length - 1] || '0x0')
    ).size;

    return {
      cyclomaticComplexity,
      codeSize,
      stackDepth: maxStackDepth,
      memoryUsage,
      storageSlots,
      externalCalls,
      loops: this.countLoops(solidityCode),
      conditionals: this.countConditionals(solidityCode),
      gasEfficiencyScore,
    };
  }

  private calculateCyclomaticComplexity(code: string): number {
    // Simplified cyclomatic complexity calculation
    const decisionPoints = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\?.*:/g, // Ternary operator
      /\&\&/g,
      /\|\|/g,
    ];
    
    let complexity = 1; // Base complexity
    
    for (const pattern of decisionPoints) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private countLoops(code: string): number {
    const loopPatterns = [/\bfor\s*\(/g, /\bwhile\s*\(/g, /\bdo\s*\{/g];
    let count = 0;
    
    for (const pattern of loopPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  private countConditionals(code: string): number {
    const conditionalPatterns = [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\?.*:/g];
    let count = 0;
    
    for (const pattern of conditionalPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  private async generateOptimizationRecommendations(
    gasBreakdown: GasBreakdown,
    complexityMetrics: ComplexityMetrics,
    solidityCode: string
  ): Promise<any[]> {
    const recommendations: any[] = [];
    
    // Storage optimization recommendations
    if (complexityMetrics.storageSlots > 10) {
      recommendations.push({
        category: 'storage',
        severity: 'medium',
        description: 'High storage access count detected. Consider caching storage reads in memory variables.',
        currentGasCost: complexityMetrics.storageSlots * 200, // Estimated
        estimatedSavings: complexityMetrics.storageSlots * 50,
        codeLocation: { lineNumber: 1, functionName: 'unknown' },
        suggestedFix: 'Cache storage reads in memory variables'
      });
    }
    
    // External call optimization
    if (complexityMetrics.externalCalls > 5) {
      recommendations.push({
        category: 'external_calls',
        severity: 'high',
        description: 'Multiple external calls detected. Consider batching calls or using multicall patterns.',
        currentGasCost: complexityMetrics.externalCalls * 2100,
        estimatedSavings: complexityMetrics.externalCalls * 500,
        codeLocation: { lineNumber: 1, functionName: 'unknown' },
        suggestedFix: 'Use multicall patterns or batch operations'
      });
    }
    
    // Complexity recommendations
    if (complexityMetrics.cyclomaticComplexity > 10) {
      recommendations.push({
        category: 'computation',
        severity: 'low',
        description: 'High cyclomatic complexity. Consider breaking down the function into smaller functions.',
        currentGasCost: 0,
        estimatedSavings: 0,
        codeLocation: { lineNumber: 1, functionName: 'unknown' },
        suggestedFix: 'Break down into smaller functions'
      });
    }
    
    return recommendations;
  }

  private async performNetworkSpecificAnalysis(network: string, executionResult: any): Promise<any> {
    // Get network-specific gas pricing and calculate costs
    const networkConfig = NetworkConfigService.getNetworkConfig(network);
    
    // Simplified pricing calculation - in production, get real-time gas prices
    const gasPrice = ethers.parseUnits('20', 'gwei'); // 20 gwei
    const gasUsed = BigInt(executionResult.gasUsed);
    const totalCostWei = gasUsed * gasPrice;
    const totalCostETH = parseFloat(ethers.formatEther(totalCostWei));
    
    // Get ETH price for USD conversion (simplified)
    const ethPriceUSD = 2000; // Placeholder
    const totalCostUSD = totalCostETH * ethPriceUSD;
    
    return {
      network,
      gasPrice: gasPrice.toString(),
      gasUsed: executionResult.gasUsed,
      totalCostWei: totalCostWei.toString(),
      totalCostETH,
      totalCostUSD,
      networkSpecificOptimizations: this.getNetworkSpecificOptimizations(network),
    };
  }

  private getNetworkSpecificOptimizations(network: string): string[] {
    const optimizations = {
      'arbitrum-sepolia': [
        'Arbitrum has lower storage costs - consider more storage-heavy operations',
        'Batch multiple transactions to reduce L1 settlement costs',
      ],
      'optimism-sepolia': [
        'Optimism charges for L1 data availability - minimize calldata size',
        'Use events sparingly as they contribute to L1 costs',
      ],
      'polygon-amoy': [
        'Polygon has very low gas costs - complex operations are more feasible',
        'Consider using more sophisticated algorithms due to low execution costs',
      ],
      'zksync-era-sepolia': [
        'zkSync Era has different gas model - storage is more expensive',
        'Optimize for fewer storage operations and more computation',
      ],
    };
    
    return optimizations[network] || ['No specific optimizations available for this network'];
  }

  private transformCallTrace(callTrace: any[]): any[] {
    return callTrace.map(trace => ({
      type: trace.type || 'CALL',
      from: trace.from || '',
      to: trace.to || '',
      input: trace.input || '',
      output: trace.output || '',
      gasUsed: trace.gasUsed || 0,
      gasLimit: trace.gas || 0,
      depth: trace.depth || 0,
      error: trace.error
    }));
  }

  private extractStorageAccesses(trace: TraceFrame[]): any[] {
    const storageAccesses: any[] = [];
    
    for (const frame of trace) {
      if (frame.op === 'SLOAD') {
        storageAccesses.push({
          slot: frame.stack?.[frame.stack.length - 1] || '0x0',
          operation: 'SLOAD',
          gasUsed: frame.gasCost || 0
        });
      } else if (frame.op === 'SSTORE') {
        storageAccesses.push({
          slot: frame.stack?.[frame.stack.length - 1] || '0x0',
          operation: 'SSTORE',
          gasUsed: frame.gasCost || 0,
          oldValue: frame.stack?.[frame.stack.length - 2] || '0x0',
          newValue: frame.stack?.[frame.stack.length - 1] || '0x0'
        });
      }
    }
    
    return storageAccesses;
  }

  async getComplexityProfileHistory(limit: number = 50): Promise<ContractComplexityProfile[]> {
    return this.complexityRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getComplexityProfileByNetwork(network: string): Promise<ContractComplexityProfile[]> {
    return this.complexityRepository.find({
      where: { l2Network: network },
      order: { createdAt: 'DESC' },
    });
  }

  async getComplexityProfileByContract(contractName: string): Promise<ContractComplexityProfile[]> {
    return this.complexityRepository.find({
      where: { contractName },
      order: { createdAt: 'DESC' },
    });
  }

  async getComplexityAnalysisResult(sessionId: string): Promise<ContractComplexityProfile> {
    const result = await this.complexityRepository.findOne({
      where: { sessionId },
    });
    
    if (!result) {
      throw new Error(`Complexity analysis result not found for session ${sessionId}`);
    }
    
    return result;
  }

  async compareComplexityAcrossNetworks(contractName: string, functionName: string): Promise<any> {
    const profiles = await this.complexityRepository.find({
      where: { contractName, functionName },
      order: { createdAt: 'DESC' },
    });
    
    const networkComparison = {};
    
    for (const profile of profiles) {
      const network = profile.l2Network;
      if (!networkComparison[network]) {
        networkComparison[network] = {
          averageGasUsed: 0,
          averageCostUSD: 0,
          averageComplexity: 0,
          count: 0,
        };
      }
      
      const data = networkComparison[network];
      data.averageGasUsed += parseInt(profile.executionTrace.totalGasUsed);
      data.averageCostUSD += profile.totalExecutionCostUSD;
      data.averageComplexity += profile.complexityMetrics.cyclomaticComplexity;
      data.count += 1;
    }
    
    // Calculate averages
    Object.keys(networkComparison).forEach(network => {
      const data = networkComparison[network];
      if (data.count > 0) {
        data.averageGasUsed = Math.round(data.averageGasUsed / data.count);
        data.averageCostUSD = data.averageCostUSD / data.count;
        data.averageComplexity = data.averageComplexity / data.count;
      }
    });
    
    return networkComparison;
  }
}