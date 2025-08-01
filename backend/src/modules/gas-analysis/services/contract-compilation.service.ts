import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as solc from 'solc';
import * as fs from 'fs';
import * as path from 'path';

// Base service
import { BaseService } from '../../../common/base.service';

// DTOs
import {
  CompilationResultDto,
  OptimizationLevel,
} from '../../../common/dto/gas-analysis.dto';

// Utilities and constants
import { ValidationUtils, StringUtils } from '../../../common/utils';
import { ERROR_MESSAGES } from '../../../common/constants';

interface CompileContractRequest {
  contractName: string;
  sourceCode: string;
  solidityVersion: string;
  optimizationLevel: OptimizationLevel;
  optimizationRuns: number;
}

interface ValidateCodeRequest {
  sourceCode: string;
  solidityVersion: string;
}

@Injectable()
export class ContractCompilationService extends BaseService {
  private readonly compilerCache = new Map<string, any>();
  private readonly compilationCache = new Map<string, CompilationResultDto>();

  constructor(private readonly configService: ConfigService) {
    super();
  }

  /**
   * Compiles a Solidity contract with specified optimization settings
   */
  async compileContract(request: CompileContractRequest): Promise<CompilationResultDto> {
    try {
      const startTime = Date.now();
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache first
      if (this.compilationCache.has(cacheKey)) {
        this.logger.debug(`Using cached compilation for ${request.contractName}`);
        return this.compilationCache.get(cacheKey)!;
      }
      
      // Validate inputs
      this.validateCompilationRequest(request);
      
      // Get compiler
      const compiler = await this.getCompiler(request.solidityVersion);
      
      // Prepare compilation input
      const input = this.prepareCompilationInput(request);
      
      // Compile with import resolution
      const output = JSON.parse(compiler.compile(JSON.stringify(input), {
        import: this.resolveImport.bind(this)
      }));
      
      // Process compilation result
      const result = await this.processCompilationOutput(
        output,
        request.contractName,
        request.solidityVersion,
        Date.now() - startTime
      );
      
      // Cache successful compilations
      if (result.success) {
        this.compilationCache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      this.handleError(error, `Failed to compile contract '${request.contractName}'`);
    }
  }

  /**
   * Validates Solidity code without full compilation
   */
  async validateCode(request: ValidateCodeRequest): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // Basic syntax validation
      const basicValidation = ValidationUtils.validateSolidityCode(request.sourceCode);
      if (!basicValidation.isValid) {
        return {
          success: false,
          errors: basicValidation.errors,
          warnings: [],
        };
      }
      
      // Get compiler
      const compiler = await this.getCompiler(request.solidityVersion);
      
      // Prepare minimal compilation input for validation
      const input = {
        language: 'Solidity',
        sources: {
          'contract.sol': {
            content: request.sourceCode,
          },
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['metadata'],
            },
          },
        },
      };
      
      // Compile for validation
      const output = JSON.parse(compiler.compile(JSON.stringify(input)));
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (output.errors) {
        for (const error of output.errors) {
          if (error.severity === 'error') {
            errors.push(error.formattedMessage || error.message);
          } else if (error.severity === 'warning') {
            warnings.push(error.formattedMessage || error.message);
          }
        }
      }
      
      return {
        success: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.handleError(error, 'Failed to validate Solidity code');
    }
  }

  /**
   * Gets available Solidity compiler versions
   */
  async getAvailableVersions(): Promise<string[]> {
    try {
      // In a real implementation, this would fetch from solc-bin
      // For now, return commonly used versions
      return [
        '0.8.19',
        '0.8.18',
        '0.8.17',
        '0.8.16',
        '0.8.15',
        '0.8.14',
        '0.8.13',
        '0.8.12',
        '0.8.11',
        '0.8.10',
        '0.7.6',
        '0.6.12',
      ];
    } catch (error) {
      this.handleError(error, 'Failed to get available compiler versions');
    }
  }

  /**
   * Estimates compilation time based on code complexity
   */
  estimateCompilationTime(sourceCode: string): number {
    const lines = sourceCode.split('\n').length;
    const complexity = this.calculateCodeComplexity(sourceCode);
    
    // Base time + line factor + complexity factor (in milliseconds)
    return Math.max(1000, 500 + (lines * 10) + (complexity * 100));
  }

  /**
   * Clears compilation cache
   */
  clearCache(): void {
    this.compilationCache.clear();
    this.logger.log('Compilation cache cleared');
  }

  /**
   * Gets compiler instance for specified version
   */
  private async getCompiler(version: string): Promise<any> {
    if (this.compilerCache.has(version)) {
      return this.compilerCache.get(version);
    }
    
    try {
      // For development, use the default solc compiler
      // In production, you'd want to load specific versions
      const compiler = solc;
      
      this.compilerCache.set(version, compiler);
      this.logger.debug(`Loaded Solidity compiler version ${version}`);
      
      return compiler;
    } catch (error) {
      throw new BadRequestException(`Failed to load Solidity compiler version ${version}`);
    }
  }

  /**
   * Prepares compilation input object
   */
  private prepareCompilationInput(request: CompileContractRequest): any {
    const optimizationSettings = this.getOptimizationSettings(
      request.optimizationLevel,
      request.optimizationRuns
    );
    
    return {
      language: 'Solidity',
      sources: {
        [`${request.contractName}.sol`]: {
          content: request.sourceCode,
        },
      },
      settings: {
        optimizer: optimizationSettings,
        outputSelection: {
          '*': {
            '*': [
              'abi',
              'evm.bytecode',
              'evm.deployedBytecode',
              'evm.gasEstimates',
              'metadata',
            ],
          },
        },
        evmVersion: 'london', // Use London EVM version for better compatibility
        remappings: [
          '@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/'
        ]
      },
    };
  }

  /**
   * Gets optimization settings based on level
   */
  private getOptimizationSettings(level: OptimizationLevel, runs: number): any {
    switch (level) {
      case OptimizationLevel.NONE:
        return {
          enabled: false,
        };
      
      case OptimizationLevel.LOW:
        return {
          enabled: true,
          runs: Math.min(runs, 100),
        };
      
      case OptimizationLevel.MEDIUM:
        return {
          enabled: true,
          runs: Math.min(runs, 200),
        };
      
      case OptimizationLevel.HIGH:
        return {
          enabled: true,
          runs: Math.min(runs, 1000),
        };
      
      case OptimizationLevel.AGGRESSIVE:
        return {
          enabled: true,
          runs: Math.min(runs, 10000),
          details: {
            yul: true,
            yulDetails: {
              stackAllocation: true,
              optimizerSteps: 'dhfoDgvulfnTUtnIf',
            },
          },
        };
      
      default:
        return {
          enabled: true,
          runs: 200,
        };
    }
  }

  /**
   * Processes compilation output and creates result DTO
   */
  private async processCompilationOutput(
    output: any,
    contractName: string,
    compilerVersion: string,
    compilationTime: number
  ): Promise<CompilationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Process errors and warnings
    if (output.errors) {
      for (const error of output.errors) {
        if (error.severity === 'error') {
          errors.push(error.formattedMessage || error.message);
        } else if (error.severity === 'warning') {
          warnings.push(error.formattedMessage || error.message);
        }
      }
    }
    
    // Check if compilation was successful
    const success = errors.length === 0 && output.contracts;
    
    if (!success) {
      return {
        success: false,
        errors,
        warnings,
        compilerVersion,
        compilationTime,
        bytecode: '',
        abi: [],
        optimizationSettings: { enabled: false, runs: 0 },
      };
    }
    
    // Extract contract data
    const contractFile = Object.keys(output.contracts)[0];
    const contract = output.contracts[contractFile][contractName];
    
    if (!contract) {
      throw new BadRequestException(`Contract '${contractName}' not found in compilation output`);
    }
    
    // Extract bytecode and ABI
    const bytecode = contract.evm?.bytecode?.object || '';
    const abi = contract.abi || [];
    
    // Extract optimization settings from metadata
    let optimizationSettings = { enabled: false, runs: 0 };
    try {
      const metadata = JSON.parse(contract.metadata || '{}');
      if (metadata.settings?.optimizer) {
        optimizationSettings = {
          enabled: metadata.settings.optimizer.enabled || false,
          runs: metadata.settings.optimizer.runs || 0,
        };
      }
    } catch (error) {
      this.logger.warn('Failed to parse contract metadata for optimization settings');
    }
    
    // Calculate additional metrics
    const bytecodeSize = bytecode.length / 2; // Convert hex to bytes
    const gasEstimates = contract.evm?.gasEstimates || {};
    
    return {
      success: true,
      errors,
      warnings,
      compilerVersion,
      compilationTime,
      bytecode,
      abi,
      optimizationSettings,
      bytecodeSize,
      gasEstimates,
      metadata: {
        contractName,
        sourceCodeHash: StringUtils.generateRandomString(32), // In real implementation, use proper hash
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Validates compilation request
   */
  private validateCompilationRequest(request: CompileContractRequest): void {
    if (!ValidationUtils.validateContractName(request.contractName)) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.INVALID_CONTRACT_NAME);
    }
    
    const codeValidation = ValidationUtils.validateSolidityCode(request.sourceCode);
    if (!codeValidation.isValid) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.VALIDATION.INVALID_CODE,
        errors: codeValidation.errors,
      });
    }
    
    if (!ValidationUtils.validateSolidityVersion(request.solidityVersion)) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.INVALID_SOLIDITY_VERSION);
    }
    
    if (request.optimizationRuns < 0 || request.optimizationRuns > 10000) {
      throw new BadRequestException('Optimization runs must be between 0 and 10000');
    }
  }

  /**
   * Generates cache key for compilation
   */
  private generateCacheKey(request: CompileContractRequest): string {
    const hash = StringUtils.generateRandomString(16); // In real implementation, use proper hash
    return `${request.contractName}_${request.solidityVersion}_${request.optimizationLevel}_${request.optimizationRuns}_${hash}`;
  }

  /**
   * Calculates code complexity score
   */
  private calculateCodeComplexity(sourceCode: string): number {
    let complexity = 0;
    
    // Count various complexity indicators
    const lines = sourceCode.split('\n');
    const functions = (sourceCode.match(/function\s+\w+/g) || []).length;
    const conditionals = (sourceCode.match(/\b(if|while|for)\b/g) || []).length;
    const loops = (sourceCode.match(/\b(while|for)\b/g) || []).length;
    const modifiers = (sourceCode.match(/\bmodifier\s+\w+/g) || []).length;
    const events = (sourceCode.match(/\bevent\s+\w+/g) || []).length;
    
    complexity += lines.length * 0.1;
    complexity += functions * 2;
    complexity += conditionals * 1.5;
    complexity += loops * 2;
    complexity += modifiers * 1;
    complexity += events * 0.5;
    
    return Math.round(complexity);
  }

  /**
   * Resolves imports for Solidity compilation
   */
  private resolveImport(importPath: string): { contents: string } | { error: string } {
    try {
      let resolvedPath: string;
      
      // Handle OpenZeppelin imports
      if (importPath.startsWith('@openzeppelin/contracts/')) {
        resolvedPath = path.join(
          process.cwd(),
          'node_modules',
          importPath
        );
      } else {
        // Handle relative imports or other patterns
        resolvedPath = path.resolve(importPath);
      }
      
      // Read the file content
      const contents = fs.readFileSync(resolvedPath, 'utf8');
      return { contents };
    } catch (error) {
      this.logger.warn(`Failed to resolve import: ${importPath}`, error.message);
      return { error: `Import not found: ${importPath}` };
    }
  }
}